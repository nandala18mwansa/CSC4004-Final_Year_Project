from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from finance.views import BudgetViewSet, ExpenseViewSet, ApprovalViewSet, BudgetTransactionViewSet
from activities.views import ActivityViewSet
from resources.views import ResourceViewSet, AllocationViewSet
from users.views import RegisterView, ProfileView, UserListView, UserManagementViewSet, CustomTokenObtainPairView

router = DefaultRouter()
router.register(r'budgets', BudgetViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'approvals', ApprovalViewSet)
router.register(r'budget-transactions', BudgetTransactionViewSet)
router.register(r'activities', ActivityViewSet)
router.register(r'resources', ResourceViewSet)
router.register(r'allocations', AllocationViewSet)
router.register(r'users-admin', UserManagementViewSet, basename='user-management')

from django.http import JsonResponse

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
            "token": "/api/token/",
            "token_refresh": "/api/token/refresh/",
            "budgets": "/api/budgets/",
            "expenses": "/api/expenses/",
            "approvals": "/api/approvals/",
            "activities": "/api/activities/",
            "resources": "/api/resources/",
            "allocations": "/api/allocations/"
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
]
