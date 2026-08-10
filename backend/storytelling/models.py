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
    raw_alarmism = models.FloatField(null=True, blank=True)

    # Stage 2 - the tone-moderated story
    moderated_title = models.TextField(blank=True)
    moderated_paragraphs = models.JSONField(default=list, blank=True)
    moderated_alarmism = models.FloatField(null=True, blank=True)
    emotive_spans = models.JSONField(default=list, blank=True)

    # Stage 3 - the separate factual check
    factual_check = models.JSONField(default=list, blank=True)

    # The human baseline, submitted from the interface (task (c) in the report).
    human_text = models.TextField(blank=True)
    human_title = models.CharField(max_length=300, blank=True)
    # P0.2: judged on the same rubric as every other story. Previously a
    # hardcoded 2.5 was rendered in the interface as if it were a measurement.
    human_alarmism = models.FloatField(null=True, blank=True)

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


class StageResult(models.Model):
    """Per-stage telemetry. One row per agent call."""

    class Stage(models.TextChoices):
        GENERATE = "generate", "Generate"
        MODERATE = "moderate", "Moderate"
        FACTCHECK = "factcheck", "Fact-check"
        JUDGE_RAW = "judge_raw", "Judge (raw)"
        JUDGE_MODERATED = "judge_moderated", "Judge (moderated)"

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
