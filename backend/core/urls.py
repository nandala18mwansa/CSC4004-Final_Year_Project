from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from finance.views import BudgetViewSet, ExpenseViewSet, ApprovalViewSet
from activities.views import ActivityViewSet
from resources.views import ResourceViewSet, AllocationViewSet
from users.views import RegisterView, ProfileView, UserListView, UserManagementViewSet

router = DefaultRouter()
router.register(r'budgets', BudgetViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'approvals', ApprovalViewSet)
router.register(r'activities', ActivityViewSet)
router.register(r'resources', ResourceViewSet)
router.register(r'allocations', AllocationViewSet)
router.register(r'users-admin', UserManagementViewSet, basename='user-management')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/profile/', ProfileView.as_view(), name='profile'),
    path('api/users/', UserListView.as_view(), name='user-list'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
