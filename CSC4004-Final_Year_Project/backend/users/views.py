from rest_framework import generics, permissions, viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import EmailMultiAlternatives
from django.http import FileResponse
from django.core.management import call_command
from django.db import IntegrityError, connection, models, transaction
from django.db.models.deletion import Collector
from django.core.validators import validate_email
from django.db.models import ProtectedError, Q
from django.utils.encoding import force_bytes, force_str
from django.utils import timezone
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from .models import (User, UserGroupCategory, Notification, RecipientGroup, Announcement,
                     AnnouncementDelivery, AnnouncementCategory, AnnouncementAttachment,
                     SystemMaintenanceState, MaintenanceAuditLog)
from .permissions import IsAdmin, has_activity_privilege
from .serializers import (
    UserSerializer,
    UserDirectorySerializer,
    RegisterSerializer,
    AdminCreateUserSerializer,
    UserGroupCategorySerializer,
    AnnouncementCategorySerializer,
    AnnouncementAttachmentSerializer,
    NotificationSerializer,
    RecipientGroupSerializer,
    AnnouncementSerializer,
)

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework_simplejwt.tokens import RefreshToken

import hashlib
import json
import re
import uuid
from pathlib import Path
from io import StringIO
from decimal import Decimal


def _notify_announcement_recipients(announcement):
    from .notifications import notify_users

    notify_users(
        recipients=_announcement_recipients(announcement),
        title=f'New announcement: {announcement.title}'[:200],
        message=f'{announcement.created_by.username} published an announcement for you.',
        notification_type='GENERAL',
        link='/announcements',
        send_email=False,
    )


def _matches_file_signature(suffix, data):
    if suffix in {'.jpg', '.jpeg'}:
        return data.startswith(b'\xff\xd8\xff')
    if suffix == '.png':
        return data.startswith(b'\x89PNG\r\n\x1a\n')
    if suffix == '.gif':
        return data.startswith((b'GIF87a', b'GIF89a'))
    if suffix == '.webp':
        return data.startswith(b'RIFF') and data[8:12] == b'WEBP'
    if suffix == '.pdf':
        return data.startswith(b'%PDF-')
    if suffix in {'.doc', '.xls', '.ppt'}:
        return data.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1')
    if suffix in {'.docx', '.xlsx', '.pptx'}:
        return data.startswith(b'PK\x03\x04')
    if suffix == '.csv':
        return b'\x00' not in data
    if suffix == '.mp3':
        return data.startswith(b'ID3') or (len(data) > 1 and data[0] == 0xff and data[1] & 0xe0 == 0xe0)
    if suffix == '.mp4':
        return len(data) >= 8 and data[4:8] == b'ftyp'
    return False


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get(self.username_field)
        user = None

        if username_or_email:
            user = User.objects.filter(username=username_or_email).first()
            if not user and '@' in username_or_email:
                user = User.objects.filter(email=username_or_email).first()

            if user:
                attrs[self.username_field] = user.username
                if not user.is_active:
                    raise AuthenticationFailed("login failed, account blocked")

        try:
            data = super().validate(attrs)
            return data
        except Exception as exc:
            if user and not user.is_active:
                raise AuthenticationFailed("login failed, account blocked")
            raise exc


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


def _announcement_recipients(announcement):
    recipients = User.objects.filter(is_active=True)
    selected = User.objects.none()
    if announcement.include_all_staff:
        selected = recipients
    selected = selected | announcement.audience_users.filter(is_active=True)
    group_ids = announcement.audience_groups.filter(is_active=True).values_list('id', flat=True)
    category_ids = announcement.audience_categories.values_list('id', flat=True)
    selected = selected | recipients.filter(recipient_groups__id__in=group_ids)
    selected = selected | recipients.filter(user_category_id__in=category_ids)
    return selected.distinct()


def _deliver_announcement(announcement, retry_failed=False):
    from django.utils import timezone
    from django.conf import settings as django_settings
    from django.utils.html import strip_tags
    base_url = getattr(django_settings, 'FRONTEND_URL', 'http://127.0.0.1:5173').rstrip('/')
    link = f'{base_url}/announcements'
    module_links = {
        'budgets': ('Budgets', '/finance?section=budgets'),
        'ledger': ('Ledger', '/finance?section=ledger'),
        'expenses': ('Expenses', '/finance?section=expenses'),
        'reports': ('Financial reports', '/finance?section=reports'),
        'assets': ('Assets', '/resources'),
        'activities': ('Activities and events', '/activities'),
        'other': ('Other information', None),
    }
    for recipient in _announcement_recipients(announcement):
        if not recipient.email:
            continue
        delivery, _ = AnnouncementDelivery.objects.get_or_create(
            announcement=announcement, recipient=recipient,
            defaults={'email': recipient.email, 'status': 'PENDING'},
        )
        if delivery.status == 'SENT' or (delivery.status == 'FAILED' and not retry_failed):
            continue
        delivery.email = recipient.email
        delivery.attempts += 1
        try:
            shared_lines = [
                f'{module_links[key][0]}: {base_url}{module_links[key][1]}'
                if module_links[key][1] else module_links[key][0]
                for key in announcement.shared_modules
                if key in module_links
            ]
            shared_text = ('\n\nRelated DMS information:\n' + '\n'.join(shared_lines)) if shared_lines else ''
            message = EmailMultiAlternatives(
                subject=f'[DMS] {announcement.title}',
                body=(f'{announcement.title}\n\n{strip_tags(announcement.message)}{shared_text}\n\n'
                      f'Published by {announcement.created_by.username}.\nOpen DMS: {link}'),
                from_email=getattr(django_settings, 'DEFAULT_FROM_EMAIL', None),
                to=[recipient.email],
            )
            for attachment in announcement.attachments.all():
                with attachment.file.open('rb') as attachment_file:
                    message.attach(attachment.original_filename, attachment_file.read(), attachment.content_type)
            sent = message.send(fail_silently=False)
            if not sent:
                raise RuntimeError('Mail backend did not accept the message.')
            delivery.status = 'SENT'
            delivery.sent_at = timezone.now()
            delivery.last_error = ''
        except Exception as exc:
            delivery.status = 'FAILED'
            delivery.last_error = f'{type(exc).__name__}: {exc}'[:300]
        delivery.save(update_fields=['email', 'attempts', 'status', 'sent_at', 'last_error'])


