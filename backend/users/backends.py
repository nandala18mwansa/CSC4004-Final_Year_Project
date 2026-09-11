from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()

class PhysicalDbAuthBackend(ModelBackend):
    """
    Custom authentication backend that supports Django's standard hashed passwords
    as well as plain-text passwords modified physically in the database.
    Automatically upgrades plain-text passwords to secure Django hashes upon successful login.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return None

        # 1. Standard Django hash check
        if user.check_password(password):
            return user if self.user_can_authenticate(user) else None

        # 2. Fallback check for plain-text password set physically in MySQL
        if user.password == password or (user.password and user.password.strip() == password.strip()):
            if self.user_can_authenticate(user):
                # Automatically hash plain-text password in DB
                user.set_password(password)
                user.save(update_fields=['password'])
                return user

        return None
