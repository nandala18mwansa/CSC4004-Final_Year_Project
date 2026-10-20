from django.db import migrations


def normalize_rooms_category(apps, schema_editor):
    Resource = apps.get_model('resources', 'Resource')
    ResourceCategory = apps.get_model('resources', 'ResourceCategory')

    canonical = ResourceCategory.objects.filter(name__iexact='Rooms').first()
    legacy = ResourceCategory.objects.filter(name__iexact='Rooms & Venues').first()

    if canonical is None and legacy is not None:
        legacy.name = 'Rooms'
        legacy.save(update_fields=['name'])
        canonical = legacy
        legacy = None
    elif canonical is None:
        canonical = ResourceCategory.objects.create(
            name='Rooms',
            description='Fixed rooms and venues that users can reserve.',
        )

    # If both names already exist, consolidate references without losing the
    # existing room records or category assignments.
    if legacy is not None and legacy.pk != canonical.pk:
        Resource.objects.filter(category_id=legacy.pk).update(category_id=canonical.pk)
        if not canonical.description and legacy.description:
            canonical.description = legacy.description
        if canonical.manager_id is None and legacy.manager_id is not None:
            canonical.manager_id = legacy.manager_id
        canonical.save(update_fields=['description', 'manager'])
        legacy.delete()

    Resource.objects.filter(category_id=canonical.pk).update(is_portable=False)


class Migration(migrations.Migration):
    dependencies = [
        ('resources', '0008_alter_allocation_status'),
    ]

    operations = [
        migrations.RunPython(normalize_rooms_category, migrations.RunPython.noop),
    ]