class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        qs = Announcement.objects.select_related('created_by').prefetch_related('audience_users', 'audience_groups', 'audience_categories')
        if user.is_superuser or user.has_announcement_manage_all:
            return qs
        active_announcement = Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        intended_recipient = (
            Q(audience_users=user)
            | Q(include_all_staff=True)
            | Q(audience_groups__members=user)
            | Q(audience_categories__users=user)
        )
        # The legacy view flag does not widen access to published content;
        # recipients see items only when the saved audience includes them.
        return (qs.filter(created_by=user) | qs.filter(
            status='PUBLISHED',
        ).filter(active_announcement).filter(intended_recipient)).distinct()

    def perform_create(self, serializer):
        if not (self.request.user.is_superuser or self.request.user.has_announcement_create):
            raise PermissionDenied('Announcement creation privilege required.')
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='attachments')
    def upload_attachments(self, request, pk=None):
        announcement = self.get_object()
        user = request.user
        can_edit = user.is_superuser or user.has_announcement_manage_all or (
            announcement.created_by_id == user.id and user.has_announcement_create
        )
        if not can_edit or announcement.status != 'DRAFT':
            raise PermissionDenied('Attachments can only be added to your own announcement drafts.')

        uploads = request.FILES.getlist('files')
        if not uploads:
            return Response({'detail': 'Choose at least one attachment.'}, status=status.HTTP_400_BAD_REQUEST)
        if announcement.attachments.count() + len(uploads) > 5:
            return Response({'detail': 'An announcement can have at most five attachments.'}, status=status.HTTP_400_BAD_REQUEST)

        allowed = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.csv': 'text/csv',
            '.mp3': 'audio/mpeg',
            '.mp4': 'video/mp4',
        }
        validated = []
        for uploaded in uploads:
            filename = Path(uploaded.name.replace('\\', '/')).name[:255]
            suffix = Path(filename).suffix.lower()
            file_type = allowed.get(suffix)
            if not file_type:
                return Response({'detail': f'{filename}: supported files are PDF, images, Word, PowerPoint, Excel, CSV, MP3, and MP4.'}, status=status.HTTP_400_BAD_REQUEST)
            if uploaded.size > 50 * 1024 * 1024:
                return Response({'detail': f'{filename}: each attachment must be 50 MB or smaller.'}, status=status.HTTP_400_BAD_REQUEST)
            signature = uploaded.read(16)
            uploaded.seek(0)
            if not _matches_file_signature(suffix, signature):
                return Response({'detail': f'{filename}: the file content does not match its extension.'}, status=status.HTTP_400_BAD_REQUEST)
            validated.append((uploaded, filename, file_type))

        attachments = [AnnouncementAttachment.objects.create(
            announcement=announcement,
            file=uploaded,
            original_filename=filename,
            content_type=content_type,
            size=uploaded.size,
            uploaded_by=user,
        ) for uploaded, filename, content_type in validated]
        return Response(AnnouncementAttachmentSerializer(attachments, many=True).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path=r'attachments/(?P<attachment_id>[^/.]+)/download', url_name='download-attachment')
    def download_attachment(self, request, pk=None, attachment_id=None):
        announcement = self.get_object()
        try:
            attachment = announcement.attachments.get(pk=attachment_id)
        except AnnouncementAttachment.DoesNotExist:
            return Response({'detail': 'Attachment not found.'}, status=status.HTTP_404_NOT_FOUND)
        return FileResponse(
            attachment.file.open('rb'), as_attachment=True,
            filename=attachment.original_filename, content_type=attachment.content_type,
        )

    @action(detail=True, methods=['delete'], url_path=r'attachments/(?P<attachment_id>[^/.]+)', url_name='delete-attachment')
    def delete_attachment(self, request, pk=None, attachment_id=None):
        announcement = self.get_object()
        user = request.user
        can_edit = user.is_superuser or user.has_announcement_manage_all or (
            announcement.created_by_id == user.id and user.has_announcement_create
        )
        if not can_edit or announcement.status != 'DRAFT':
            raise PermissionDenied('Attachments can only be removed from your own announcement drafts.')
        try:
            attachment = announcement.attachments.get(pk=attachment_id)
        except AnnouncementAttachment.DoesNotExist:
            return Response({'detail': 'Attachment not found.'}, status=status.HTTP_404_NOT_FOUND)
        attachment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_update(self, serializer):
        instance = self.get_object()
        allowed = self.request.user.is_superuser or self.request.user.has_announcement_manage_all or (
            instance.created_by_id == self.request.user.id and self.request.user.has_announcement_create
        )
        if not allowed:
            raise PermissionDenied('You can only edit your own announcement drafts.')
        if instance.status != 'DRAFT':
            raise PermissionDenied('Only draft announcements can be edited.')
        serializer.save()

    def perform_destroy(self, instance):
        if not (self.request.user.is_superuser or self.request.user.has_announcement_manage_all) and instance.created_by_id != self.request.user.id:
            raise PermissionDenied()
        if instance.status == 'PUBLISHED':
            raise PermissionDenied('Archive a published announcement instead of deleting it.')
        instance.delete()

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        announcement = self.get_object()
        if not (request.user.is_superuser or request.user.has_announcement_publish):
            raise PermissionDenied('Announcement publishing privilege required.')
        if not (announcement.include_all_staff or announcement.audience_users.exists() or announcement.audience_groups.exists() or announcement.audience_categories.exists()):
            return Response({'detail': 'Select at least one target audience.'}, status=400)
        from django.utils import timezone
        with transaction.atomic():
            announcement = Announcement.objects.select_for_update().get(pk=announcement.pk)
            if announcement.status != 'DRAFT':
                return Response({'detail': 'Only draft announcements can be published.'}, status=400)
            announcement.status = 'PUBLISHED'
            announcement.publish_at = timezone.now()
            announcement.save(update_fields=['status', 'publish_at', 'updated_at'])
            transaction.on_commit(lambda aid=announcement.pk: _notify_announcement_recipients(Announcement.objects.get(pk=aid)))
            transaction.on_commit(lambda aid=announcement.pk: _deliver_announcement(Announcement.objects.get(pk=aid)))
        return Response(self.get_serializer(announcement).data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        announcement = self.get_object()
        if not (request.user.is_superuser or request.user.has_announcement_manage_all or request.user.has_announcement_archive):
            raise PermissionDenied('Announcement archive privilege required.')
        announcement.status = 'ARCHIVED'
        announcement.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(announcement).data)

    @action(detail=True, methods=['post'], url_path='retry-delivery')
    def retry_delivery(self, request, pk=None):
        announcement = self.get_object()
        if not (request.user.is_superuser or request.user.has_announcement_manage_all):
            raise PermissionDenied('Announcement delivery management privilege required.')
        _deliver_announcement(announcement, retry_failed=True)
        return Response(self.get_serializer(announcement).data)


class AnnouncementCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return AnnouncementCategory.objects.filter(is_active=True)

    def perform_create(self, serializer):
        if not (self.request.user.is_superuser or self.request.user.has_announcement_create):
            raise PermissionDenied('Announcement creation privilege required to add a category.')
        serializer.save(created_by=self.request.user)


