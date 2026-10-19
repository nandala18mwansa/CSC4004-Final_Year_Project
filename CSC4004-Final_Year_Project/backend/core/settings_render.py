"""Render-only settings. Select with DJANGO_SETTINGS_MODULE=core.settings_render."""

import ssl

from django.core.exceptions import ImproperlyConfigured

from .settings import *  # noqa: F403

SECRET_KEY = config('SECRET_KEY')
DEBUG = False
ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', cast=Csv())
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='', cast=Csv())

if DATABASES['default']['ENGINE'] != 'django.db.backends.mysql':
    raise ImproperlyConfigured('Render requires DB_ENGINE=django.db.backends.mysql.')

# The project uses PyMySQL via core/__init__.py. Verify Aiven's CA and hostname.
DATABASES['default']['OPTIONS'] = {
    'ssl': ssl.create_default_context(cafile=config('DB_SSL_CA')),
}

MIDDLEWARE = [MIDDLEWARE[0], 'whitenoise.middleware.WhiteNoiseMiddleware', *MIDDLEWARE[1:]]
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Brevo sends over HTTPS, supported by Render's free web services.
# Enable with EMAIL_BACKEND=anymail.backends.brevo.EmailBackend in Render.
INSTALLED_APPS = [*INSTALLED_APPS, 'anymail']
ANYMAIL = {
    'BREVO_API_KEY': config('BREVO_API_KEY', default=''),
    'REQUESTS_TIMEOUT': 10,
}
