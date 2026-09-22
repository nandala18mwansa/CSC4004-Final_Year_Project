import csv
import io
import re

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.http import HttpResponse
from django.utils import timezone

from users.permissions import IsOwnerOrAdminOrManager, has_resource_privilege
from .models import (
    Resource, ResourceCategory, Allocation,
    ResourceLocationHistory, ResourceInspection, ResourceStatusHistory,
)
from .serializers import ResourceSerializer, ResourceCategorySerializer, AllocationSerializer
from users.models import User
from users.notifications import notify_user, notify_users


def can_manage_resource_category(user, category):
    if not user or not user.is_authenticated:
        return False
    if has_resource_privilege(user):
        return True
    return bool(category and category.manager_id == user.id)


def _resource_reviewers():
    return User.objects.filter(is_active=True, has_resource_privilege=True)


def _resource_report_queryset(user):
    if has_resource_privilege(user):
        return Resource.objects.select_related('category', 'assigned_room').all()
    managed_categories = ResourceCategory.objects.filter(manager=user)
    if managed_categories.exists():
        return Resource.objects.select_related('category', 'assigned_room').filter(category__in=managed_categories)
    raise PermissionDenied("Resources & Assets reporting privilege required.")


class ResourceCategoryViewSet(viewsets.ModelViewSet):
    queryset = ResourceCategory.objects.select_related('manager').all().order_by('name')
    serializer_class = ResourceCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if has_resource_privilege(user):
            return queryset
        return queryset

    def perform_create(self, serializer):
        if not has_resource_privilege(self.request.user):
            raise PermissionDenied("Resources & Assets privilege required.")
        serializer.save()

    def perform_update(self, serializer):
        if not has_resource_privilege(self.request.user):
            raise PermissionDenied("Resources & Assets privilege required.")
        serializer.save()


