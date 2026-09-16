from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('activities', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelTable(
            name='activity',
            table='activities',
        ),
    ]
