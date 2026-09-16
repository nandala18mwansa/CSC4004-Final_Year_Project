from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0002_budget_current_balance_budget_end_date_and_more'),
    ]

    operations = [
        migrations.AlterModelTable(
            name='budget',
            table='budgets',
        ),
        migrations.AlterModelTable(
            name='expense',
            table='expenses',
        ),
        migrations.AlterModelTable(
            name='approval',
            table='approvals',
        ),
        migrations.AlterModelTable(
            name='budgettransaction',
            table='transactions',
        ),
    ]
