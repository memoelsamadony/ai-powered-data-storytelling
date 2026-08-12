"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, RotateCcw } from "lucide-react";
import { datasets as mockDatasets, type Dataset } from "@/lib/data/datasets";
import { getStorySet, type StorySet } from "@/lib/data/stories";
import * as api from "@/lib/api";
import { StepNode, StepRail, type StepState } from "@/components/generate/stepper";
import { DatasetPicker } from "@/components/generate/dataset-picker";
import { HumanStoryEditor } from "@/components/generate/human-story-editor";
import { PipelineRunner } from "@/components/generate/pipeline-runner";
import { Comparison } from "@/components/generate/comparison";
import { cn } from "@/lib/utils";

/**
 * Identified, not numbered.
 *
 * An uploaded table has no human baseline, so its wizard is three steps rather
 * than four - and every gate, recap and body below used to key off the step
 * INDEX, which silently means something different once a step is dropped. The
 * ids are what survive the filter; the index is only a position on the rail.
 */
type StepId = "dataset" | "human" | "run" | "compare";

const ALL_STEPS: { id: StepId; title: string; desc: string }[] = [
  { id: "dataset", title: "Choose a dataset", desc: "Pick the data your story is built from. Each one fails in a different tonal direction, and you can bring your own table." },
  { id: "human", title: "The human baseline", desc: "Write or import the human-authored story, the yardstick the LLM is measured against." },
  { id: "run", title: "Run the agentic pipeline", desc: "Generate → moderate tone → factual check, all on the same numbers." },
  { id: "compare", title: "Compare & evaluate", desc: "Human, raw, and moderated stories side by side, with the metrics." },
];

