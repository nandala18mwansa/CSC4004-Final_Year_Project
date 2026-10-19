import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
import users.models


def seed_announcement_categories(apps, schema_editor):
    Announcement = apps.get_model('users', 'Announcement')
    Category = apps.get_model('users', 'AnnouncementCategory')
    names = {'GENERAL'}
    names.update(
        value.strip()
        for value in Announcement.objects.exclude(category__isnull=True).values_list('category', flat=True)
        if value and value.strip()
    )
    for name in sorted(names):
        if not Category.objects.filter(name__iexact=name).exists():
            Category.objects.create(name=name[:40])


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0011_announcement_shared_modules'),
    ]

    operations = [
        migrations.CreateModel(
            name='AnnouncementCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=40, unique=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'announcement_categories',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='AnnouncementAttachment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(storage=users.models.PrivateAnnouncementStorage(), upload_to=users.models.announcement_attachment_path)),
                ('original_filename', models.CharField(max_length=255)),
                ('content_type', models.CharField(max_length=100)),
                ('size', models.PositiveIntegerField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('announcement', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='users.announcement')),
                ('uploaded_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='uploaded_announcement_attachments', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'announcement_attachments',
                'ordering': ['created_at', 'id'],
            },
        ),
        migrations.RunPython(seed_announcement_categories, migrations.RunPython.noop),
    ]
