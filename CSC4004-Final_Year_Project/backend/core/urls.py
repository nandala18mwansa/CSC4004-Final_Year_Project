"""
DMS Core URL configuration.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static

from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from finance.views import (
    BudgetViewSet,
    ExpenseViewSet,
    ApprovalViewSet,
    BudgetTransactionViewSet,
    FinancialSummaryRequestViewSet,
    FinanceNotificationViewSet,
    FinanceAuditLogViewSet,
)
from activities.views import ActivityViewSet, ActivityTypeViewSet
from resources.views import ResourceViewSet, ResourceCategoryViewSet, AllocationViewSet
from users.views import (
    RegisterView,
    ProfileView,
    UserListView,
    UserManagementViewSet,
    UserGroupCategoryViewSet,
    CustomTokenObtainPairView,
    NotificationViewSet,
    RecipientGroupViewSet,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

router = DefaultRouter()
router.register(r'budgets', BudgetViewSet, basename='budget')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'approvals', ApprovalViewSet)
router.register(r'budget-transactions', BudgetTransactionViewSet, basename='budget-transaction')
router.register(r'financial-summary-requests', FinancialSummaryRequestViewSet, basename='financial-summary-request')
router.register(r'finance-notifications', FinanceNotificationViewSet, basename='finance-notification')
router.register(r'finance-audit-log', FinanceAuditLogViewSet, basename='finance-audit-log')
router.register(r'activity-types', ActivityTypeViewSet, basename='activity-type')
router.register(r'activities', ActivityViewSet, basename='activity')
router.register(r'resource-categories', ResourceCategoryViewSet, basename='resource-category')
router.register(r'resources', ResourceViewSet)
router.register(r'allocations', AllocationViewSet)
router.register(r'users-admin', UserManagementViewSet, basename='user-management')
router.register(r'user-categories', UserGroupCategoryViewSet, basename='user-category')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'recipient-groups', RecipientGroupViewSet, basename='recipient-group')


def api_root_view(request):
    return JsonResponse({
        "system": "Departmental Management System API",
        "status": "Online",
        "endpoints": {
            "admin": "/admin/",
            "api_root": "/api/",
            "register": "/api/register/",
            "profile": "/api/profile/",
            "users": "/api/users/",
            "user_categories": "/api/user-categories/",
            "token": "/api/token/",
            "token_refresh": "/api/token/refresh/",
            "budgets": "/api/budgets/",
            "expenses": "/api/expenses/",
            "approvals": "/api/approvals/",
            "financial_summary_requests": "/api/financial-summary-requests/",
            "activity_types": "/api/activity-types/",
            "activities": "/api/activities/",
            "resources": "/api/resources/",
            "resource_categories": "/api/resource-categories/",
            "allocations": "/api/allocations/",
            "notifications": "/api/notifications/",
            "recipient_groups": "/api/recipient-groups/",
        }
    })


urlpatterns = [
    path('', api_root_view, name='api_root'),
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/profile/', ProfileView.as_view(), name='profile'),
    path('api/users/', UserListView.as_view(), name='user-list'),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('api/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
