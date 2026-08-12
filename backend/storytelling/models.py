"""Persistence for pipeline runs.

Two jobs:

1. **Serve the demo instantly.** A large-tier run takes minutes, so the web app
   reads a completed ``Run`` rather than waiting on Ollama. The batch command
   fills the cache ahead of a presentation.
2. **Be the measurement substrate for the scale-up study.** The report's next
   steps ask how model size affects hallucination rate, how much tone moderation
   is required, and whether the causal gap closes. ``StageResult`` records the
   model, wall-clock and full payload of every stage, so those questions become
   queries over this table instead of a fresh round of manual bookkeeping.
"""

from __future__ import annotations

import uuid

from django.db import models


class RunStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    GENERATING = "generating", "Generating"
    MODERATING = "moderating", "Moderating"
    FACTCHECKING = "factchecking", "Fact-checking"
    DONE = "done", "Done"
    FAILED = "failed", "Failed"


class Run(models.Model):
    """One pass of generate -> moderate -> factcheck over one dataset."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset_id = models.CharField(max_length=64)
    tier = models.CharField(max_length=32)
    status = models.CharField(max_length=16, choices=RunStatus, default=RunStatus.PENDING)

    # Stage 1 - the raw generated story
    raw_title = models.TextField(blank=True)
    raw_paragraphs = models.JSONField(default=list, blank=True)
    # Two tone axes, both 1-5, both scored in the same judge call. Null means no
    # judge was reachable, which is a fact about the run; nothing fills them
    # with a default, because the middle of a 1-5 tone scale is not neutral,
    # it is the specific claim "calibrated".
    raw_alarmism = models.FloatField(null=True, blank=True)
    raw_optimism = models.FloatField(null=True, blank=True)

    # Stage 2 - the tone-moderated story
    moderated_title = models.TextField(blank=True)
    moderated_paragraphs = models.JSONField(default=list, blank=True)
    moderated_alarmism = models.FloatField(null=True, blank=True)
    moderated_optimism = models.FloatField(null=True, blank=True)
    emotive_spans = models.JSONField(default=list, blank=True)

    # Stage 3 - the separate factual check
    factual_check = models.JSONField(default=list, blank=True)

    # An independent judge, run through the Claude CLI rather than Ollama.
    # Kept in their own fields, never overwriting the local judge's numbers:
    # on the mid and large tiers the judge and the moderator are the same model,
    # and measuring that self-assessment bias needs both scores side by side.
    opus_raw_alarmism = models.FloatField(null=True, blank=True)
    opus_raw_optimism = models.FloatField(null=True, blank=True)
    opus_moderated_alarmism = models.FloatField(null=True, blank=True)
    opus_moderated_optimism = models.FloatField(null=True, blank=True)
    opus_rationale = models.TextField(blank=True)
    opus_model = models.CharField(max_length=64, blank=True)
    opus_cost_usd = models.FloatField(null=True, blank=True)

    # The human baseline, submitted from the interface (task (c) in the report).
    human_text = models.TextField(blank=True)
    human_title = models.CharField(max_length=300, blank=True)
    # P0.2: judged on the same rubric as every other story, by the same blind
    # Claude call, so judge bias cancels when the two are compared. Previously a
    # hardcoded 2.5 was rendered in the interface as if it were a measurement.
    # Null means "no baseline, or the judge was unreachable" - never a default,
    # because the human rating is the centre of the target band the moderated
    # story is measured against.
    human_alarmism = models.FloatField(null=True, blank=True)
    human_optimism = models.FloatField(null=True, blank=True)

    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["dataset_id", "tier", "status"])]

    def __str__(self) -> str:
        return f"{self.dataset_id}/{self.tier} [{self.status}]"

    @property
    def is_complete(self) -> bool:
        return self.status == RunStatus.DONE


class UploadedDataset(models.Model):
    """A CSV a user uploaded, parked until the configuration work lands.

    Deliberately not registered in ``datasets.SPECS``. A dataset there needs a
    declared primary and secondary measure, class breaks, an aggregate row and a
    failure mode, none of which can be inferred from an arbitrary table, and
    guessing them is what would put an unlabelled figure in front of a reader.
    So the file is validated and stored, and wiring it to the pipeline waits for
    the interface that asks a human what its columns mean.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # What the uploader called it, kept for display only. The file on disk is
    # named after the id, so nothing a client sends becomes a path.
    original_name = models.CharField(max_length=255)
    stored_path = models.CharField(max_length=500)
    rows = models.IntegerField()
    columns = models.JSONField(default=list)
    numeric_columns = models.JSONField(default=list)
    year_range = models.CharField(max_length=32, blank=True)
    countries = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.original_name} ({self.rows} rows)"


class StageResult(models.Model):
    """Per-stage telemetry. One row per agent call."""

    class Stage(models.TextChoices):
        GENERATE = "generate", "Generate"
        MODERATE = "moderate", "Moderate"
        FACTCHECK = "factcheck", "Fact-check"
        JUDGE_RAW = "judge_raw", "Judge (raw)"
        JUDGE_MODERATED = "judge_moderated", "Judge (moderated)"
        JUDGE_INDEPENDENT = "judge_independent", "Judge (independent, Claude CLI)"
        # One per story, so the two blind calls stay distinguishable in the
        # telemetry instead of collapsing onto a single stage key.
        JUDGE_OPUS_RAW = "judge_opus_raw", "Judge (Claude, raw)"
        JUDGE_OPUS_MODERATED = "judge_opus_moderated", "Judge (Claude, moderated)"
        JUDGE_OPUS_HUMAN = "judge_opus_human", "Judge (Claude, human baseline)"

    run = models.ForeignKey(Run, related_name="stages", on_delete=models.CASCADE)
    stage = models.CharField(max_length=24, choices=Stage)
    model = models.CharField(max_length=64)
    duration_s = models.FloatField()
    payload = models.JSONField(default=dict)
    # tokens in/out + done_reason. Makes token budgets measurable instead of guessed.
    usage = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.stage} on {self.model} ({self.duration_s:.1f}s)"


class ChartSelection(models.Model):
    """One stored answer from ``POST /charts/suggest``.

    Selection is a real Ollama call - seconds on the demo moderator, over a
    minute on ``gemma4:31b`` once its 19.9 GB has to load - and it is pure with
    respect to its inputs in every way that matters: the same table, model and
    count produce an answer of the same kind every time. Caching it is what
    lets a presentation show figures without waiting on a model.

    It is also stronger than a seed. A fixed seed only reproduces while the
    model stays resident; an eviction re-reads the weights and the sampler
    starts somewhere else (see experiments/MODELS.md). A stored payload is the
    only way to guarantee the audience sees the figures that were rehearsed.

    Keyed by source **label** rather than a foreign key because the two sources
    are different things - a registry dataset id and an uploaded file - and a
    nullable FK to one of them would not describe the other.
    """

    #: ``dataset:measles`` or ``upload:<original name>``, as built by the endpoint.
    source = models.CharField(max_length=200)
    model = models.CharField(max_length=64)
    n = models.PositiveSmallIntegerField()
    #: A whole ``ChartSuggestOut``, stored as sent.
    payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "model", "n"], name="one_selection_per_source_model_n"
            )
        ]

    def __str__(self) -> str:
        return f"{self.source} x{self.n} on {self.model}"