export function GenerateExperience() {
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [openSteps, setOpenSteps] = useState<number[]>([0]);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  // The uploaded table this run is on, if any. Held as the record rather than a
  // boolean so the mapping sentence it carries can be shown with the story.
  const [upload, setUpload] = useState<api.UploadedDataset | null>(null);
  const [humanText, setHumanText] = useState("");
  const [generated, setGenerated] = useState(false);

  const sectionRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Backend state. `tier` is the first tier this machine can actually run;
  // `null` health means no backend, so everything stays on mock data.
  const [datasets, setDatasets] = useState<Dataset[]>(mockDatasets);
  const [health, setHealth] = useState<api.Health | null>(null);
  const [backendChecked, setBackendChecked] = useState(false);
  const [liveStory, setLiveStory] = useState<StorySet | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<api.ComparisonMetrics | null>(null);
  const runIdRef = useRef<string | null>(null);
  // Keyed by the dataset+tier it was fetched for. Deriving the list from a
  // matching key is what lets the effect never clear state synchronously: a
  // stale list simply stops matching instead of having to be wiped.
  const [cached, setCached] = useState<{ key: string; runs: api.RunRef[] }>({
    key: "",
    runs: [],
  });
  // Null until the reader touches the toggle, so the default can follow what is
  // actually available per dataset without an effect writing state to say so.
  const [sourceChoice, setSourceChoice] = useState<"cached" | "live" | null>(null);
  const storedRef = useRef<StorySet | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [h, ds] = await Promise.all([api.getHealth(), api.getDatasets()]);
      if (cancelled) return;
      setHealth(h);
      setDatasets(ds);
      setBackendChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tier = useMemo(
    () => health?.tiers.find((t) => t.runnable)?.id ?? null,
    [health],
  );
  const isLive = !!health?.ollamaUp && !!tier;

  /** Map the running tier's models onto the pipeline stages for display. */
  const stageModels = useMemo(() => {
    const t = health?.tiers.find((x) => x.id === tier);
    if (!t) return undefined;
    const by = (role: string) => t.models.find((m) => m.role === role)?.model;
    return {
      generate: by("generator"),
      moderate: by("moderator"),
      factcheck: by("moderator"),
    };
  }, [health, tier]);

  /**
   * Which model picks the figures.
   *
   * Choosing figures and moderating prose are different jobs. The demo tier
   * moderates on `gemma4:12b` because that is what can stay co-resident with
   * the generator for an interactive run, but selection is one short
   * grammar-constrained call, so it can afford the biggest model on the
   * machine even when the story stages cannot.
   *
   * Read off the `mid` tier's moderator rather than written as a literal, so
   * the model name lives in the backend tier table and not in two places. Null
   * when that model is not installed, and the call then falls back to the
   * running tier's own moderator.
   */
  const figureModel = useMemo(() => {
    const mid = health?.tiers.find((t) => t.id === "mid");
    const mod = mid?.models.find((m) => m.role === "moderator");
    return mod?.available ? mod.model : undefined;
  }, [health]);

  /**
   * Completed runs for this dataset and tier, which cached mode replays.
   *
   * Looked up per dataset, because "is there something to replay" is a
   * per-dataset question the toggle has to answer before the reader presses
   * anything.
   */
  const cacheKey = datasetId && tier ? `${datasetId}:${tier}` : "";
  // Memoised because it feeds the `stages` dependency list: a fresh [] every
  // render would rebuild the stage closures on every render.
  const cachedRuns = useMemo(
    () => (cached.key === cacheKey ? cached.runs : []),
    [cached, cacheKey],
  );

  useEffect(() => {
    if (!datasetId || !tier) return;
    const key = `${datasetId}:${tier}`;
    let cancelled = false;
    api.listRuns(datasetId, tier).then((rs) => {
      if (!cancelled) setCached({ key, runs: rs.filter((r) => r.status === "done") });
    });
    return () => {
      cancelled = true;
    };
  }, [datasetId, tier]);


  // Never for an uploaded table. `getStorySet` falls back to the measles story
  // for an id it does not know, and rendering that under an uploaded file's
  // name is the exact failure the `/runs` alias bug produced: one dataset's
  // story shown as another's. An upload with no backend simply has no story.
  const mockStory = useMemo(
    () => (datasetId && !upload ? getStorySet(datasetId) : null),
    [datasetId, upload],
  );
  const story = liveStory ?? mockStory;
  // An uploaded table is served by the same /datasets/{id} endpoint, typed by
  // inference instead of declared, so it arrives here as an ordinary Dataset
  // and every component below draws it without knowing the difference.
  const [uploadDataset, setUploadDataset] = useState<Dataset | null>(null);
  const dataset = useMemo(
    () =>
      datasets.find((d) => d.id === datasetId) ??
      (uploadDataset?.id === datasetId ? uploadDataset : null),
    [datasets, datasetId, uploadDataset],
  );

  const steps = useMemo(
    () => ALL_STEPS.filter((s) => s.id !== "human" || !upload),
    [upload],
  );
  const LAST = steps.length - 1;
  const sampleText = mockStory?.human?.paragraphs.join("\n\n") ?? "";

  const selectUpload = async (record: api.UploadedDataset) => {
    setUpload(record);
    setDatasetId(record.id);
    setUploadDataset(null);
    // No sample baseline: there is no human story for a file uploaded a minute
    // ago, and seeding the measles one would put another dataset's words into
    // this run's comparison.
    setHumanText("");
    setGenerated(false);
    setLiveStory(null);
    setLiveMetrics(null);
    runIdRef.current = null;
    // The rail is one step shorter now, so a reader who had walked further
    // would land on an index that no longer exists.
    setStep(0);
    setMaxReached(0);
    setOpenSteps([0]);
    setUploadDataset((await api.getDatasetById(record.id)) ?? null);
  };

  const selectDataset = (id: string) => {
    setUpload(null);
    setUploadDataset(null);
    setDatasetId(id);
    setHumanText(getStorySet(id).human?.paragraphs.join("\n\n") ?? "");
    setGenerated(false);
    setLiveStory(null);
    setLiveMetrics(null);
    runIdRef.current = null;
  };

  /**
   * The mode the next run will use.
   *
   * Derived rather than stored, so a dataset with nothing cached never sits on
   * a "cached" toggle that would do nothing, and an explicit choice still wins
   * once the reader makes one.
   */
  const source: "cached" | "live" =
    sourceChoice ?? (cachedRuns.length > 0 ? "cached" : "live");

  /**
   * One stages contract, two implementations.
   *
   * `cached` replays a stored run: the text is fetched once and every stage
   * returns it, with fixed timers for the beats, so the reveal keeps the shape
   * of a live run without the waiting. `live` computes each stage on a model.
   *
   * Branching inside one memo rather than picking between two of them keeps
   * the runner on a single code path, so cached mode cannot drift into
   * rendering something live mode would not.
   *
   * Both go through `suggestCharts`, which is a cache read once that table has
   * been charted on that model - which is what lets cached mode touch no model
   * at all.
   */
  const stages = useMemo(() => {
    if (!isLive || !datasetId || !tier) return undefined;

    const selectCharts = () =>
      api.suggestCharts(
        upload ? { uploadId: upload.id } : { datasetId },
        { tier, model: figureModel },
      );

    const cachedRunId = cachedRuns[0]?.runId;
    if (source === "cached" && cachedRunId) {
      const beat = (ms: number) => new Promise((r) => setTimeout(r, ms));
      return {
        generate: async () => {
          runIdRef.current = cachedRunId;
          const s = await api.getRun(cachedRunId);
          storedRef.current = s;
          setLiveStory(s);
          await beat(700);
          return s;
        },
        selectCharts,
        moderate: async () => {
          await beat(1900);
          return storedRef.current!;
        },
        factcheck: async () => {
          await beat(1600);
          return storedRef.current!;
        },
      };
    }

    return {
      generate: async () => {
        const run = await api.createRun(
          upload ? { uploadId: upload.id } : { datasetId },
          tier,
        );
        runIdRef.current = run.runId;
        if (humanText.trim()) {
          await api.saveHumanStory(run.runId, humanText);
        }
        const s = await api.stageGenerate(run.runId);
        setLiveStory(s);
        return s;
      },
      selectCharts,
      moderate: async () => {
        const s = await api.stageModerate(runIdRef.current!);
        setLiveStory(s);
        return s;
      },
      factcheck: async () => {
        const s = await api.stageFactcheck(runIdRef.current!);
        setLiveStory(s);
        return s;
      },
    };
  }, [isLive, datasetId, upload, tier, humanText, figureModel, source, cachedRuns]);

  // Scored once the comparison step is reachable, not while the run is going:
  // the metrics need the moderated text, which only exists after the last
  // stage. Keyed on maxReached rather than step, because the step header can be
  // folded open without advancing, and because this way the figures are already
  // there when the reader arrives.
  //
  // Re-scored whenever the baseline changes, since the panel says the figures
  // are scored against the text you typed and the textarea stays editable after
  // the run. Debounced so that promise is kept per edit, not per keystroke.
  useEffect(() => {
    const runId = runIdRef.current;
    if (maxReached < 3 || !runId || !datasetId) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const m = await api.compareStories(runId, humanText);
      if (!cancelled) setLiveMetrics(m);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [maxReached, datasetId, humanText]);

  const isOpen = useCallback((i: number) => openSteps.includes(i), [openSteps]);

  const toggle = (i: number) =>
    setOpenSteps((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));

  /** Advance: reveal the next step, fold the one we came from, scroll to it. */
  const go = (next: number) => {
    setStep(next);
    setMaxReached((m) => Math.max(m, next));
    setOpenSteps((s) => [...new Set([...s.filter((x) => x !== next - 1), next])]);
    requestAnimationFrame(() =>
      sectionRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const reset = () => {
    setStep(0);
    setMaxReached(0);
    setOpenSteps([0]);
    setDatasetId(null);
    setHumanText("");
    setGenerated(false);
    setLiveStory(null);
    setLiveMetrics(null);
    runIdRef.current = null;
    requestAnimationFrame(() =>
      sectionRefs.current[0]?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const canContinue = (i: number) => {
    const id = steps[i]?.id;
    if (id === "dataset") return !!datasetId;
    if (id === "human") return humanText.trim().length > 0;
    if (id === "run") return generated;
    return false;
  };

  /** The one-line recap a folded step shows, so the rail stays readable. */
  const summary = (i: number): string | null => {
    if (i > maxReached) return null;
    const id = steps[i]?.id;
    if (id === "dataset") return dataset ? dataset.name : "No dataset chosen";
    if (id === "human") {
      const words = humanText.trim() ? humanText.trim().split(/\s+/).length : 0;
      return words ? `${words} words` : "Not written yet";
    }
    if (id === "run") return generated ? "Pipeline complete: 3 stages" : "Not run yet";
    if (id === "compare" && story) {
      const after = story.aiModerated.alarmismRating;
      const beforeRating = story.aiRaw.alarmismRating;
      if (after === null || beforeRating === null) return "Tone not measured";
      const moved = after - beforeRating;
      return `Tone pulled ${moved > 0 ? "up" : "down"} ${Math.abs(moved).toFixed(1)}`;
    }
    return null;
  };

  const stateOf = (i: number): StepState =>
    i < step ? "done" : i === step ? "active" : "pending";

  return (
    <div>
      {backendChecked && (
        <p
          data-testid="backend-status"
          data-live={isLive ? "true" : "false"}
          className="mb-8 font-mono text-[0.7rem] uppercase tracking-wider text-faint"
        >
          {isLive ? `Live backend - tier ${tier}` : "Mock data - backend unavailable"}
        </p>
      )}

      <ol className="space-y-0">
        {steps.map((meta, i) => {
          const state = stateOf(i);
          const reached = i <= maxReached;
          const open = reached && isOpen(i);
          const recap = summary(i);

          return (
            <li
              key={meta.title}
              ref={(el) => {
                sectionRefs.current[i] = el;
              }}
              className="grid grid-cols-[2.25rem_1fr] gap-x-4 scroll-mt-24 sm:gap-x-5"
            >
              {/* Rail column */}
              <div className="flex flex-col items-center">
                <StepNode index={i} state={state} />
                {i < LAST && <StepRail filled={i < step} />}
              </div>

              {/* Content column */}
              <div className={cn("min-w-0", i < LAST && "pb-10")}>
                <button
                  onClick={() => reached && toggle(i)}
                  disabled={!reached}
                  aria-expanded={open}
                  className={cn(
                    "group flex w-full items-start justify-between gap-4 text-left",
                    reached ? "cursor-pointer" : "cursor-not-allowed",
                  )}
                >
                  <div className="min-w-0">
                    <h2
                      className={cn(
                        "text-xl leading-tight sm:text-2xl",
                        state === "pending" ? "text-faint" : "text-navy",
                      )}
                    >
                      {meta.title}
                    </h2>
                    {open ? (
                      <p className="mt-1.5 max-w-2xl text-sm text-muted">{meta.desc}</p>
                    ) : (
                      recap && (
                        <p className="mt-1 font-mono text-[0.72rem] text-deep-teal">{recap}</p>
                      )
                    )}
                  </div>

                  {reached && (
                    <ChevronDown
                      className={cn(
                        "mt-1 h-4 w-4 shrink-0 text-faint transition-transform group-hover:text-navy",
                        open && "rotate-180",
                      )}
                    />
                  )}
                </button>

                {/* Kept mounted while folded: collapsing a finished run must not
                    discard it, and re-opening must not replay the animation. */}
                {reached && (
                  <div className={cn("mt-6", !open && "hidden")}>
                    {meta.id === "dataset" && (
                      <DatasetPicker
                        datasets={datasets}
                        selectedId={datasetId}
                        onSelect={selectDataset}
                        onSelectUpload={selectUpload}
                        selectedUploadId={upload?.id ?? null}
                      />
                    )}
                    {meta.id === "human" && dataset && (
                      <HumanStoryEditor
                        value={humanText}
                        onChange={setHumanText}
                        sampleText={sampleText}
                        dataset={dataset}
                      />
                    )}
                    {meta.id === "run" && story && dataset && (
                      <PipelineRunner
                        story={story}
                        dataset={dataset}
                        stages={stages}
                        models={stageModels}
                        source={source}
                        onSourceChange={setSourceChoice}
                        cachedCount={cachedRuns.length}
                        onComplete={() => {
                          setGenerated(true);
                          setMaxReached((m) => Math.max(m, LAST));
                        }}
                        onReset={() => {
                          // A new run gets a new id, so the previous run's
                          // score has to go with it: keeping it would put run
                          // two's text beside run one's figures.
                          setGenerated(false);
                          setLiveStory(null);
                          setLiveMetrics(null);
                          runIdRef.current = null;
                        }}
                      />
                    )}
                    {meta.id === "compare" && story && dataset && (
                      <Comparison
                        story={story}
                        humanText={humanText}
                        dataset={dataset}
                        metrics={liveMetrics}
                      />
                    )}

                    {/* Advance from the step you are on. */}
                    {i === step && i < LAST && (
                      <div className="mt-8 border-t border-hairline pt-6">
                        <button
                          onClick={() => canContinue(i) && go(i + 1)}
                          disabled={!canContinue(i)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all",
                            canContinue(i)
                              ? "bg-navy text-white shadow-[0_10px_26px_-12px_rgba(13,27,92,0.7)] hover:-translate-y-0.5 hover:bg-deep-navy"
                              : "cursor-not-allowed bg-surface-soft text-faint",
                          )}
                        >
                          {meta.id === "run" ? "See the comparison" : "Continue"}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {i === LAST && (
                      <div className="mt-8 border-t border-hairline pt-6">
                        <button
                          onClick={reset}
                          className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-6 py-3 text-sm font-medium text-muted transition-colors hover:text-navy"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Start over
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
