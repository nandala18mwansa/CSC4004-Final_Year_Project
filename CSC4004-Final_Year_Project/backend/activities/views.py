import re
from datetime import timezone as dt_timezone

from rest_framework import viewsets, status as drf_status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from users.permissions import IsActivityPrivilegedOrReadOnly, IsOwnerOrAdminOrManager, has_activity_privilege
from users.models import User
from users.notifications import notify_user, notify_users
from .models import Activity, ActivityType
from .serializers import ActivitySerializer, ActivityTypeSerializer


# ── ActivityType ViewSet ─────────────────────────────────────────────

class ActivityTypeViewSet(viewsets.ModelViewSet):
    """
    CRUD management for Activity Types.
    Lists active types by default; pass ?all=true to include deactivated types.
    Prevents deletion if historical activities reference the type.
    """
    queryset = ActivityType.objects.all().order_by('name')
    serializer_class = ActivityTypeSerializer
    permission_classes = [IsAuthenticated, IsActivityPrivilegedOrReadOnly]

    def get_queryset(self):
        qs = ActivityType.objects.all().order_by('name')
        if getattr(self, 'action', None) == 'list':
            include_all = self.request.query_params.get('all', 'false').lower() in ['true', '1']
            if not include_all:
                qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        if not has_activity_privilege(self.request.user):
            raise PermissionDenied("Activities & Events privilege required.")
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if not has_activity_privilege(self.request.user):
            raise PermissionDenied("Activities & Events privilege required.")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        if not has_activity_privilege(request.user):
            raise PermissionDenied("Activities & Events privilege required.")
        instance = self.get_object()
        if instance.activities.exists():
            return Response(
                {'detail': f'Cannot delete "{instance.name}" because historical activities reference it. Deactivate it instead.'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        if not has_activity_privilege(request.user):
            raise PermissionDenied("Activities & Events privilege required.")
        instance = self.get_object()
        instance.is_active = not instance.is_active
        instance.save(update_fields=['is_active'])
        return Response(ActivityTypeSerializer(instance).data)


# ── Recipient Resolution & Deduplication ────────────────────────────

def _resolve_recipients(activity):
    """
    Return a deduplicated list of active User objects who should
    receive in-app notifications and email/calendar invitations.
    Deduplicates across All Staff, Recipient Groups, Categories, Individuals, and Organizer.
    """
    seen = set()
    recipients = []

    def _add(user):
        if user and user.id not in seen and user.is_active:
            seen.add(user.id)
            recipients.append(user)

    if activity.include_all_staff:
        for u in User.objects.filter(is_active=True):
            _add(u)
    else:
        for u in activity.participants.filter(is_active=True):
            _add(u)
        for group in activity.recipient_groups.filter(is_active=True):
            for u in group.members.filter(is_active=True):
                _add(u)
        for category in activity.participant_categories.all():
            for u in category.users.filter(is_active=True):
                _add(u)

    if activity.organizer:
        _add(activity.organizer)

    return recipients


def _parse_external_emails(raw_text):
    """Parse comma/semicolon/newline-separated external email addresses."""
    if not raw_text:
        return []
    parts = re.split(r'[\s,;]+', raw_text.strip())
    result = []
    for part in parts:
        part = part.strip()
        if part and re.match(r'^[^@]+@[^@]+\.[^@]+$', part):
            result.append(part.lower())
    return result


def _resolve_external_recipients(activity, dms_recipients):
    """
    Parse, deduplicate, and exclude any external email that already belongs
    to a resolved DMS user to prevent duplicate notifications.
    """
    raw_emails = _parse_external_emails(activity.external_participants)
    dms_emails = set()
    for item in dms_recipients:
        if isinstance(item, dict):
            em = item.get('email', '')
        else:
            em = getattr(item, 'email', '')
        if em:
            dms_emails.add(em.strip().lower())

    unique_ext = []
    seen = set()
    for email in raw_emails:
        if email not in seen and email not in dms_emails:
            seen.add(email)
            unique_ext.append(email)
    return unique_ext


# ── iCalendar Generation ─────────────────────────────────────────────

def _build_ics(activity, method='REQUEST'):
    """Build a full RFC 5545-compliant iCalendar string."""
    start = timezone.localtime(activity.start_date).astimezone(dt_timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    end = timezone.localtime(activity.end_date).astimezone(dt_timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    now = timezone.now().astimezone(dt_timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    uid = f"activity-{activity.id}@dms-department"
    description = (activity.description or '').replace('\r', '').replace('\n', '\\n')
    location = activity.location or ''
    organizer_email = activity.organizer.email if activity.organizer and activity.organizer.email else getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@department.local')
    organizer_name = activity.organizer.username if activity.organizer else 'DMS Organizer'

    vevent_status = 'CANCELLED' if method == 'CANCEL' else 'CONFIRMED'

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//DMS Departmental Management System//Activities//EN",
        "CALSCALE:GREGORIAN",
        f"METHOD:{method}",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"SEQUENCE:{activity.sequence}",
        f"DTSTAMP:{now}",
        f"DTSTART:{start}",
        f"DTEND:{end}",
        f"SUMMARY:{activity.title}",
        f"DESCRIPTION:{description}",
        f"STATUS:{vevent_status}",
        f"ORGANIZER;CN={organizer_name}:MAILTO:{organizer_email}",
    ]
    if location:
        lines.append(f"LOCATION:{location}")
    if method != 'CANCEL':
        lines += [
            "BEGIN:VALARM",
            "ACTION:DISPLAY",
            f"DESCRIPTION:Reminder: {activity.title}",
            f"TRIGGER:-PT{activity.reminder_minutes_before}M",
            "END:VALARM",
        ]
    lines += ["END:VEVENT", "END:VCALENDAR"]
    return "\r\n".join(lines)


# ── Notification Dispatcher ──────────────────────────────────────────

def _dispatch_notifications(activity, method='REQUEST', extra_message=''):
    """
    Create in-app notifications for all DMS recipients and send iCalendar email invites.
    External participants receive email with .ics attachment only (no in-app notification).
    """
    dms_recipients = _resolve_recipients(activity)
    external_emails = _resolve_external_recipients(activity, dms_recipients)

    if not dms_recipients and not external_emails:
        return

    ics_content = _build_ics(activity, method=method)
    ics_filename = f"activity-{activity.id}-{'cancel' if method == 'CANCEL' else 'invite'}.ics"

    start_str = timezone.localtime(activity.start_date).strftime('%d %b %Y %H:%M')
    end_str = timezone.localtime(activity.end_date).strftime('%H:%M')

    type_name = activity.activity_type.name if activity.activity_type else 'Activity'

    if method == 'CANCEL':
        notif_title = f"Activity Cancelled: {activity.title}"
        notif_message = (
            f"The activity \"{activity.title}\" ({type_name}) scheduled for {start_str} has been cancelled."
            + (f"\n\nReason: {extra_message}" if extra_message else "")
        )
        notif_type = 'ACTIVITY_CANCEL'
    elif activity.sequence > 0:
        notif_title = f"Activity Rescheduled: {activity.title}"
        notif_message = (
            f"The activity \"{activity.title}\" ({type_name}) has been rescheduled to {start_str} – {end_str}."
            + (f"\n\nNote: {extra_message}" if extra_message else "")
        )
        notif_type = 'ACTIVITY_UPDATE'
    else:
        notif_title = f"Activity Invitation: {activity.title}"
        loc_info = f"\nLocation: {activity.location}" if activity.location else ""
        notif_message = (
            f"You have been invited to: {activity.title} ({type_name})\n"
            f"When: {start_str} – {end_str}{loc_info}\n"
            f"Organizer: {activity.organizer.username if activity.organizer else 'Department'}"
        )
        notif_type = 'ACTIVITY_INVITE'

    # In-app notifications + email for DMS users
    if dms_recipients:
        notify_users(
            recipients=dms_recipients,
            title=notif_title,
            message=notif_message,
            notification_type=notif_type,
            link='/activities',
            send_email=activity.send_email_reminders,
            ics_content=ics_content,
            ics_method=method,
            ics_filename=ics_filename,
        )

    # Email only for external participants
    if external_emails and activity.send_email_reminders:
        try:
            from django.core.mail import EmailMultiAlternatives
            subject = f"[DMS] {notif_title}"
            body = notif_message
            for ext_email in external_emails:
                msg = EmailMultiAlternatives(
                    subject=subject,
                    body=body,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@department.local'),
                    to=[ext_email],
                )
                msg.attach(ics_filename, ics_content, f'text/calendar; method={method}; charset=UTF-8')
                msg.send(fail_silently=True)
        except Exception:
            pass


# ── Activity ViewSet ─────────────────────────────────────────────────

def _activity_reviewers():
    return User.objects.filter(is_active=True, has_activity_privilege=True)


def _notify_activity_reviewers(activity):
    reviewers = _activity_reviewers().exclude(id=activity.organizer_id)
    start_str = timezone.localtime(activity.start_date).strftime('%d %b %Y %H:%M')
    notify_users(
        recipients=reviewers,
        title='New activity pending approval',
        message=f'{activity.title} submitted by {activity.organizer.username} for {start_str} requires review.',
        notification_type='ACTIVITY_SUBMITTED',
        link='/activities',
        send_email=True,
    )

class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.all().select_related('activity_type', 'organizer').prefetch_related('participants', 'recipient_groups', 'participant_categories').order_by('start_date')
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated, IsActivityPrivilegedOrReadOnly, IsOwnerOrAdminOrManager]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Activity.objects.none()
        if has_activity_privilege(user):
            return Activity.objects.all().select_related('activity_type', 'organizer').prefetch_related('participants', 'recipient_groups', 'participant_categories').order_by('start_date')

        participant_queryset = Activity.objects.filter(
            Q(include_all_staff=True) |
            Q(participants=user) |
            Q(recipient_groups__members=user)
        ).filter(approval_status='APPROVED')
        if user.user_category_id:
            participant_queryset = participant_queryset | Activity.objects.filter(
                participant_categories=user.user_category,
                approval_status='APPROVED',
            )
        queryset = participant_queryset | Activity.objects.filter(organizer=user)
        return queryset.distinct().select_related('activity_type', 'organizer').prefetch_related('participants', 'recipient_groups', 'participant_categories').order_by('start_date')

    def perform_create(self, serializer):
        activity = serializer.save(
            organizer=self.request.user,
            submitted_by=self.request.user,
            approval_status='PENDING',
            status='PENDING_APPROVAL',
        )
        _notify_activity_reviewers(activity)

    def perform_update(self, serializer):
        old = self.get_object()
        if not has_activity_privilege(self.request.user) and old.approval_status != 'PENDING':
            raise PermissionDenied("Only Activities & Events administrators can update approved or reviewed activities.")
        new_start = serializer.validated_data.get('start_date', old.start_date)
        new_end = serializer.validated_data.get('end_date', old.end_date)
        is_reschedule = (new_start != old.start_date or new_end != old.end_date)

        new_seq = old.sequence + 1
        activity = serializer.save(sequence=new_seq)

        if activity.approval_status != 'APPROVED':
            _notify_activity_reviewers(activity)
            return

        if is_reschedule:
            _dispatch_notifications(activity, method='REQUEST', extra_message='Schedule has been updated.')
        else:
            recipients = _resolve_recipients(activity)
            start_str = timezone.localtime(activity.start_date).strftime('%d %b %Y %H:%M')
            notify_users(
                recipients=recipients,
                title=f"Activity Updated: {activity.title}",
                message=(
                    f"Details for \"{activity.title}\" ({start_str}) have been updated. "
                    f"Please review the latest information."
                ),
                notification_type='ACTIVITY_UPDATE',
                link='/activities',
                send_email=activity.send_email_reminders,
            )

    def perform_destroy(self, instance):
        if not has_activity_privilege(self.request.user):
            raise PermissionDenied("Activities & Events privilege required.")
        should_notify_cancellation = (
            instance.approval_status == 'APPROVED'
            and instance.status not in {'CANCELLED', 'REJECTED'}
        )
        if should_notify_cancellation:
            instance.status = 'CANCELLED'
            instance.sequence += 1
            instance.save(update_fields=['status', 'sequence'])
            _dispatch_notifications(
                instance,
                method='CANCEL',
                extra_message='This activity has been deleted from the Departmental Management System.',
            )
        instance.delete()

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """Cancel an activity. Body: { reason: str }"""
        activity = self.get_object()
        if not has_activity_privilege(request.user):
            raise PermissionDenied("Activities & Events privilege required.")
        if activity.status == 'CANCELLED':
            return Response({'detail': 'Activity is already cancelled.'}, status=400)

        reason = request.data.get('reason', '')
        activity.status = 'CANCELLED'
        activity.sequence += 1
        activity.save(update_fields=['status', 'sequence'])

        _dispatch_notifications(activity, method='CANCEL', extra_message=reason)
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=['post'], url_path='reschedule')
    def reschedule(self, request, pk=None):
        """
        Reschedule an activity.
        Body: { start_date, end_date, reason }
        """
        activity = self.get_object()
        if not has_activity_privilege(request.user):
            raise PermissionDenied("Activities & Events privilege required.")
        if activity.approval_status != 'APPROVED':
            return Response({'detail': 'Only approved activities can be rescheduled.'}, status=400)
        new_start = request.data.get('start_date')
        new_end = request.data.get('end_date')
        reason = request.data.get('reason', '')

        if not new_start or not new_end:
            return Response({'error': 'start_date and end_date are required.'}, status=400)

        from django.utils.dateparse import parse_datetime
        new_start_dt = parse_datetime(new_start)
        new_end_dt = parse_datetime(new_end)

        if not new_start_dt or not new_end_dt:
            return Response({'error': 'Invalid date format. Use ISO 8601.'}, status=400)
        if new_end_dt <= new_start_dt:
            return Response({'error': 'end_date must be after start_date.'}, status=400)

        activity.start_date = new_start_dt
        activity.end_date = new_end_dt
        activity.status = 'RESCHEDULED'
        activity.sequence += 1
        activity.save(update_fields=['start_date', 'end_date', 'status', 'sequence'])

        _dispatch_notifications(activity, method='REQUEST', extra_message=reason or 'Activity has been rescheduled.')
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        activity = self.get_object()
        if not has_activity_privilege(request.user):
            raise PermissionDenied("Activities & Events privilege required.")
        if activity.organizer_id == request.user.id:
            raise PermissionDenied("You cannot approve your own activity submission.")
        if activity.approval_status != 'PENDING':
            raise ValidationError({'approval_status': 'Only pending activities can be approved.'})

        activity.approval_status = 'APPROVED'
        activity.status = 'SCHEDULED'
        activity.reviewed_by = request.user
        activity.reviewed_at = timezone.now()
        activity.rejection_reason = ''
        activity.sequence += 1
        activity.save(update_fields=[
            'approval_status',
            'status',
            'reviewed_by',
            'reviewed_at',
            'rejection_reason',
            'sequence',
        ])

        notify_user(
            activity.organizer,
            title='Activity approved',
            message=f'Your activity "{activity.title}" has been approved and scheduled.',
            notification_type='ACTIVITY_APPROVED',
            link='/activities',
            send_email=True,
        )
        _dispatch_notifications(activity, method='REQUEST')
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        activity = self.get_object()
        if not has_activity_privilege(request.user):
            raise PermissionDenied("Activities & Events privilege required.")
        if activity.organizer_id == request.user.id:
            raise PermissionDenied("You cannot reject your own activity submission.")
        if activity.approval_status != 'PENDING':
            raise ValidationError({'approval_status': 'Only pending activities can be rejected.'})

        reason = str(request.data.get('reason') or '').strip()
        if not reason:
            raise ValidationError({'reason': 'A rejection reason is required.'})

        activity.approval_status = 'REJECTED'
        activity.status = 'REJECTED'
        activity.reviewed_by = request.user
        activity.reviewed_at = timezone.now()
        activity.rejection_reason = reason
        activity.save(update_fields=['approval_status', 'status', 'reviewed_by', 'reviewed_at', 'rejection_reason'])

        notify_user(
            activity.organizer,
            title='Activity rejected',
            message=f'Your activity "{activity.title}" was rejected. Reason: {reason}',
            notification_type='ACTIVITY_REJECTED',
            link='/activities',
            send_email=True,
        )
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=['get'], url_path='participants')
    def participants_roster(self, request, pk=None):
        """
        Return the resolved, deduplicated list of participants for this activity,
        including user details and how they were included (group, individual, all staff).
        """
        activity = self.get_object()
        roster = []
        seen_user_ids = set()

        if activity.include_all_staff:
            for u in User.objects.filter(is_active=True).order_by('username'):
                roster.append({
                    'id': u.id,
                    'username': u.username,
                    'email': u.email,
                    'name': f"{u.first_name} {u.last_name}".strip() or u.username,
                    'role': u.get_role_display(),
                    'source': 'All Staff',
                })
                seen_user_ids.add(u.id)
        else:
            # Check groups
            for grp in activity.recipient_groups.filter(is_active=True):
                for u in grp.members.filter(is_active=True):
                    if u.id not in seen_user_ids:
                        roster.append({
                            'id': u.id,
                            'username': u.username,
                            'email': u.email,
                            'name': f"{u.first_name} {u.last_name}".strip() or u.username,
                            'role': u.get_role_display(),
                            'source': f'Group: {grp.name}',
                        })
                        seen_user_ids.add(u.id)

            # Check individual participants
            for u in activity.participants.filter(is_active=True):
                if u.id not in seen_user_ids:
                    roster.append({
                        'id': u.id,
                        'username': u.username,
                        'email': u.email,
                        'name': f"{u.first_name} {u.last_name}".strip() or u.username,
                        'role': u.get_role_display(),
                        'source': 'Individual',
                    })
                    seen_user_ids.add(u.id)

            for category in activity.participant_categories.all():
                for u in category.users.filter(is_active=True):
                    if u.id not in seen_user_ids:
                        roster.append({
                            'id': u.id,
                            'username': u.username,
                            'email': u.email,
                            'name': f"{u.first_name} {u.last_name}".strip() or u.username,
                            'role': u.get_role_display(),
                            'source': f'Category: {category.name}',
                        })
                        seen_user_ids.add(u.id)

        # External participants
        ext_emails = _resolve_external_recipients(activity, roster)
        external_list = [{'email': e, 'source': 'External Email'} for e in ext_emails]

        return Response({
            'activity_id': activity.id,
            'title': activity.title,
            'total_unique_dms': len(roster),
            'total_external': len(external_list),
            'dms_participants': roster,
            'external_participants': external_list,
        })
