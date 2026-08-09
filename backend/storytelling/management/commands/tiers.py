"""Report what this machine can run, and why.

    python manage.py tiers
"""

from django.core.management.base import BaseCommand

from storytelling import ollama_client as oc


class Command(BaseCommand):
    help = "Show model tiers, memory policy and what is runnable here."

    def handle(self, *args, **opts):
        up = oc.is_up()
        self.stdout.write(f"Ollama: {'up' if up else 'DOWN'}")
        self.stdout.write(
            f"RAM {oc.TOTAL_RAM_GB:.0f} GB | GPU wired limit {oc.gpu_wired_limit_gb()} GB "
            f"| usable for models {oc.usable_gb()} GB\n"
        )
        for tier in oc.TIERS.values():
            plan = oc.tier_plan(tier)
            mark = self.style.SUCCESS("runnable") if plan["runnable"] else self.style.ERROR("missing models")
            self.stdout.write(f"{tier.id:<7} {tier.label:<34} {mark}")
            mode = "sequential (load/unload per stage)" if plan["sequential"] else "co-resident"
            self.stdout.write(f"        peak {plan['peak_resident_gb']:>5} GB   {mode}")
            for role, name in tier.models.items():
                have = "ok " if name in plan["installed"] else "NOT PULLED"
                size = plan["sizes"].get(name)
                self.stdout.write(f"          {role:<10} {name:<14} {size or '?':>5} GB  {have}")
            if plan["needs_raised_limit"]:
                self.stdout.write(self.style.WARNING(
                    "        raise the GPU limit: sudo sysctl iogpu.wired_limit_mb=28672"
                ))
            self.stdout.write("")
