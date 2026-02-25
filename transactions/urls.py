from django.urls import path
from .views import (
    CategoryListCreateView,
    TransactionListCreateView,
    TransactionDeleteView
)

urlpatterns = [
    path('categories/', CategoryListCreateView.as_view()),
    path('', TransactionListCreateView.as_view()),
    path('<int:pk>/', TransactionDeleteView.as_view()),
]