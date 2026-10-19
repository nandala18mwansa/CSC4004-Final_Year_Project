from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0010_user_has_announcement_archive'),
    ]

    operations = [
        migrations.AddField(
            model_name='announcement',
            name='shared_modules',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
