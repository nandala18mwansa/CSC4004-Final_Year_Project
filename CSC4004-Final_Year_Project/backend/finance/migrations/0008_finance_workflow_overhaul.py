from decimal import Decimal
import uuid
import finance.models
from django.conf import settings
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


def backfill_references_and_balances(apps, schema_editor):
    Expense = apps.get_model('finance', 'Expense')
    for exp in Expense.objects.all():
        exp.reference = f"EXP-{uuid.uuid4().hex[:10].upper()}"
        exp.save(update_fields=['reference'])

    Tx = apps.get_model('finance', 'BudgetTransaction')
    for tx in Tx.objects.all().iterator():
        tx.reference = f"TXN-{uuid.uuid4().hex[:10].upper()}"
        if tx.action_type in ('TOP_UP', 'REFUND'):
            tx.balance_before = tx.balance_after - tx.amount
        elif tx.action_type == 'DEDUCTION':
            tx.balance_before = tx.balance_after + tx.amount
        else:
            tx.balance_before = tx.balance_after
        tx.save(update_fields=['reference', 'balance_before'])

    Report = apps.get_model('finance', 'FinancialSummaryRequest')
    for r in Report.objects.all():
        r.reference = f"FR-{uuid.uuid4().hex[:10].upper()}"
        r.save(update_fields=['reference'])


class Migration(migrations.Migration):
    dependencies = [('finance', '0007_financialsummaryrequest_report_fields')]
    operations = [
        migrations.AddField(model_name='expense', name='reference', field=models.CharField(max_length=24, null=True)),
        migrations.AddField(model_name='budgettransaction', name='reference', field=models.CharField(max_length=24, null=True)),
        migrations.AddField(model_name='budgettransaction', name='balance_before', field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
        migrations.AddField(model_name='financialsummaryrequest', name='reference', field=models.CharField(max_length=24, null=True)),
        migrations.RunPython(backfill_references_and_balances, migrations.RunPython.noop),
        migrations.AlterField(model_name='expense', name='reference', field=models.CharField(default=finance.models.expense_ref, editable=False, max_length=24, unique=True)),
        migrations.AlterField(model_name='budgettransaction', name='reference', field=models.CharField(default=finance.models.transaction_ref, editable=False, max_length=24, unique=True)),
        migrations.AlterField(model_name='financialsummaryrequest', name='reference', field=models.CharField(default=finance.models.report_ref, editable=False, max_length=24, unique=True)),
        migrations.AddField(model_name='financialsummaryrequest', name='generated_report', field=models.FileField(blank=True, null=True, upload_to='financial_reports/%Y/%m/')),
        migrations.AlterField(model_name='budget', name='start_date', field=models.DateField(blank=True, null=True)),
        migrations.AlterField(model_name='budget', name='end_date', field=models.DateField(blank=True, null=True)),
        migrations.AlterField(model_name='financialsummaryrequest', name='report_start', field=models.DateField(blank=True, null=True)),
        migrations.AlterField(model_name='financialsummaryrequest', name='report_end', field=models.DateField(blank=True, null=True)),
        migrations.AlterField(model_name='financialsummaryrequest', name='status', field=models.CharField(choices=[('PENDING','Pending'),('COMPLETED','Completed'),('REJECTED','Rejected')], default='PENDING', max_length=20)),
        migrations.AlterField(model_name='financialsummaryrequest', name='report_format', field=models.CharField(choices=[('PDF','PDF'),('CSV','CSV')], default='PDF', max_length=10)),
        migrations.AlterField(model_name='budgettransaction', name='action_type', field=models.CharField(choices=[('TOP_UP','Funds Added'),('DEDUCTION','Expense Approved'),('REFUND','Expense Reversal'),('ADJUSTMENT','Controlled Adjustment'),('REJECTION','Legacy Rejection Event')], max_length=30)),
        migrations.CreateModel(
            name='FinanceNotification',
            fields=[('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')), ('kind', models.CharField(choices=[('EXPENSE_APPROVED','Expense approved'),('EXPENSE_REJECTED','Expense rejected'),('REPORT_READY','Report ready'),('REPORT_REJECTED','Report rejected'),('ACTION_REQUIRED','Action required')], max_length=30)), ('title',models.CharField(max_length=160)), ('message',models.TextField()), ('is_read',models.BooleanField(default=False)), ('created_at',models.DateTimeField(auto_now_add=True)), ('expense',models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.CASCADE,related_name='notifications',to='finance.expense')), ('report_request',models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.CASCADE,related_name='notifications',to='finance.financialsummaryrequest')), ('recipient',models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name='finance_notifications',to=settings.AUTH_USER_MODEL))],
            options={'db_table':'finance_notifications','ordering':['-created_at']},
        ),
        migrations.CreateModel(
            name='FinanceAuditLog',
            fields=[('id',models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name='ID')), ('action',models.CharField(max_length=80)), ('object_type',models.CharField(max_length=50)), ('object_reference',models.CharField(blank=True,max_length=50)), ('details',models.TextField(blank=True)), ('created_at',models.DateTimeField(auto_now_add=True)), ('actor',models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.PROTECT,to=settings.AUTH_USER_MODEL))],
            options={'db_table':'finance_audit_log','ordering':['-created_at']},
        ),
    ]
