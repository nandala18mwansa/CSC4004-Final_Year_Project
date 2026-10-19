from django.utils import timezone

from .models import Allocation, Resource, ResourceStatusHistory


NON_MANAGEABLE_STATUSES = {'UNAVAILABLE', 'MAINTENANCE', 'UNDER_REPAIR', 'RETIRED'}


def synchronize_reservation_status(resource, actor=None, notes=''):
    """Keep the stored asset status aligned with its approved reservations."""
    resource = Resource.objects.select_for_update().get(pk=resource.pk)
    if resource.status in NON_MANAGEABLE_STATUSES:
        return resource

    has_approved_reservation = Allocation.objects.filter(
        resource=resource,
        status='APPROVED',
        end_time__gt=timezone.now(),
    ).exists()
    if has_approved_reservation:
        new_status = 'BOOKED' if resource.is_portable else 'IN_USE'
    elif resource.condition == 'UNDER_REPAIR':
        new_status = 'UNDER_REPAIR'
    elif resource.condition == 'DAMAGED':
        new_status = 'UNAVAILABLE'
    else:
        new_status = 'AVAILABLE'

    if resource.status != new_status:
        ResourceStatusHistory.objects.create(
            resource=resource,
            previous_status=resource.status,
            new_status=new_status,
            changed_by=actor,
            notes=notes or 'Updated from approved resource reservations.',
        )
        resource.status = new_status
        resource.save(update_fields=['status'])
    return resource
