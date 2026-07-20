# Provenance: what this project is, and is not

This page exists so that no other page has to imply more authority than the
project has. Everything else in the repo should be read through it.

## What this is

Hinterland is a **procedural fiction generator and teaching instrument**. It
generates imaginary regions (geology, settlements, economies, histories) and
then computes statistics *about those imaginary worlds*. All of its code and
all of its documentation were written by **Claude (Anthropic's AI)**, directed
by a single author (ZNT). The git history records this plainly: every commit is
authored by the AI under the owner's direction.

The socioeconomic mechanisms it simulates are *gestures at* real social
science: the resource curse, core-periphery structure, infrastructure
rationing, environmental injustice, elite concentration, imperial concession
economies. [grounding.md](grounding.md) maps each mechanism to the real
literature it draws on, states where the implementation follows that
literature, and states where it diverges or simplifies.

## What this is not

- **Not peer-reviewed.** No economist, geographer, epidemiologist, or any
  other domain expert has reviewed any part of this project.
- **Not an empirical model.** Nothing here is fit to real-world data. No
  output of this generator is evidence about the real world.
- **Not designed by a panel of experts.** An earlier version of
  [attribute-model.md](attribute-model.md) described the design as "produced
  from a structured expert panel (≈20 disciplinary lenses)." Those "lenses"
  were AI-authored writing personas, not people. They have been re-labeled as
  what they are, and each is now anchored to real, cited literature instead of
  a fictional expert's authority.
- **Not validated.** Every "measurement," correlation, p-value, and acceptance
  threshold in this repo is an **internal consistency check computed on
  self-generated data**. The test suite proves that the code does what the
  code says: that exports recompute, that determinism holds, that tuned
  distributions stay where they were tuned. It cannot prove, and does not
  prove, that the world works this way.

## Validation status, honestly

For most of the project's history, numeric acceptance thresholds were set by
running the implementation, observing its output, and pinning the observed
value as the test target ("calibrated to measurement after implementation").
A test written after seeing its own result cannot fail; such pins are
**regression tripwires**, they freeze behavior, not validation of it.

As of the honesty pass (2026-07, schema v55), the core mechanisms' calibration
targets are **pre-registered** instead: `tools/targets.mjs` declares target
ranges derived from published literature *before* any tuning run, the tuning
aims at those ranges, and any miss is documented in
[grounding.md](grounding.md) rather than re-targeted. This is still
self-testing, the same author writes the targets, the code, and the tests,
but the targets can no longer be quietly moved to wherever the output landed.

The statistical apparatus deserves one more caveat. The generator's spatial
fields are produced by smoothing kernels over a region graph, and smoothing
induces spatial autocorrelation by construction; a "significant" Moran's I on
these maps is therefore expected, not discovered. The informative use of these
statistics is *comparative*, the same world under two policies, never a test
against "no structure."

## The historical record

`CHANGELOG.md` and the design documents were rewritten in place during the
honesty pass: wording that borrowed empirical authority ("measured,"
"the evidence," "adversarially reviewed") was corrected, and claims of expert
or external review were removed. The facts of the record, dates, schema
versions, what shipped when, what broke and how it was fixed, were preserved
unchanged. [old-thesis.md](old-thesis.md) tells the story of the project's
first methodological failure (a model that could not lose its argument) and
now also its second-order one (a validation apparatus that graded itself).

## How to cite this project

Don't, not as evidence about the real world. If you use it as a classroom
instrument or a procedural-generation reference, cite it as software:
*Hinterland (AI-generated procedural world generator), ZNT + Claude, 2026,
github.com/zntznt/hinterland.* For the real social science, cite the real
authors in [grounding.md](grounding.md).
