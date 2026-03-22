from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum
import calendar
from datetime import timedelta
from transactions.models import Transaction
import numpy as np


class MonthlySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        month = today.month
        year = today.year

        transactions = Transaction.objects.filter(
            user=user,
            date__month=month,
            date__year=year
        )

        total_income = transactions.filter(
            transaction_type='INCOME'
        ).aggregate(Sum('amount'))['amount__sum'] or 0

        total_expense = transactions.filter(
            transaction_type='EXPENSE'
        ).aggregate(Sum('amount'))['amount__sum'] or 0

        days_passed = today.day
        total_days = calendar.monthrange(year, month)[1]

        daily_burn_rate = total_expense / days_passed if days_passed > 0 else 0
        predicted_expense = daily_burn_rate * total_days

        net_savings = total_income - total_expense
        overspending = predicted_expense > total_income

        return Response({
            "month": month,
            "year": year,
            "total_income": total_income,
            "total_expense": total_expense,
            "net_savings": net_savings,
            "daily_burn_rate": round(daily_burn_rate, 2),
            "predicted_month_end_expense": round(predicted_expense, 2),
            "overspending_risk": overspending
        })


class CategoryAnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        month = today.month
        year = today.year

        transactions = Transaction.objects.filter(
            user=user,
            date__month=month,
            date__year=year
        )

        total_income = transactions.filter(
            transaction_type='INCOME'
        ).aggregate(Sum('amount'))['amount__sum'] or 0

        total_expense = transactions.filter(
            transaction_type='EXPENSE'
        ).aggregate(Sum('amount'))['amount__sum'] or 0

        category_data = transactions.filter(
            transaction_type='EXPENSE'
        ).values('category__name').annotate(
            total=Sum('amount')
        ).order_by('-total')

        top_category = category_data[0]['category__name'] if category_data else None

        savings = total_income - total_expense
        savings_ratio = (savings / total_income) if total_income > 0 else 0

        score = 100

        if savings_ratio < 0.2:
            score -= 30
        elif savings_ratio < 0.3:
            score -= 15

        if category_data:
            top_category_amount = category_data[0]['total']
            if total_expense > 0:
                dominance_ratio = top_category_amount / total_expense
                if dominance_ratio > 0.5:
                    score -= 20

        if total_income > 0:
            expense_ratio = total_expense / total_income
            if expense_ratio > 0.9:
                score -= 20

        score = max(score, 0)

        return Response({
            "total_income": total_income,
            "total_expense": total_expense,
            "savings_ratio": round(savings_ratio, 2),
            "top_spending_category": top_category,
            "budget_health_score": score,
            "category_breakdown": category_data
        })


class SpendingAnomalyView(APIView):
    """
    ML Concept: Z-Score Statistical Anomaly Detection

    A Z-score measures how many standard deviations a value is away from the mean.
    Formula: Z = (current_value - mean) / standard_deviation

    If Z > 1.5, the current month's spending in that category is unusually high
    compared to the user's own historical pattern (last 5 months).

    This is better than a simple "30% spike" check because it adapts to each
    user's personal spending habits — someone who varies wildly month to month
    won't get false alarms, while someone consistent will be flagged early.
    """
    permission_classes = [IsAuthenticated]

    def _get_month_offset(self, base_date, months_back):
        """Returns (year, month) for base_date shifted back by months_back months."""
        month = base_date.month - months_back
        year = base_date.year
        while month <= 0:
            month += 12
            year -= 1
        return year, month

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        current_month = today.month
        current_year = today.year

        # Current month expenses per category
        current_data = Transaction.objects.filter(
            user=user,
            transaction_type='EXPENSE',
            date__month=current_month,
            date__year=current_year
        ).values('category__name').annotate(total=Sum('amount'))

        anomalies = []

        for item in current_data:
            category = item['category__name']
            current_total = float(item['total'])

            # Collect the past 5 months of spending for this category
            past_totals = []
            for i in range(1, 6):
                year, month = self._get_month_offset(today, i)
                total = Transaction.objects.filter(
                    user=user,
                    transaction_type='EXPENSE',
                    category__name=category,
                    date__year=year,
                    date__month=month
                ).aggregate(Sum('amount'))['amount__sum']
                if total:
                    past_totals.append(float(total))

            if len(past_totals) >= 2:
                # Z-score detection: uses mean and std of last 5 months
                mean = float(np.mean(past_totals))
                std = float(np.std(past_totals))

                if std > 0:
                    z_score = (current_total - mean) / std
                    if z_score > 1.5:
                        deviation_pct = round(((current_total - mean) / mean) * 100, 2)
                        anomalies.append({
                            "category": category,
                            "current_month": current_total,
                            "average_spending": round(mean, 2),
                            "z_score": round(z_score, 2),
                            # kept for frontend backward compatibility
                            "growth_percentage": deviation_pct,
                            "previous_month": round(mean, 2),
                            "detection_method": "z-score",
                        })

            elif len(past_totals) == 1:
                # Not enough history for Z-score — fall back to simple % threshold
                prev = past_totals[0]
                if prev > 0:
                    growth = (current_total - prev) / prev
                    if growth > 0.3:
                        anomalies.append({
                            "category": category,
                            "current_month": current_total,
                            "average_spending": round(prev, 2),
                            "z_score": None,
                            "growth_percentage": round(growth * 100, 2),
                            "previous_month": prev,
                            "detection_method": "percentage",
                        })

        return Response({
            "anomalies_detected": anomalies,
            "model_info": {
                "name": "Z-Score Statistical Anomaly Detection",
                "description": (
                    "Flags categories where current spending is more than 1.5 standard "
                    "deviations above your personal 5-month average. Z = (current - mean) / std."
                )
            }
        })


