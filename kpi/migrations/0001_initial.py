from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='KPITarget',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('expense_limit', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('min_savings', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('savings_rate_target', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