def _maintenance_scopes():
    from activities.models import Activity, ActivityType
    from finance.models import (
        Approval, Budget, BudgetTransaction, DepartmentalIncome,
        DepartmentalIncomeAllocation, Expense, FinanceNotification,
        FinancialSummaryRequest,
    )
    from resources.models import (
        Allocation, Resource, ResourceCategory, ResourceInspection,
        ResourceLocationHistory, ResourceReportRequest, ResourceStatusHistory,
    )

    activities = [Activity, ActivityType, Allocation]
    resources = [
        Resource, ResourceCategory, Allocation, ResourceInspection,
        ResourceLocationHistory, ResourceReportRequest, ResourceStatusHistory,
    ]
    finance = [
        Approval, DepartmentalIncomeAllocation, BudgetTransaction,
        FinancialSummaryRequest, FinanceNotification, Expense,
        DepartmentalIncome, Budget,
    ]
    announcements = [AnnouncementAttachment, Announcement]
    notifications = [Notification]
    return {
        'activities': activities,
        'resources': resources,
        'finance': finance,
        'announcements': announcements,
        'notifications': notifications,
        # Preserve users, roles, categories, permissions, audit logs, migrations,
        # maintenance state and recipient-group configuration on a business reset.
        'all_application_data': list(dict.fromkeys(
            activities + resources + finance + announcements + notifications
        )),
    }


def _maintenance_confirmation(scope):
    phrases = {
        'activities': 'CLEAR ACTIVITY DATA',
        'resources': 'CLEAR RESOURCE DATA',
        'finance': 'CLEAR FINANCE DATA',
        'announcements': 'CLEAR ANNOUNCEMENT DATA',
        'notifications': 'CLEAR NOTIFICATION DATA',
        'all_application_data': 'CLEAR ALL DMS BUSINESS DATA',
    }
    return phrases[scope]


def _maintenance_collector(scope):
    models = _maintenance_scopes().get(scope)
    if not models:
        raise ValueError('Select a supported maintenance scope.')
    collector = Collector(using=connection.alias)
    for model in models:
        queryset = model.objects.all()
        if model.__name__ == 'Allocation' and scope == 'activities':
            queryset = queryset.filter(activity__isnull=False)
        collector.collect(queryset)
    counts = {model._meta.label: len(objects) for model, objects in collector.data.items() if objects}
    for queryset in collector.fast_deletes:
        label = queryset.model._meta.label
        counts[label] = counts.get(label, 0) + queryset.count()
    return collector, dict(sorted(counts.items()))


def _developer_protected_tables():
    from django.apps import apps

    protected = {'users.SystemMaintenanceState'}
    protected.update(
        model._meta.label for model in apps.get_models(include_auto_created=True)
        if model._meta.app_label in {'admin', 'auth', 'contenttypes', 'sessions'}
    )
    return protected


def _developer_table_models():
    from django.apps import apps

    allowed_apps = {'activities', 'resources', 'finance', 'users', 'admin', 'auth', 'contenttypes', 'sessions'}
    models = {}
    for model in apps.get_models(include_auto_created=True):
        if (model._meta.app_label in allowed_apps and model._meta.managed
                and not model._meta.proxy):
            models[model._meta.db_table] = model
    return models


def _developer_table_model(table_name):
    model = _developer_table_models().get(str(table_name or ''))
    if model is None:
        raise ValueError('That table is not available for application record management.')
    return model


def _developer_all_record_querysets(current_user):
    querysets = []
    for model in _developer_table_models().values():
        if model._meta.label in _developer_protected_tables():
            continue
        queryset = model.objects.all()
        if model._meta.label == 'users.User':
            queryset = queryset.exclude(pk=current_user.pk)
        querysets.append(queryset)
    return querysets


def _collect_with_dependent_records(queryset):
    """Collect cascade and protected child rows for a deliberate developer deletion."""
    collector = Collector(using=connection.alias)
    if isinstance(queryset, (list, tuple)) and queryset and hasattr(queryset[0], 'model'):
        pending = list(queryset)
    else:
        pending = [queryset]
    seen_protected = set()
    while pending:
        next_pending = []
        for objects in pending:
            try:
                collector.collect(objects)
            except ProtectedError as exc:
                protected = list(exc.protected_objects)
                if not protected:
                    raise
                for instance in protected:
                    marker = (instance._meta.label_lower, instance.pk)
                    if marker not in seen_protected:
                        seen_protected.add(marker)
                        next_pending.append(instance)
        pending = next_pending
    return collector


def _collector_record_counts(collector):
    record_ids = {
        model: {instance.pk for instance in records}
        for model, records in collector.data.items()
    }
    for queryset in collector.fast_deletes:
        model = queryset.model
        record_ids.setdefault(model, set()).update(queryset.values_list(model._meta.pk.name, flat=True))
    return dict(sorted(
        (model._meta.label, len(ids)) for model, ids in record_ids.items() if ids
    ))


def _record_field_value(instance, field):
    name = field.name.lower()
    if instance._meta.label == 'sessions.Session' and name in {'session_key', 'session_data'}:
        return '[hidden]'
    if any(secret in name for secret in ('password', 'token', 'secret', 'api_key', 'private_key')):
        return '[hidden]'
    value = getattr(instance, field.attname)
    if value is None:
        return None
    if field.get_internal_type() == 'FileField':
        return str(value)
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    if isinstance(value, (str, int, float, bool)):
        return value[:300] if isinstance(value, str) else value
    return str(value)[:300]


def _flatten_choices(choices):
    flattened = []
    for value, label in choices:
        if isinstance(label, (list, tuple)):
            flattened.extend(_flatten_choices(label))
        else:
            flattened.append({'value': value, 'label': str(label)})
    return flattened


