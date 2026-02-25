from django.urls import path
from .views import CategoryAnalysisView, MonthlySummaryView, SpendingAnomalyView

urlpatterns = [
    path('monthly-summary/', MonthlySummaryView.as_view()),
    path('category-analysis/', CategoryAnalysisView.as_view()),
    path('spending-anomalies/', SpendingAnomalyView.as_view()),

]