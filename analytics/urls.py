from django.urls import path
from .views import CategoryAnalysisView, MonthlySummaryView, SpendingAnomalyView, ExpenseForecastView

urlpatterns = [
    path('monthly-summary/', MonthlySummaryView.as_view()),
    path('category-analysis/', CategoryAnalysisView.as_view()),
    path('spending-anomalies/', SpendingAnomalyView.as_view()),
    path('expense-forecast/', ExpenseForecastView.as_view()),
]