def _insert_field_metadata(model, field):
    if field.primary_key or not field.editable or getattr(field, 'auto_now', False) or getattr(field, 'auto_now_add', False):
        return None
    if field.get_internal_type() in {'FileField', 'ImageField'}:
        return None
    internal_type = field.get_internal_type()
    input_type = 'text'
    if internal_type in {'TextField'}:
        input_type = 'textarea'
    elif internal_type in {'BooleanField', 'NullBooleanField'}:
        input_type = 'checkbox'
    elif internal_type in {'DateField'}:
        input_type = 'date'
    elif internal_type in {'DateTimeField'}:
        input_type = 'datetime-local'
    elif internal_type in {'TimeField'}:
        input_type = 'time'
    elif internal_type in {'IntegerField', 'BigIntegerField', 'SmallIntegerField', 'PositiveIntegerField', 'PositiveSmallIntegerField', 'AutoField', 'BigAutoField', 'FloatField', 'DecimalField'}:
        input_type = 'number'
    elif internal_type == 'EmailField':
        input_type = 'email'
    elif internal_type == 'URLField':
        input_type = 'url'
    elif internal_type == 'JSONField':
        input_type = 'json'
    choices = _flatten_choices(field.choices) if field.choices else []
    related_options = []
    related_model = getattr(getattr(field, 'remote_field', None), 'model', None)
    if related_model:
        related_options = [
            {'value': str(obj.pk), 'label': str(obj)[:160]}
            for obj in related_model._default_manager.using(connection.alias).all().order_by(related_model._meta.pk.name)[:500]
        ]
        input_type = 'relation'
    elif choices:
        input_type = 'choice'
    default = None
    has_default = field.has_default()
    if has_default:
        try:
            value = field.default() if callable(field.default) else field.default
            if internal_type == 'JSONField':
                default = json.dumps(value)
            elif isinstance(value, (str, int, float, bool)) or value is None:
                default = value
            elif isinstance(value, Decimal):
                default = str(value)
        except Exception:
            default = None
    return {
        'name': field.name,
        'label': str(field.verbose_name),
        'type': input_type,
        'required': not field.blank and not field.null and not has_default,
        'nullable': field.null,
        'max_length': getattr(field, 'max_length', None),
        'max_digits': getattr(field, 'max_digits', None),
        'decimal_places': getattr(field, 'decimal_places', None),
        'choices': choices,
        'options': related_options,
        'has_default': has_default,
        'default': default,
        'help_text': str(field.help_text or ''),
    }


def _developer_insert_metadata(model):
    concrete_fields = []
    many_fields = []
    for field in model._meta.concrete_fields:
        metadata = _insert_field_metadata(model, field)
        if metadata:
            concrete_fields.append(metadata)
    for field in model._meta.many_to_many:
        if not field.editable or not field.remote_field.through._meta.auto_created:
            continue
        metadata = _insert_field_metadata(model, field)
        if metadata:
            many_fields.append(metadata)
    return concrete_fields, many_fields


def _convert_insert_value(field, value):
    if isinstance(field, models.ForeignKey):
        target_field = field.target_field
        converted = target_field.to_python(value)
        if converted is not None and not field.remote_field.model._default_manager.using(connection.alias).filter(pk=converted).exists():
            raise DjangoValidationError(f'{field.verbose_name} does not match an existing record.')
        return converted
    if field.get_internal_type() == 'JSONField' and isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError as exc:
            raise DjangoValidationError('Enter valid JSON.') from exc
    if value == '' and field.null:
        return None
    if value == '' and field.get_internal_type() in {'CharField', 'TextField', 'EmailField', 'URLField', 'SlugField'}:
        return ''
    return field.to_python(value)


def _private_backup_directory():
    directory = (Path(settings.BASE_DIR) / 'private_backups').resolve()
    base = Path(settings.BASE_DIR).resolve()
    if base not in directory.parents:
        raise RuntimeError('Backup directory must remain inside the backend project directory.')
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    return directory


class DeveloperOptionsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def _require_developer(self, request):
        if not (request.user.is_superuser or (request.user.role == 'ADMIN' and request.user.has_developer_options)):
            raise PermissionDenied('Developer Options privilege required.')

    def _require_destructive(self, request):
        self._require_developer(request)
        if not (request.user.is_superuser or (request.user.role == 'ADMIN' and request.user.has_destructive_maintenance)):
            raise PermissionDenied('Destructive Maintenance privilege required.')

    @action(detail=False, methods=['get'])
    def status(self, request):
        self._require_developer(request)
        from django.db.migrations.recorder import MigrationRecorder
        from django.apps import apps
        state, _ = SystemMaintenanceState.objects.get_or_create(pk=1)
        try:
            connection.ensure_connection()
            db_status = 'connected'
        except Exception:
            db_status = 'unavailable'
        tables = connection.introspection.table_names() if db_status == 'connected' else []
        applied = MigrationRecorder(connection).applied_migrations() if db_status == 'connected' else set()
        from django.db.migrations.loader import MigrationLoader
        pending = []
        if db_status == 'connected':
            loader = MigrationLoader(connection)
            pending = sorted(set(loader.disk_migrations) - set(applied))
        record_counts = {}
        if db_status == 'connected':
            models = dict.fromkeys(
                model
                for scope_models in _maintenance_scopes().values()
                for model in scope_models
            )
            for model in models:
                try:
                    record_counts[model._meta.label] = model.objects.count()
                except Exception:
                    record_counts[model._meta.label] = None
        return Response({
            'database_status': db_status, 'database_engine': connection.vendor,
            'application_status': 'healthy' if db_status == 'connected' else 'degraded', 'modules': [app.label for app in apps.get_app_configs() if app.name.split('.')[0] in {'users','finance','resources','activities'}],
            'table_count': len(tables), 'applied_migration_count': len(applied),
            'pending_migration_count': len(pending), 'pending_migrations': [f'{app}.{name}' for app, name in pending[:50]],
            'record_counts': record_counts, 'backup_recovery_verified': False,
            'destructive_maintenance_enabled': bool(request.user.is_superuser or (request.user.role == 'ADMIN' and request.user.has_destructive_maintenance)), 'maintenance_mode': state.is_active,
            'recent_actions': list(MaintenanceAuditLog.objects.select_related('actor').values('action','scope','created_at','actor__username')[:10]),
        })

    @action(detail=False, methods=['get'], url_path='maintenance-history')
    def maintenance_history(self, request):
        self._require_developer(request)
        queryset = MaintenanceAuditLog.objects.select_related('actor').all()
        search = str(request.query_params.get('search') or '').strip()[:120]
        action_name = str(request.query_params.get('action') or '').strip()[:40]
        scope = str(request.query_params.get('scope') or '').strip()[:200]
        if search:
            queryset = queryset.filter(
                Q(action__icontains=search)
                | Q(scope__icontains=search)
                | Q(actor__username__icontains=search)
            )
        if action_name:
            queryset = queryset.filter(action=action_name)
        if scope == '__system__':
            queryset = queryset.filter(scope='')
        elif scope:
            queryset = queryset.filter(scope=scope)
        try:
            page = max(1, int(request.query_params.get('page', 1)))
        except (TypeError, ValueError):
            page = 1
        page_size = 20
        total = queryset.count()
        pages = max(1, (total + page_size - 1) // page_size)
        page = min(page, pages)
        entries = queryset.order_by('-created_at', '-id')[(page - 1) * page_size:page * page_size]
        return Response({
            'results': list(entries.values('action', 'scope', 'created_at', 'actor__username')),
            'total': total,
            'page': page,
            'page_size': page_size,
            'pages': pages,
            'actions': list(MaintenanceAuditLog.objects.order_by().values_list('action', flat=True).distinct().order_by('action')),
            'scopes': list(MaintenanceAuditLog.objects.order_by().values_list('scope', flat=True).distinct().order_by('scope')),
        })

    @action(detail=False, methods=['post'], url_path='maintenance-mode')
    def maintenance_mode(self, request):
        self._require_developer(request)
        active = request.data.get('active')
        if not isinstance(active, bool):
            return Response({'active': 'A boolean value is required.'}, status=400)
        with transaction.atomic():
            state, _ = SystemMaintenanceState.objects.select_for_update().get_or_create(pk=1)
            state.is_active = active
            state.message = str(request.data.get('message') or state.message)[:300]
            state.updated_by = request.user
            state.save()
            MaintenanceAuditLog.objects.create(actor=request.user, action='MAINTENANCE_MODE_ENABLED' if active else 'MAINTENANCE_MODE_DISABLED', scope='system')
        return Response({'active': state.is_active, 'message': state.message, 'updated_at': state.updated_at})

    @action(detail=False, methods=['get'], url_path='database-metadata')
    def database_metadata(self, request):
        self._require_developer(request)
        tables = connection.introspection.table_names()
        writable_models = _developer_table_models()
        descriptions = []
        with connection.cursor() as cursor:
            for name in tables:
                model = writable_models.get(name)
                columns = [column.name for column in connection.introspection.get_table_description(cursor, name)]
                descriptions.append({
                    'name': name,
                    'model': model._meta.label if model else None,
                    'record_count': model.objects.count() if model else None,
                    'viewable': model is not None,
                    'writable': model is not None and model._meta.label not in _developer_protected_tables(),
                    'record_deletable': model is not None and model._meta.label not in _developer_protected_tables(),
                    'insertable': model is not None and model._meta.label != 'users.User' and model._meta.label not in _developer_protected_tables(),
                    'clearable': model is not None and model._meta.label not in _developer_protected_tables(),
                    'columns': columns,
                })
        return Response({'engine': connection.vendor, 'tables': descriptions})

    @action(detail=False, methods=['get'], url_path='database-records')
    def database_records(self, request):
        self._require_developer(request)
        try:
            model = _developer_table_model(request.query_params.get('table'))
        except (ValueError, DjangoValidationError, TypeError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        try:
            page = max(1, int(request.query_params.get('page', 1)))
        except (TypeError, ValueError):
            page = 1
        query = str(request.query_params.get('search') or '').strip()[:120]
        queryset = model.objects.all().order_by(model._meta.pk.name)
        if query:
            text_fields = [field for field in model._meta.concrete_fields if field.get_internal_type() in {
                'CharField', 'TextField', 'EmailField', 'SlugField', 'URLField',
            }]
            search_filter = Q()
            for field in text_fields[:10]:
                search_filter |= Q(**{f'{field.name}__icontains': query})
            try:
                primary_key_value = model._meta.pk.to_python(query)
                search_filter |= Q(pk=primary_key_value)
            except (DjangoValidationError, ValueError, TypeError):
                pass
            if search_filter:
                queryset = queryset.filter(search_filter)
        total = queryset.count()
        page_size = 50
        rows = queryset[(page - 1) * page_size:page * page_size]
        fields = [
            {'name': field.name, 'label': str(field.verbose_name), 'type': field.get_internal_type()}
            for field in model._meta.concrete_fields
        ]
        insert_fields, many_fields = _developer_insert_metadata(model)
        return Response({
            'table': model._meta.db_table,
            'model': model._meta.label,
            'fields': fields,
            'insert_fields': insert_fields,
            'many_fields': many_fields,
            'page': page,
            'page_size': page_size,
            'total': total,
            'records': [{
                'id': str(instance.pk),
                'values': {field.name: _record_field_value(instance, field) for field in model._meta.concrete_fields},
            } for instance in rows],
        })

    @action(detail=False, methods=['post'], url_path='database-insert-record')
    def database_insert_record(self, request):
        self._require_developer(request)
        try:
            model = _developer_table_model(request.data.get('table'))
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if model._meta.label == 'users.User':
            return Response({'detail': 'Create user accounts through the Control module so passwords are stored securely.'}, status=status.HTTP_400_BAD_REQUEST)
        if model._meta.label in _developer_protected_tables():
            return Response({'detail': 'This system table cannot be changed from the database browser.'}, status=status.HTTP_400_BAD_REQUEST)
        values = request.data.get('values') or {}
        relations = request.data.get('relations') or {}
        if not isinstance(values, dict) or not isinstance(relations, dict):
            return Response({'detail': 'Provide record fields as an object and related records as lists.'}, status=status.HTTP_400_BAD_REQUEST)

        allowed_fields = {
            field.name: field for field in model._meta.concrete_fields
            if not field.primary_key and field.editable and field.get_internal_type() not in {'FileField', 'ImageField'}
        }
        allowed_many = {
            field.name: field for field in model._meta.many_to_many
            if field.editable and field.remote_field.through._meta.auto_created
        }
        errors = {}
        instance = model()
        for name, raw_value in values.items():
            field = allowed_fields.get(name)
            if field is None:
                errors[name] = 'This field cannot be inserted from the database browser.'
                continue
            if raw_value in (None, '') and field.has_default():
                continue
            if raw_value in (None, '') and not field.null and not field.blank:
                errors[name] = 'This field is required.'
                continue
            try:
                converted = _convert_insert_value(field, raw_value)
                setattr(instance, field.attname, converted)
            except (DjangoValidationError, ValueError, TypeError) as exc:
                errors[name] = '; '.join(exc.messages) if isinstance(exc, DjangoValidationError) else str(exc)

        relation_values = {}
        for name, raw_ids in relations.items():
            field = allowed_many.get(name)
            if field is None:
                errors[name] = 'This relationship cannot be changed from the database browser.'
                continue
            if not isinstance(raw_ids, list):
                errors[name] = 'Choose zero or more related records.'
                continue
            try:
                related_model = field.remote_field.model
                ids = [related_model._meta.pk.to_python(value) for value in raw_ids]
                existing_count = related_model._default_manager.using(connection.alias).filter(pk__in=ids).count()
                if existing_count != len(set(ids)):
                    errors[name] = 'One or more selected related records no longer exist.'
                else:
                    relation_values[name] = ids
            except (DjangoValidationError, ValueError, TypeError) as exc:
                errors[name] = '; '.join(exc.messages) if isinstance(exc, DjangoValidationError) else str(exc)

        if errors:
            return Response({'fields': errors}, status=status.HTTP_400_BAD_REQUEST)
        try:
            instance.full_clean()
            with transaction.atomic(using=connection.alias):
                instance.save(using=connection.alias)
                for name, ids in relation_values.items():
                    getattr(instance, name).set(ids)
                MaintenanceAuditLog.objects.create(
                    actor=request.user, action='DATABASE_RECORD_INSERTED', scope=model._meta.db_table,
                    details={'record_id': str(instance.pk)},
                )
        except DjangoValidationError as exc:
            return Response({'fields': exc.message_dict if hasattr(exc, 'message_dict') else {'detail': exc.messages}}, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            return Response({'detail': 'The record conflicts with an existing database value. Check unique fields and try again.'}, status=status.HTTP_409_CONFLICT)
        return Response({'id': str(instance.pk), 'detail': 'Database entry added successfully.'}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='database-table-preview')
    def database_table_preview(self, request):
        self._require_destructive(request)
        try:
            model = _developer_table_model(request.query_params.get('table'))
            record_id = request.query_params.get('record_id')
            if model._meta.label in _developer_protected_tables():
                return Response({'detail': 'This system or configuration table is available for inspection only.'}, status=status.HTTP_400_BAD_REQUEST)
            queryset = model.objects.filter(pk=record_id) if record_id else model.objects.all()
            if model._meta.label == 'users.User' and not record_id:
                queryset = queryset.exclude(pk=request.user.pk)
            if record_id and not queryset.exists():
                return Response({'detail': 'The selected record was not found.'}, status=status.HTTP_404_NOT_FOUND)
            collector = _collect_with_dependent_records(queryset)
        except (ValueError, DjangoValidationError, TypeError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'table': model._meta.db_table,
            'record_id': record_id,
            'counts': _collector_record_counts(collector),
            'total_records': sum(_collector_record_counts(collector).values()),
        })

    @action(detail=False, methods=['get'], url_path='database-all-preview')
    def database_all_preview(self, request):
        self._require_destructive(request)
        collector = _collect_with_dependent_records(_developer_all_record_querysets(request.user))
        counts = _collector_record_counts(collector)
        return Response({'counts': counts, 'total_records': sum(counts.values())})

    @action(detail=False, methods=['post'], url_path='database-delete-record')
    def database_delete_record(self, request):
        self._require_destructive(request)
        try:
            model = _developer_table_model(request.data.get('table'))
            if model._meta.label in _developer_protected_tables():
                return Response({'detail': 'This system or configuration table is available for inspection only.'}, status=status.HTTP_400_BAD_REQUEST)
            if model._meta.label == 'users.User' and str(request.data.get('record_id')) == str(request.user.pk):
                return Response({'detail': 'You cannot delete the account currently using Developer Options.'}, status=status.HTTP_400_BAD_REQUEST)
            queryset = model.objects.filter(pk=request.data.get('record_id'))
            if not queryset.exists():
                return Response({'detail': 'The selected record was not found.'}, status=status.HTTP_404_NOT_FOUND)
            with transaction.atomic(using=connection.alias):
                collector = _collect_with_dependent_records(queryset)
                deleted_total, per_model = collector.delete()
                details = dict(sorted(per_model.items()))
                MaintenanceAuditLog.objects.create(
                    actor=request.user, action='DATABASE_RECORD_DELETED', scope=model._meta.db_table,
                    details={'record_id': str(request.data.get('record_id')), 'deleted_total': deleted_total, 'deleted_by_model': details},
                )
        except (ValueError, DjangoValidationError, TypeError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'deleted_total': deleted_total, 'deleted_by_model': details})

    @action(detail=False, methods=['post'], url_path='database-clear-table')
    def database_clear_table(self, request):
        self._require_destructive(request)
        try:
            model = _developer_table_model(request.data.get('table'))
            if model._meta.label in _developer_protected_tables():
                return Response({'detail': 'This system or configuration table is available for inspection only.'}, status=status.HTTP_400_BAD_REQUEST)
            with transaction.atomic(using=connection.alias):
                queryset = model.objects.all()
                if model._meta.label == 'users.User':
                    queryset = queryset.exclude(pk=request.user.pk)
                collector = _collect_with_dependent_records(queryset)
                deleted_total, per_model = collector.delete()
                details = dict(sorted(per_model.items()))
                MaintenanceAuditLog.objects.create(
                    actor=request.user, action='DATABASE_TABLE_CLEARED', scope=model._meta.db_table,
                    details={'deleted_total': deleted_total, 'deleted_by_model': details},
                )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'deleted_total': deleted_total, 'deleted_by_model': details})

    @action(detail=False, methods=['post'], url_path='database-clear-all')
    def database_clear_all(self, request):
        self._require_destructive(request)
        try:
            with transaction.atomic(using=connection.alias):
                collector = _collect_with_dependent_records(_developer_all_record_querysets(request.user))
                deleted_total, per_model = collector.delete()
                details = dict(sorted(per_model.items()))
                MaintenanceAuditLog.objects.create(
                    actor=request.user, action='DATABASE_ALL_BUSINESS_DATA_CLEARED', scope='all_application_data',
                    details={'deleted_total': deleted_total, 'deleted_by_model': details},
                )
        except ProtectedError as exc:
            labels = sorted({item._meta.label for item in exc.protected_objects})
            return Response({'detail': 'Some directly dependent records could not be cleared.', 'protected_models': labels}, status=status.HTTP_409_CONFLICT)
        return Response({'deleted_total': deleted_total, 'deleted_by_model': details})

    @action(detail=False, methods=['get'], url_path='clear-preview')
    def clear_preview(self, request):
        self._require_destructive(request)
        scope = str(request.query_params.get('scope') or '')
        scope_models = _maintenance_scopes().get(scope)
        if not scope_models:
            return Response({'detail': 'Select a supported maintenance scope.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            _collector = _collect_with_dependent_records([model.objects.all() for model in scope_models])
            counts = _collector_record_counts(_collector)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ProtectedError as exc:
            labels = sorted({item._meta.label for item in exc.protected_objects})
            return Response({'detail': 'This scope is referenced by protected records and cannot be cleared safely.', 'protected_models': labels}, status=status.HTTP_409_CONFLICT)
        return Response({
            'scope': scope,
            'counts': counts,
            'total_records': sum(counts.values()),
            'preserved': ['Users and roles', 'Permission settings', 'Recipient groups and categories', 'Maintenance audit history', 'Django schema and migration history'],
        })

    @action(detail=False, methods=['post'], url_path='clear-data')
    def clear_data(self, request):
        self._require_destructive(request)
        scope = str(request.data.get('scope') or '')
        if scope not in _maintenance_scopes():
            return Response({'detail': 'Select a supported maintenance scope.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic(using=connection.alias):
                collector = _collect_with_dependent_records([model.objects.all() for model in _maintenance_scopes()[scope]])
                deleted_total, per_model = collector.delete()
                counts = dict(sorted(per_model.items()))
                MaintenanceAuditLog.objects.create(
                    actor=request.user,
                    action='BUSINESS_DATA_CLEARED',
                    scope=scope,
                    details={'deleted_total': deleted_total, 'deleted_by_model': counts},
                )
        except ProtectedError as exc:
            labels = sorted({item._meta.label for item in exc.protected_objects})
            return Response({'detail': 'The selected records are protected by dependent data and were not cleared.', 'protected_models': labels}, status=status.HTTP_409_CONFLICT)
        return Response({'scope': scope, 'deleted_total': deleted_total, 'deleted_by_model': counts})

    @action(detail=False, methods=['get'], url_path='backups')
    def backups(self, request):
        self._require_developer(request)
        directory = _private_backup_directory()
        entries = []
        for path in sorted(directory.glob('*.json'), key=lambda item: item.stat().st_mtime, reverse=True):
            try:
                manifest = json.loads(path.with_suffix('.manifest.json').read_text(encoding='utf-8'))
                if manifest.get('backup_id') == path.stem:
                    entries.append({key: manifest.get(key) for key in ('backup_id', 'created_at', 'size_bytes', 'record_count', 'sha256', 'scope')})
            except (OSError, ValueError):
                continue
        return Response({'backups': entries})

    @action(detail=False, methods=['post'], url_path='backups/create')
    def create_backup(self, request):
        self._require_developer(request)
        directory = _private_backup_directory()
        model_labels = [f'{model._meta.app_label}.{model._meta.model_name}' for model in _maintenance_scopes()['all_application_data']]
        stream = StringIO()
        try:
            call_command('dumpdata', *model_labels, natural_foreign=True, natural_primary=True, stdout=stream, database=connection.alias)
            fixture = json.loads(stream.getvalue())
            payload = json.dumps(fixture, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        except Exception as exc:
            return Response({'detail': f'Database backup failed: {exc.__class__.__name__}.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        backup_id = uuid.uuid4().hex
        backup_path = directory / f'{backup_id}.json'
        temporary_path = directory / f'{backup_id}.json.tmp'
        manifest_path = directory / f'{backup_id}.manifest.json'
        digest = hashlib.sha256(payload).hexdigest()
        manifest = {
            'backup_id': backup_id,
            'created_at': timezone.now().isoformat(),
            'created_by': request.user.username,
            'scope': 'DMS business data only; database fixture; uploaded media files are not included',
            'size_bytes': len(payload),
            'record_count': len(fixture),
            'sha256': digest,
            'restore_verified': False,
        }
        try:
            temporary_path.write_bytes(payload)
            temporary_path.replace(backup_path)
            manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        except OSError:
            temporary_path.unlink(missing_ok=True)
            backup_path.unlink(missing_ok=True)
            manifest_path.unlink(missing_ok=True)
            return Response({'detail': 'The backup could not be written to the private backup directory.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        MaintenanceAuditLog.objects.create(actor=request.user, action='BUSINESS_DATA_BACKUP_CREATED', scope='all_application_data', details={'backup_id': backup_id, 'sha256': digest, 'record_count': len(fixture)})
        return Response(manifest, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='backups/restore')
    def restore_backup(self, request):
        self._require_destructive(request)
        backup_id = str(request.data.get('backup_id') or '')
        if not re.fullmatch(r'[0-9a-f]{32}', backup_id):
            return Response({'backup_id': 'Select a valid backup from the backup list.'}, status=status.HTTP_400_BAD_REQUEST)
        directory = _private_backup_directory()
        backup_path = directory / f'{backup_id}.json'
        manifest_path = directory / f'{backup_id}.manifest.json'
        try:
            payload = backup_path.read_bytes()
            manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
            fixture = json.loads(payload)
        except (OSError, ValueError):
            return Response({'detail': 'The selected backup is unavailable or unreadable.'}, status=status.HTTP_404_NOT_FOUND)
        digest = hashlib.sha256(payload).hexdigest()
        if manifest.get('backup_id') != backup_id or manifest.get('sha256') != digest or not isinstance(fixture, list):
            return Response({'detail': 'Backup integrity verification failed. No records were changed.'}, status=status.HTTP_409_CONFLICT)
        allowed_labels = {f'{model._meta.app_label}.{model._meta.model_name}' for model in _maintenance_scopes()['all_application_data']}
        if any(not isinstance(item, dict) or item.get('model') not in allowed_labels for item in fixture):
            return Response({'detail': 'Backup contains records outside the supported business-data scope.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic(using=connection.alias):
                collector = _collect_with_dependent_records([model.objects.all() for model in _maintenance_scopes()['all_application_data']])
                collector.delete()
                call_command('loaddata', str(backup_path), database=connection.alias, verbosity=0)
                MaintenanceAuditLog.objects.create(
                    actor=request.user,
                    action='BUSINESS_DATA_BACKUP_RESTORED',
                    scope='all_application_data',
                    details={'backup_id': backup_id, 'sha256': digest, 'record_count': manifest.get('record_count')},
                )
        except Exception as exc:
            return Response({'detail': f'Restore failed and the database transaction was rolled back ({exc.__class__.__name__}).'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({'detail': 'Business data was restored from the selected database backup. Uploaded media files are not included.', 'backup_id': backup_id, 'sha256': digest})


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        credential = str(request.data.get('credential') or '').strip()
        client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
        if not client_id:
            return Response({'detail': 'Google login is not configured for this DMS instance.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if not credential:
            return Response({'credential': 'Google credential token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token
        except Exception:
            return Response({'detail': 'Google authentication support is not installed on the server.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            idinfo = id_token.verify_oauth2_token(credential, google_requests.Request(), client_id)
        except Exception:
            return Response({'detail': 'Google authentication failed. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

        email = str(idinfo.get('email') or '').strip().lower()
        if not email or not idinfo.get('email_verified'):
            return Response({'detail': 'Google did not provide a verified email address.'}, status=status.HTTP_400_BAD_REQUEST)

        matches = User.objects.filter(email__iexact=email)
        if matches.count() > 1:
            return Response({'detail': 'Multiple DMS accounts use this email address. Contact the system administrator.'}, status=status.HTTP_409_CONFLICT)
        user = matches.first()
        if not user:
            return Response({'detail': 'This Google account is not linked to an authorized DMS account. Contact the system administrator.'}, status=status.HTTP_403_FORBIDDEN)
        if not user.is_active:
            return Response({'detail': 'This DMS account has been disabled. Contact the system administrator.'}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


class RegisterView(generics.CreateAPIView):
    """POST-only view to register a new user."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class ProfileView(generics.RetrieveAPIView):
    """GET view that returns the currently authenticated user's details."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    """GET view that returns users for participant selection and collaboration."""
    queryset = User.objects.filter(is_active=True).select_related('user_category')
    serializer_class = UserDirectorySerializer
    permission_classes = [permissions.IsAuthenticated]


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = str(request.data.get('email') or '').strip().lower()
        generic = {
            'detail': 'If an account exists for this email address, a password reset link has been sent.'
        }

        try:
            validate_email(email)
        except DjangoValidationError:
            return Response({'email': 'Enter a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)

        users = User.objects.filter(email__iexact=email, is_active=True)
        for user in users:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password/{uid}/{token}"
            subject = '[DMS] Password Reset Request'
            text_body = (
                "THE UNIVERSITY OF ZAMBIA\n"
                "Department of Computing & Informatics\n"
                "Departmental Management System\n\n"
                "Password Reset Request\n\n"
                "A password reset was requested for your DMS account.\n\n"
                "Use the secure link below to create a new password.\n\n"
                f"{reset_link}\n\n"
                "If you did not request this password reset, you may ignore this email."
            )
            html_body = f"""
                <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
                  <h2 style="margin-bottom: 4px;">THE UNIVERSITY OF ZAMBIA</h2>
                  <div>Department of Computing &amp; Informatics</div>
                  <div>Departmental Management System</div>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 18px 0;" />
                  <h3>Password Reset Request</h3>
                  <p>A password reset was requested for your DMS account.</p>
                  <p>Use the secure link below to create a new password.</p>
                  <p>
                    <a href="{reset_link}" style="display:inline-block;background:#ea580c;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">
                      Reset Password
                    </a>
                  </p>
                  <p style="color:#64748b;font-size:13px;">If you did not request this password reset, you may ignore this email.</p>
                </div>
            """
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@department.local'),
                to=[user.email],
            )
            msg.attach_alternative(html_body, 'text/html')
            msg.send(fail_silently=True)

        return Response(generic)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        password = request.data.get('password') or ''
        confirm_password = request.data.get('confirm_password') or ''

        if password != confirm_password:
            return Response({'confirm_password': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist, DjangoValidationError):
            return Response({'detail': 'This password reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'This password reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password, user=user)
        except DjangoValidationError as exc:
            return Response({'password': list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Your password has been reset successfully. You can now sign in.'})


class UserGroupCategoryViewSet(viewsets.ModelViewSet):
    """Admin-managed categories for grouping users by staff area or function."""
    queryset = UserGroupCategory.objects.all().order_by('name')
    serializer_class = UserGroupCategorySerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]


class UserManagementViewSet(viewsets.ModelViewSet):
    """Admin-only viewset for adding, managing, blocking, and deleting users."""
    queryset = User.objects.all().order_by('-id')
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminCreateUserSerializer
        return UserSerializer

    @action(detail=True, methods=['patch'])
    def assign_role(self, request, pk=None):
        """Assign role, department, category, email, and module privileges to a user."""
        user = self.get_object()
        editing_self = user.pk == request.user.pk
        role = request.data.get('role')
        department = request.data.get('department')
        email = request.data.get('email')
        user_category = request.data.get('user_category')

        protected_self_fields = {
            'role',
            'has_finance_privilege',
            'has_finance_balance_access',
            'has_resource_privilege',
            'has_activity_privilege',
            'has_control_privilege',
            'has_announcement_view', 'has_announcement_create', 'has_announcement_publish',
            'has_announcement_archive', 'has_announcement_manage_all', 'has_developer_options', 'has_destructive_maintenance',
            'is_active',
        }
        if editing_self and protected_self_fields.intersection(request.data.keys()):
            return Response(
                {'detail': 'You cannot change your own access level, privileges, or account status.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role and role in dict(User.ROLE_CHOICES):
            user.role = role
        if department is not None:
            user.department = department
        if email is not None:
            user.email = email
        if user_category is not None:
            user.user_category_id = user_category or None

        for field in (
            'has_finance_privilege',
            'has_finance_balance_access',
            'has_resource_privilege',
            'has_activity_privilege',
            'has_control_privilege',
            'has_announcement_view', 'has_announcement_create', 'has_announcement_publish',
            'has_announcement_archive', 'has_announcement_manage_all', 'has_developer_options', 'has_destructive_maintenance',
        ):
            if field in request.data:
                setattr(user, field, bool(request.data.get(field)))
        if user.role != 'ADMIN':
            user.has_developer_options = False
            user.has_destructive_maintenance = False
        if 'is_active' in request.data:
            user.is_active = bool(request.data.get('is_active'))
        
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['patch'])
    def toggle_block(self, request, pk=None):
        """Block or unblock user access."""
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response(
                {'detail': 'You cannot block your own administrator account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        is_active = request.data.get('is_active')
        if is_active is not None:
            user.is_active = bool(is_active)
        else:
            user.is_active = not user.is_active
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['patch'])
    def reset_password(self, request, pk=None):
        """Reset a user's password."""
        user = self.get_object()
        new_password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')
        if not new_password:
            return Response({'detail': 'New password is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if confirm_password is not None and new_password != confirm_password:
            return Response({'detail': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response({'password': list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        return Response({'detail': f'Password for {user.username} has been updated successfully.'})

    def destroy(self, request, *args, **kwargs):
        """Permanently delete a user account."""
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response(
                {'detail': 'You cannot delete your own administrator account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        username = user.username
        try:
            user.delete()
        except ProtectedError:
            return Response(
                {
                    'detail': (
                        'This user cannot be permanently deleted because finance or resource history '
                        'still references the account. Block the account instead to prevent sign-in.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'detail': f'User "{username}" has been deleted.'}, status=status.HTTP_200_OK)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.dms_notifications.all().order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = request.user.dms_notifications.filter(is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        request.user.dms_notifications.filter(is_read=False).update(is_read=True)
        return Response({'status': 'all marked as read'})


class RecipientGroupViewSet(viewsets.ModelViewSet):
    serializer_class = RecipientGroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = RecipientGroup.objects.all().prefetch_related('members')

    def get_queryset(self):
        qs = RecipientGroup.objects.all().prefetch_related('members')
        include_all = self.request.query_params.get('all', 'false').lower() in ['true', '1']
        if not include_all:
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        if not has_activity_privilege(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Activities & Events privilege required.")
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if not has_activity_privilege(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Activities & Events privilege required.")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        if not has_activity_privilege(request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Activities & Events privilege required.")
        instance = self.get_object()
        if instance.activities.exists():
            return Response(
                {'detail': 'Cannot delete this participant group because historical activities reference it. Deactivate it instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        if not has_activity_privilege(request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Activities & Events privilege required.")
        group = self.get_object()
        group.is_active = not group.is_active
        group.save(update_fields=['is_active'])
        return Response(RecipientGroupSerializer(group).data)
