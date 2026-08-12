from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [("storytelling", "0008_chartselection")]

    operations = [
        migrations.AddField(
            model_name="run",
            name="source_upload",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="runs",
                to="storytelling.uploadeddataset",
            ),
        ),
    ]
