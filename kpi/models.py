from django.db import models
from django.contrib.auth.models import User


class KPITarget(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    expense_limit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    min_savings = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    savings_rate_target = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)  # percentage e.g. 20.00
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - KPI Targets"
