from django.urls import path
from .views import KPITargetView, KPIStatusView

urlpatterns = [
    path('targets/', KPITargetView.as_view()),
    path('status/', KPIStatusView.as_view()),
]
