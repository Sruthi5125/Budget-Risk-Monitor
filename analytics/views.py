from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum
import calendar
from datetime import timedelta
from transactions.models import Transaction


class MonthlySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        month = today.month
        year = today.year

        # Get transactions for current month
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

        # Category breakdown
        category_data = transactions.filter(
            transaction_type='EXPENSE'
        ).values('category__name').annotate(
            total=Sum('amount')
        ).order_by('-total')

        # Top spending category
        top_category = category_data[0]['category__name'] if category_data else None

        # Savings ratio
        savings = total_income - total_expense
        savings_ratio = (savings / total_income) if total_income > 0 else 0

        # Budget health score calculation
        score = 100

        # Penalize low savings ratio
        if savings_ratio < 0.2:
            score -= 30
        elif savings_ratio < 0.3:
            score -= 15

        # Penalize if one category dominates
        if category_data:
            top_category_amount = category_data[0]['total']
            if total_expense > 0:
                dominance_ratio = top_category_amount / total_expense
                if dominance_ratio > 0.5:
                    score -= 20

        # Penalize if expenses nearly equal income
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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        current_month = today.month
        current_year = today.year

        # Determine previous month
        if current_month == 1:
            previous_month = 12
            previous_year = current_year - 1
        else:
            previous_month = current_month - 1
            previous_year = current_year

        # Current month expenses
        current_data = Transaction.objects.filter(
            user=user,
            transaction_type='EXPENSE',
            date__month=current_month,
            date__year=current_year
        ).values('category__name').annotate(
            total=Sum('amount')
        )

        # Previous month expenses
        previous_data = Transaction.objects.filter(
            user=user,
            transaction_type='EXPENSE',
            date__month=previous_month,
            date__year=previous_year
        ).values('category__name').annotate(
            total=Sum('amount')
        )

        previous_dict = {
            item['category__name']: item['total']
            for item in previous_data
        }

        anomalies = []

        for item in current_data:
            category = item['category__name']
            current_total = item['total']
            previous_total = previous_dict.get(category, 0)

            if previous_total > 0:
                growth = (current_total - previous_total) / previous_total
                if growth > 0.3:  # 30% spike threshold
                    anomalies.append({
                        "category": category,
                        "previous_month": previous_total,
                        "current_month": current_total,
                        "growth_percentage": round(growth * 100, 2)
                    })

        return Response({
            "anomalies_detected": anomalies
        })