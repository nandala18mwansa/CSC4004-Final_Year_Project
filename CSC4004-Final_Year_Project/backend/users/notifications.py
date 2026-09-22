import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from .models import Notification, User

logger = logging.getLogger(__name__)


def notify_user(
    recipient,
    title,
    message,
    notification_type="GENERAL",
    link=None,
    send_email=True,
    ics_content=None,
    ics_method="REQUEST",
    ics_filename="invite.ics",
):
    """
    Creates an in-app Notification record for the recipient and optionally
    sends an email notification. Gracefully handles email failure so the
    underlying business action (e.g., expense approval) is never disrupted.
    """
    if not recipient:
        return None

    # 1. Always create the in-app notification record
    notif = Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        link=link or "",
    )

    # 2. Optionally deliver via email if recipient has a registered email address
    if send_email and getattr(recipient, "email", None):
        try:
            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@department.local")
            email_msg = EmailMultiAlternatives(
                subject=f"[DMS] {title}",
                body=f"Hello {recipient.username},\n\n{message}\n\nDepartmental Management System (DMS)",
                from_email=from_email,
                to=[recipient.email],
            )
            if ics_content:
                email_msg.attach(
                    ics_filename,
                    ics_content,
                    f"text/calendar; method={ics_method}; charset=UTF-8",
                )
            email_msg.send(fail_silently=True)
        except Exception as e:
            logger.warning(f"DMS email delivery failed for user {recipient.username} ({recipient.email}): {e}")

    return notif


def notify_users(
    recipients,
    title,
    message,
    notification_type="GENERAL",
    link=None,
    send_email=True,
    ics_content=None,
    ics_method="REQUEST",
    ics_filename="invite.ics",
):
    """
    Sends notifications to multiple recipients, automatically deduplicating them.
    """
    seen_ids = set()
    created_notifs = []

    for r in recipients:
        if not r or r.id in seen_ids:
            continue
        seen_ids.add(r.id)
        notif = notify_user(
            recipient=r,
            title=title,
            message=message,
            notification_type=notification_type,
            link=link,
            send_email=send_email,
            ics_content=ics_content,
            ics_method=ics_method,
            ics_filename=ics_filename,
        )
        if notif:
            created_notifs.append(notif)

    return created_notifs


def notify_role(
    role,
    title,
    message,
    notification_type="GENERAL",
    link=None,
    send_email=True,
):
    """
    Finds all active users with the given role (e.g. 'ADMIN', 'MANAGER')
    and notifies them.
    """
    users = User.objects.filter(role=role, is_active=True)
    return notify_users(
        recipients=users,
        title=title,
        message=message,
        notification_type=notification_type,
        link=link,
        send_email=send_email,
    )
