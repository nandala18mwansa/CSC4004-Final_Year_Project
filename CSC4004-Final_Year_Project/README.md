# Departmental Management System (DMS)

The **Departmental Management System (DMS)** is a web-based system developed to support the management of departmental finances, resources, activities, approvals, notifications, and user access within the University of Zambia.

The system provides a centralized platform for departmental staff and administrators to manage operational activities through clearly separated modules while enforcing role-based and privilege-based access.

---

## Main Features

### Corporate Dashboard

The dashboard provides a high-level overview of departmental operations.

It displays information such as:

- Available departmental budget
- Approved expenditure
- Resource availability
- Pending approvals
- Upcoming activities
- Recent departmental activity
- Items requiring administrative attention

Dashboard content is permission-aware, meaning users only see information they are authorized to access.

---

## Finance & Budgets

The Finance module supports departmental financial management.

Main functions include:

- Departmental budget management
- Adding funds to budgets
- Expense request submission
- Expense approval and rejection
- Refund and adjustment tracking
- Financial transaction ledger
- Budget utilization monitoring
- Financial summary requests
- Financial statement generation
- PDF financial reports
- Excel financial reports
- CSV financial reports
- Financial report history
- Finance notifications

Financial statements include:

- Opening Balance
- Funds Added
- Approved Expenditure
- Refunds/Reversals
- Adjustments
- Net Movement
- Closing Balance
- Detailed transaction ledger

Access to the overall department financial balance can be controlled separately through the **Balance View** permission.

---

## Resources & Assets

The Resources & Assets module manages departmental equipment, assets, locations, allocations and booking requests.

The module is divided into:

- Overview
- Resource Register
- Booking Requests
- Allocations

Main functions include:

- Add individual resources
- Bulk add resources
- Import resource records
- Resource category management
- Resource status management
- Resource condition management
- Room/location assignment
- Portable-resource support
- Resource allocation and reassignment
- Resource booking requests
- Booking approval and rejection
- Resource availability checking
- Resource register generation
- PDF resource register export
- Allocation history

The system supports large numbers of resources and booking requests through separate views and scalable tables.

---

## Activities & Events

The Activities & Events module supports departmental meetings, events and scheduled activities.

Main functions include:

- Create departmental activities
- Define and manage activity types
- Add participants
- Select participant groups
- Add external participant email addresses
- Activity approval and rejection
- Activity cancellation
- Activity deletion by authorized administrators
- Upcoming activity tracking
- Participant roster viewing
- Email notifications
- In-app notifications
- Google Calendar related scheduling support

Activities can be reviewed by authorized users before being fully scheduled.

Authorized administrators can also delete activities where necessary.

---

## Notifications

The DMS includes an in-app notification system.

Notifications may be generated for events such as:

- Expense approvals
- Expense rejections
- Activity approvals
- Activity rejections
- Resource booking approvals
- Resource booking rejections
- Financial report availability
- Scheduled activities
- Administrative actions

Email notifications are also supported through SMTP.

---

## Email / SMTP Support

The backend supports SMTP email delivery.

The current development configuration supports Gmail SMTP using a Google App Password.

Example environment variables:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True

EMAIL_HOST_USER=dms_email@gmail.com
EMAIL_HOST_PASSWORD=google_app_password_associated_with_the_dms_email

DEFAULT_FROM_EMAIL=Departmental Management System <dms_email@gmail.com>

FRONTEND_URL=http://127.0.0.1:5173
