from django.db import migrations, models


def grant_existing_admins_control(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(role='ADMIN').update(has_control_privilege=True)


def reverse_grant_existing_admins_control(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(role='ADMIN', is_superuser=False).update(has_control_privilege=False)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_alter_notification_notification_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='has_control_privilege',
            field=models.BooleanField(
                default=False,
                help_text='Grants privilege to access Control & Access and manage user accounts.',
            ),
        ),
        migrations.RunPython(grant_existing_admins_control, reverse_grant_existing_admins_control),
    ]