class ExpenseForecastView(APIView):
    """
    ML Concept: ARIMA Time-Series Forecasting

    ARIMA stands for AutoRegressive Integrated Moving Average.
    It is a classical statistical model for forecasting time-series data.

    ARIMA(p, d, q):
      p = AR order: how many past months' values influence the next (autoregression)
      d = differencing: removes trends so the series becomes stationary (stable mean/variance)
      q = MA order: how many past forecast errors influence the prediction

    We use ARIMA(1, 1, 1) — a safe, general-purpose setting for monthly expense data.

    Requires at least 3 months of data. Falls back to a 3-month moving average
    if data is insufficient or the model fails.
    """
    permission_classes = [IsAuthenticated]

    def _get_month_offset(self, base_date, months_back):
        month = base_date.month - months_back
        year = base_date.year
        while month <= 0:
            month += 12
            year -= 1
        return year, month

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        # Collect the last 12 months of total monthly expenses
        monthly_expenses = []
        month_labels = []

        for i in range(11, -1, -1):  # oldest first
            year, month = self._get_month_offset(today, i)
            total = Transaction.objects.filter(
                user=user,
                transaction_type='EXPENSE',
                date__year=year,
                date__month=month
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            monthly_expenses.append(float(total))
            month_labels.append(f"{year}-{month:02d}")

        # Compute next month's label
        next_month = today.month + 1
        next_year = today.year
        if next_month > 12:
            next_month = 1
            next_year += 1
        forecast_label = f"{next_year}-{next_month:02d}"

        non_zero_count = sum(1 for x in monthly_expenses if x > 0)
        predicted = 0.0
        method = "insufficient_data"

        if non_zero_count >= 3:
            try:
                from statsmodels.tsa.arima.model import ARIMA

                data = np.array(monthly_expenses, dtype=float)
                # ARIMA(1,1,1): one lag, first-order differencing, one MA term
                model = ARIMA(data, order=(1, 1, 1))
                fitted = model.fit()
                forecast_result = fitted.forecast(steps=1)
                predicted = max(float(forecast_result.iloc[0]), 0.0)
                method = "arima"
            except Exception:
                # If ARIMA fails for any reason, use 3-month moving average as fallback
                predicted = float(np.mean(monthly_expenses[-3:]))
                method = "moving_average"

        elif non_zero_count > 0:
            predicted = float(np.mean([x for x in monthly_expenses if x > 0]))
            method = "moving_average"

        model_display_names = {
            "arima": "ARIMA(1,1,1)",
            "moving_average": "3-Month Moving Average",
            "insufficient_data": "Insufficient Data",
        }

        return Response({
            "historical": [
                {"month": label, "expense": expense}
                for label, expense in zip(month_labels, monthly_expenses)
            ],
            "forecast": {
                "month": forecast_label,
                "predicted_expense": round(predicted, 2),
                "method": method,
            },
            "model_info": {
                "name": model_display_names.get(method, method),
                "what_it_means": (
                    "ARIMA looks at your past monthly expenses as a time series. "
                    "The AR(1) part says next month is influenced by this month. "
                    "The I(1) part removes any upward/downward trend. "
                    "The MA(1) part smooths out one-time spikes. "
                    "Together they predict next month's likely total expense."
                ),
                "data_points_used": non_zero_count,
            }
        })
