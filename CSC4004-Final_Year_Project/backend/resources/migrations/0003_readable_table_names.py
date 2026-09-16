from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('resources', '0002_resource_category'),
    ]

    operations = [
        migrations.AlterModelTable(
            name='resource',
            table='resources',
        ),
        migrations.AlterModelTable(
            name='allocation',
            table='allocations',
        ),
    ]
