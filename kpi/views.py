from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum
import calendar

from transactions.models import Transaction
from .models import KPITarget
from .serializers import KPITargetSerializer


def _kpi_status_lower_is_better(actual, target):
    """For expense limit: lower actual is better."""
    if target is None or float(target) == 0:
        return "not_set"
    ratio = actual / float(target)
    if ratio <= 0.9:
        return "on_track"
    elif ratio <= 1.0:
        return "at_risk"
    else:
        return "over"


def _kpi_status_higher_is_better(actual, target):
    """For savings / savings rate: higher actual is better."""
    if target is None or float(target) == 0:
        return "not_set"
    ratio = actual / float(target)
    if ratio >= 1.0:
        return "on_track"
    elif ratio >= 0.7:
        return "at_risk"
    else:
        return "off_track"


class KPITargetView(APIView):
    """GET or upsert (POST) the authenticated user's KPI targets."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        target, _ = KPITarget.objects.get_or_create(user=request.user)
        serializer = KPITargetSerializer(target)
        return Response(serializer.data)

    def post(self, request):
        target, _ = KPITarget.objects.get_or_create(user=request.user)
        serializer = KPITargetSerializer(target, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class KPIStatusView(APIView):
    """Returns current month actuals vs user-defined KPI targets with status."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()
        month, year = today.month, today.year

        transactions = Transaction.objects.filter(
            user=user, date__month=month, date__year=year
        )

        total_income = float(
            transactions.filter(transaction_type='INCOME')
            .aggregate(Sum('amount'))['amount__sum'] or 0
        )
        total_expense = float(
            transactions.filter(transaction_type='EXPENSE')
            .aggregate(Sum('amount'))['amount__sum'] or 0
        )
        net_savings = total_income - total_expense
        savings_rate = (net_savings / total_income * 100) if total_income > 0 else 0

        target, _ = KPITarget.objects.get_or_create(user=user)

        days_passed = today.day
        total_days = calendar.monthrange(year, month)[1]
        projected_expense = (total_expense / days_passed * total_days) if days_passed > 0 else 0

        return Response({
            "kpis": [
                {
                    "name": "Monthly Expense Limit",
                    "actual": round(total_expense, 2),
                    "projected": round(projected_expense, 2),
                    "target": float(target.expense_limit) if target.expense_limit is not None else None,
                    "unit": "currency",
                    "status": _kpi_status_lower_is_better(total_expense, target.expense_limit),
                    "note": "Projected month-end expense based on daily burn rate"
                },
                {
                    "name": "Minimum Monthly Savings",
                    "actual": round(net_savings, 2),
                    "projected": None,
                    "target": float(target.min_savings) if target.min_savings is not None else None,
                    "unit": "currency",
                    "status": _kpi_status_higher_is_better(net_savings, target.min_savings),
                    "note": "Income minus expenses this month"
                },
                {
                    "name": "Savings Rate Target",
                    "actual": round(savings_rate, 2),
                    "projected": None,
                    "target": float(target.savings_rate_target) if target.savings_rate_target is not None else None,
                    "unit": "percent",
                    "status": _kpi_status_higher_is_better(savings_rate, target.savings_rate_target),
                    "note": "Percentage of income saved this month"
                },
            ],
            "targets_set": any([
                target.expense_limit is not None,
                target.min_savings is not None,
                target.savings_rate_target is not None,
            ])
        })