class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.select_related('category', 'category__manager', 'assigned_room').all()
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if has_resource_privilege(user):
            return queryset
        return queryset

    def perform_create(self, serializer):
        category = serializer.validated_data.get('category')
        if not can_manage_resource_category(self.request.user, category):
            raise PermissionDenied("You can only add resources under categories assigned to you.")
        serializer.save()

    def perform_update(self, serializer):
        category = serializer.validated_data.get('category') or self.get_object().category
        if not can_manage_resource_category(self.request.user, category):
            raise PermissionDenied("You can only manage resources under categories assigned to you.")
        serializer.save()

    def perform_destroy(self, instance):
        if not can_manage_resource_category(self.request.user, instance.category):
            raise PermissionDenied("You can only delete resources under categories assigned to you.")
        instance.delete()

    # ─────────────────────────────────────────────────
    # Bulk Create: POST /api/resources/bulk-create/
    # ─────────────────────────────────────────────────
    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        """
        Generate sequential assets, e.g. COMP-001 to COMP-200.
        Body: { prefix, start_number, quantity, category_id, condition, location, is_portable }
        """
        if not has_resource_privilege(request.user):
            raise PermissionDenied("Resources & Assets privilege required.")

        prefix = str(request.data.get('prefix', '')).strip().upper()
        start_number = int(request.data.get('start_number', 1))
        quantity = int(request.data.get('quantity', 1))
        category_id = request.data.get('category_id')
        condition = request.data.get('condition', 'GOOD')
        location = request.data.get('location', '')
        is_portable = bool(request.data.get('is_portable', False))
        description = request.data.get('description', '')

        if not prefix:
            return Response({'error': 'prefix is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if quantity < 1 or quantity > 500:
            return Response({'error': 'quantity must be between 1 and 500.'}, status=status.HTTP_400_BAD_REQUEST)

        category = None
        if category_id:
            try:
                category = ResourceCategory.objects.get(pk=category_id)
            except ResourceCategory.DoesNotExist:
                return Response({'error': 'Invalid category_id.'}, status=status.HTTP_400_BAD_REQUEST)

        if category and not can_manage_resource_category(request.user, category):
            raise PermissionDenied("You can only add resources under categories assigned to you.")

        # Determine zero-padding width based on end number
        end_number = start_number + quantity - 1
        pad_width = max(3, len(str(end_number)))

        created = []
        skipped = []
        for n in range(start_number, end_number + 1):
            resource_id = f"{prefix}-{str(n).zfill(pad_width)}"
            if Resource.objects.filter(resource_id=resource_id).exists():
                skipped.append(resource_id)
                continue
            r = Resource.objects.create(
                resource_id=resource_id,
                name=f"{prefix}-{str(n).zfill(pad_width)}",
                category=category,
                condition=condition,
                location=location,
                is_portable=is_portable,
                description=description,
                status='AVAILABLE',
            )
            if location:
                ResourceLocationHistory.objects.create(
                    resource=r,
                    previous_location='',
                    new_location=location,
                    changed_by=request.user,
                    notes=f"Bulk creation ({quantity} assets)",
                )
            created.append(resource_id)

        return Response({
            'created_count': len(created),
            'skipped_count': len(skipped),
            'skipped_ids': skipped[:20],  # Return first 20 skipped for display
            'message': f"{len(created)} asset(s) created; {len(skipped)} skipped (already exist).",
        })

    # ─────────────────────────────────────────────────
    # Import Template: GET /api/resources/import-template/
    # ─────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='import-template')
    def import_template(self, request):
        """Download a CSV import template."""
        if not has_resource_privilege(request.user):
            raise PermissionDenied("Resources & Assets privilege required.")
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            'resource_id', 'name', 'category_name', 'condition',
            'location', 'is_portable', 'description',
        ])
        writer.writerow([
            'COMP-001', 'Desktop Computer', 'Computers', 'GOOD',
            'Lab 1', 'No', 'Example resource',
        ])
        csv_bytes = buf.getvalue().encode('utf-8-sig')
        response = HttpResponse(csv_bytes, content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="DMS_Resource_Import_Template.csv"'
        return response

    # ─────────────────────────────────────────────────
    # Import Resources: POST /api/resources/import/
    # ─────────────────────────────────────────────────
    @action(detail=False, methods=['post'], url_path='import')
    def import_resources(self, request):
        """
        Accept CSV or XLSX file and create resources from each row.
        Returns: { created, skipped, errors }
        """
        if not has_resource_privilege(request.user):
            raise PermissionDenied("Resources & Assets privilege required.")

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        filename = file_obj.name.lower()
        created = []
        skipped = []
        errors = []

        try:
            if filename.endswith('.csv'):
                rows = _parse_csv(file_obj)
            elif filename.endswith('.xlsx'):
                rows = _parse_xlsx(file_obj)
            else:
                return Response({'error': 'Only .csv and .xlsx files are supported.'}, status=400)

            for row_num, row in enumerate(rows, start=2):
                result = _import_row(row, request.user, row_num)
                if result['status'] == 'created':
                    created.append(result['resource_id'])
                elif result['status'] == 'skipped':
                    skipped.append(result['resource_id'])
                else:
                    errors.append(result['error'])

        except Exception as e:
            return Response({'error': f'Failed to parse file: {str(e)}'}, status=400)

        return Response({
            'created_count': len(created),
            'skipped_count': len(skipped),
            'error_count': len(errors),
            'created': created,
            'skipped': skipped,
            'errors': errors[:20],
        })

    # ─────────────────────────────────────────────────
    # Bulk Assign Location: POST /api/resources/bulk-assign-location/
    # ─────────────────────────────────────────────────
    @action(detail=False, methods=['post'], url_path='bulk-assign-location')
    def bulk_assign_location(self, request):
        """
        Assign a new location to multiple resources at once.
        Body: { resource_ids: [int, ...], location: str, notes: str }
        """
        if not has_resource_privilege(request.user):
            raise PermissionDenied("Resources & Assets privilege required.")

        resource_ids = request.data.get('resource_ids', [])
        new_location = str(request.data.get('location', '')).strip()
        notes = request.data.get('notes', '')

        if not resource_ids:
            return Response({'error': 'resource_ids is required.'}, status=400)
        if not new_location:
            return Response({'error': 'location is required.'}, status=400)

        resources = Resource.objects.filter(pk__in=resource_ids)
        updated = 0
        for r in resources:
            if not can_manage_resource_category(request.user, r.category):
                continue
            ResourceLocationHistory.objects.create(
                resource=r,
                previous_location=r.location,
                new_location=new_location,
                changed_by=request.user,
                notes=notes or f"Bulk location assignment to: {new_location}",
            )
            r.location = new_location
            r.save(update_fields=['location'])
            updated += 1

        return Response({'updated_count': updated, 'location': new_location})

    # ─────────────────────────────────────────────────
    # Record Inspection: POST /api/resources/{id}/record-inspection/
    # ─────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='record-inspection')
    def record_inspection(self, request, pk=None):
        """
        Record a condition inspection and update resource condition.
        Body: { current_condition, remarks }
        """
        resource = self.get_object()
        if not can_manage_resource_category(request.user, resource.category):
            raise PermissionDenied("You can only inspect resources you manage.")
        current_condition = request.data.get('current_condition')
        remarks = request.data.get('remarks', '')

        valid_conditions = [c[0] for c in Resource.CONDITION_CHOICES]
        if current_condition not in valid_conditions:
            return Response(
                {'error': f'Invalid condition. Choices: {valid_conditions}'},
                status=400,
            )

        previous = resource.condition
        ResourceInspection.objects.create(
            resource=resource,
            previous_condition=previous,
            current_condition=current_condition,
            remarks=remarks,
            inspected_by=request.user,
        )
        resource.condition = current_condition
        update_fields = ['condition']
        if current_condition == 'UNDER_REPAIR' and resource.status == 'AVAILABLE':
            ResourceStatusHistory.objects.create(
                resource=resource,
                previous_status=resource.status,
                new_status='UNDER_REPAIR',
                changed_by=request.user,
                notes='Status updated automatically because inspection marked the resource under repair.',
            )
            resource.status = 'UNDER_REPAIR'
            update_fields.append('status')
        elif current_condition == 'DAMAGED' and resource.status == 'AVAILABLE':
            ResourceStatusHistory.objects.create(
                resource=resource,
                previous_status=resource.status,
                new_status='UNAVAILABLE',
                changed_by=request.user,
                notes='Status updated automatically because inspection marked the resource damaged.',
            )
            resource.status = 'UNAVAILABLE'
            update_fields.append('status')
        resource.save(update_fields=update_fields)

        return Response({
            'resource_id': resource.resource_id,
            'previous_condition': previous,
            'current_condition': current_condition,
            'remarks': remarks,
        })

    # ─────────────────────────────────────────────────
    # Location History: GET /api/resources/{id}/location-history/
    # ─────────────────────────────────────────────────
    @action(detail=True, methods=['get'], url_path='location-history')
    def location_history(self, request, pk=None):
        resource = self.get_object()
        history = resource.location_history.select_related('changed_by').order_by('-changed_at')
        data = [
            {
                'id': h.id,
                'previous_location': h.previous_location,
                'new_location': h.new_location,
                'changed_by': h.changed_by.username if h.changed_by else None,
                'changed_at': h.changed_at.isoformat(),
                'notes': h.notes,
            }
            for h in history
        ]
        return Response(data)

    # ─────────────────────────────────────────────────
    # Inspection History: GET /api/resources/{id}/inspection-history/
    # ─────────────────────────────────────────────────
    @action(detail=True, methods=['get'], url_path='inspection-history')
    def inspection_history(self, request, pk=None):
        resource = self.get_object()
        inspections = resource.inspections.select_related('inspected_by').order_by('-inspection_date', '-created_at')
        data = [
            {
                'id': insp.id,
                'previous_condition': insp.previous_condition,
                'current_condition': insp.current_condition,
                'inspection_date': str(insp.inspection_date),
                'remarks': insp.remarks,
                'inspected_by': insp.inspected_by.username if insp.inspected_by else None,
                'created_at': insp.created_at.isoformat(),
            }
            for insp in inspections
        ]
        return Response(data)

    # ─────────────────────────────────────────────────
    # Export Report: GET /api/resources/export-report/?format=PDF&category=X
    # ─────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='export-report')
    def export_report(self, request):
        return self._resource_register_response(request)

    @action(detail=False, methods=['get'], url_path='report')
    def report(self, request):
        return self._resource_register_response(request)

    def _resource_register_response(self, request):
        from rest_framework import status as drf_status

        from .reports import generate_pdf, generate_excel, generate_csv, report_filename

        fmt = (
            request.query_params.get('export_format')
            or request.query_params.get('file_format')
            or request.query_params.get('format')
            or 'PDF'
        ).upper()
        category_id = request.query_params.get('category')
        status_filter = request.query_params.get('status')
        condition_filter = request.query_params.get('condition')

        qs = _resource_report_queryset(request.user)
        category_label = "All Categories"
        if category_id:
            try:
                category = ResourceCategory.objects.get(pk=category_id)
            except ResourceCategory.DoesNotExist:
                return Response({'error': 'Invalid resource category filter.'}, status=drf_status.HTTP_400_BAD_REQUEST)
            if not has_resource_privilege(request.user) and category.manager_id != request.user.id:
                raise PermissionDenied("You do not have permission to report on this resource category.")
            qs = qs.filter(category=category)
            category_label = category.name
        if status_filter:
            qs = qs.filter(status=status_filter)
        if condition_filter:
            qs = qs.filter(condition=condition_filter)
        if not qs.exists():
            return Response({'error': 'No resources were found for the selected category.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        generated_by = request.user.username
        filename_suffix = 'Resource_Register' if category_label == 'All Categories' else f'Resource_Register_{category_label}'
        filename = report_filename(fmt, filename_suffix)

        if fmt == 'PDF':
            content = generate_pdf(qs, generated_by=generated_by, category_filter=category_label)
            resp = HttpResponse(content, content_type='application/pdf')
            resp['Content-Disposition'] = f'attachment; filename="{filename}"'
        elif fmt in ('EXCEL', 'XLSX'):
            content = generate_excel(qs, generated_by=generated_by, category_filter=category_label)
            resp = HttpResponse(
                content,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            fn = report_filename('EXCEL', filename_suffix)
            resp['Content-Disposition'] = f'attachment; filename="{fn}"'
        elif fmt == 'CSV':
            content = generate_csv(qs)
            resp = HttpResponse(content, content_type='text/csv; charset=utf-8-sig')
            resp['Content-Disposition'] = f'attachment; filename="{filename}"'
        else:
            return Response({'error': f'Unsupported format: {fmt}'}, status=400)

        return resp

    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, pk=None):
        resource = self.get_object()
        if not can_manage_resource_category(request.user, resource.category):
            raise PermissionDenied("You can only change status for resources you manage.")

        new_status = request.data.get('status')
        notes = str(request.data.get('notes') or '').strip()
        valid_statuses = [choice[0] for choice in Resource.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Choices: {valid_statuses}'}, status=400)
        if new_status == 'AVAILABLE' and resource.condition in {'UNDER_REPAIR', 'DAMAGED'}:
            return Response(
                {'error': 'A resource under repair or damaged cannot be marked Available.'},
                status=400,
            )

        previous = resource.status
        if previous != new_status:
            ResourceStatusHistory.objects.create(
                resource=resource,
                previous_status=previous,
                new_status=new_status,
                changed_by=request.user,
                notes=notes,
            )
            resource.status = new_status
            resource.save(update_fields=['status'])

        affected = 0
        if new_status != 'AVAILABLE':
            affected = resource.allocations.filter(
                status='APPROVED',
                start_time__gte=timezone.now(),
            ).count()

        return Response({
            'resource': ResourceSerializer(resource).data,
            'previous_status': previous,
            'new_status': new_status,
            'affected_future_bookings': affected,
        })

    @action(detail=True, methods=['get'], url_path='status-history')
    def status_history(self, request, pk=None):
        resource = self.get_object()
        history = resource.status_history.select_related('changed_by').order_by('-changed_at')
        return Response([
            {
                'id': h.id,
                'previous_status': h.previous_status,
                'new_status': h.new_status,
                'changed_by': h.changed_by.username if h.changed_by else None,
                'changed_at': h.changed_at.isoformat(),
                'notes': h.notes,
            }
            for h in history
        ])


# ─────────────────────────────────────────────────────────────────────────────
# Import helpers
# ─────────────────────────────────────────────────────────────────────────────

def _parse_csv(file_obj):
    """Parse CSV file, return list of dicts."""
    text = file_obj.read().decode('utf-8-sig', errors='replace')
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


def _parse_xlsx(file_obj):
    """Parse XLSX file, return list of dicts."""
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(file_obj.read()), data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h).strip() if h else '' for h in rows[0]]
    result = []
    for row in rows[1:]:
        if any(cell is not None for cell in row):
            result.append({headers[i]: (str(v).strip() if v is not None else '') for i, v in enumerate(row)})
    return result


def _import_row(row, user, row_num):
    """Process a single import row dict. Returns { status, resource_id } or { status: error, error }."""
    resource_id = str(row.get('resource_id', '')).strip()
    name = str(row.get('name', '')).strip()
    category_name = str(row.get('category_name', '')).strip()
    condition = str(row.get('condition', 'GOOD')).strip().upper()
    location = str(row.get('location', '')).strip()
    is_portable_raw = str(row.get('is_portable', 'No')).strip().lower()
    is_portable = is_portable_raw in ('yes', 'true', '1')
    description = str(row.get('description', '')).strip()

    if not resource_id:
        return {'status': 'error', 'error': f'Row {row_num}: resource_id is required.'}
    if not name:
        return {'status': 'error', 'error': f'Row {row_num}: name is required.'}

    valid_conditions = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'UNDER_REPAIR']
    if condition not in valid_conditions:
        condition = 'GOOD'

    if Resource.objects.filter(resource_id=resource_id).exists():
        return {'status': 'skipped', 'resource_id': resource_id}

    category = None
    if category_name:
        category, _ = ResourceCategory.objects.get_or_create(name=category_name)

    r = Resource.objects.create(
        resource_id=resource_id,
        name=name,
        category=category,
        condition=condition,
        location=location,
        is_portable=is_portable,
        description=description,
        status='AVAILABLE',
    )
    if location:
        ResourceLocationHistory.objects.create(
            resource=r,
            previous_location='',
            new_location=location,
            changed_by=user,
            notes='Imported via file upload',
        )
    return {'status': 'created', 'resource_id': resource_id}


class AllocationViewSet(viewsets.ModelViewSet):
    queryset = Allocation.objects.all()
    serializer_class = AllocationSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdminOrManager]

    def get_queryset(self):
        qs = Allocation.objects.select_related('resource', 'allocated_to', 'activity', 'reviewed_by')
        if has_resource_privilege(self.request.user):
            return qs
        return qs.filter(allocated_to=self.request.user)

    def perform_create(self, serializer):
        allocated_to = self.request.user
        if has_resource_privilege(self.request.user) and 'allocated_to' in self.request.data:
            try:
                allocated_to_id = self.request.data.get('allocated_to')
                if allocated_to_id:
                    allocated_to = User.objects.get(id=allocated_to_id)
            except User.DoesNotExist:
                pass
        booking = serializer.save(allocated_to=allocated_to, status='PENDING')
        reviewers = _resource_reviewers().exclude(id=booking.allocated_to_id)
        notify_users(
            recipients=reviewers,
            title='New resource booking request',
            message=f'{booking.allocated_to.username} requested {booking.resource.name} from {booking.start_time} to {booking.end_time}.',
            notification_type='RESOURCE_BOOKING',
            link='/resources',
            send_email=True,
        )

    def _require_resource_reviewer(self, booking):
        if not has_resource_privilege(self.request.user):
            raise PermissionDenied("Resources & Assets privilege required.")
        if booking.allocated_to_id == self.request.user.id:
            raise PermissionDenied("You cannot approve or reject your own resource booking.")

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        booking = self.get_object()
        self._require_resource_reviewer(booking)
        if booking.status != 'PENDING':
            return Response({'detail': 'Only pending bookings can be approved.'}, status=400)
        if booking.resource.status != 'AVAILABLE':
            return Response({'resource': 'This resource is no longer available for booking.'}, status=400)
        if booking.resource.condition in {'UNDER_REPAIR', 'DAMAGED'}:
            return Response({'resource': 'This resource condition does not allow booking.'}, status=400)
        conflict = Allocation.objects.filter(
            resource=booking.resource,
            status='APPROVED',
            start_time__lt=booking.end_time,
            end_time__gt=booking.start_time,
        ).exclude(pk=booking.pk).exists()
        if conflict:
            return Response({'resource': 'This resource already has an approved booking for the selected time.'}, status=400)

        booking.status = 'APPROVED'
        booking.reviewed_by = request.user
        booking.reviewed_at = timezone.now()
        booking.rejection_reason = ''
        booking.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'rejection_reason', 'updated_at'])
        notify_user(
            booking.allocated_to,
            title='Resource booking approved',
            message=f'Your booking for {booking.resource.name} has been approved.',
            notification_type='RESOURCE_APPROVED',
            link='/resources',
            send_email=True,
        )
        return Response(AllocationSerializer(booking).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        booking = self.get_object()
        self._require_resource_reviewer(booking)
        if booking.status != 'PENDING':
            return Response({'detail': 'Only pending bookings can be rejected.'}, status=400)
        reason = str(request.data.get('reason') or '').strip()
        if not reason:
            return Response({'reason': 'A rejection reason is required.'}, status=400)
        booking.status = 'REJECTED'
        booking.reviewed_by = request.user
        booking.reviewed_at = timezone.now()
        booking.rejection_reason = reason
        booking.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'rejection_reason', 'updated_at'])
        notify_user(
            booking.allocated_to,
            title='Resource booking rejected',
            message=f'Your booking for {booking.resource.name} was rejected. Reason: {reason}',
            notification_type='RESOURCE_REJECTED',
            link='/resources',
            send_email=True,
        )
        return Response(AllocationSerializer(booking).data)
