from rest_framework import serializers
from .models import KPITarget


class KPITargetSerializer(serializers.ModelSerializer):
    class Meta:
        model = KPITarget
        fields = ('expense_limit', 'min_savings', 'savings_rate_target', 'updated_at')
        read_only_fields = ('updated_at',)
