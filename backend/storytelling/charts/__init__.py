"""The chart contract, server side.

``lib/charts/spec.ts`` is canonical; everything here mirrors it. The pairing is
checked mechanically rather than trusted: ``test_schema_matches_frontend`` loads
``docs/chart-schema.json`` (emitted from the TypeScript by
``scripts/build-chart-schema.mjs``) and pins the form enum, the channels and the
modifier vocabulary against these models. A change on either side that is not
made on both fails the suite.

Module map, deliberately parallel to ``lib/charts/``:

    spec.py           types, FORM_RULES, the presets
    validate.py       the guardrail, mirroring validate.ts rule for rule
    frames.py         Dataset -> ChartFrame, the port of dataset-frame.ts
    profile.py        an arbitrary CSV -> typed columns, which has no TS twin
    applicability.py  which forms a frame can carry, decided in plain code
    select.py         the agent: rank the applicable forms, write the specs
"""
