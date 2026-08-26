// tools/targets.mjs, PRE-REGISTERED calibration targets.
//
// The rule this file exists to enforce: targets are declared from published
// literature BEFORE any tuning run, the tuning aims at them, and a miss is
// documented in docs/grounding.md, never re-targeted to wherever the output
// landed. This replaces the old discipline ("calibrated to measurement after
// implementation"), under which a pin was set by observing the implementation's
// own output and could therefore never fail.
//
// Declared: 2026-07 (the honesty pass), prior to the deferred re-derivation
// tuning runs (GitHub issues #164-#169). Citations are given as short keys into
// docs/grounding.md, which carries the full, verified, open-access references.
//
// These are still self-administered tests, the same author writes the targets,
// the code, and the suite (see docs/provenance.md). What pre-registration buys
// is narrower: the target cannot quietly move after the fact.

export const TARGETS = {
  // R4, city-size tail. Zipf's α ≈ 1 is the LARGE-system limit (Gabaix 1999);
  // small truncated systems run steeper, and the full distribution is lognormal
  // with a power tail only at the top (Eeckhout 2004). For 12–64-region worlds
  // we declare a sweep-median band rather than the asymptotic constant.
  rank_size_alpha: {
    metric: "sweep median of per-world rank-size slope α (upper-half fit)",
    range: [1.2, 1.8],
    cite: ["gabaix1999", "eeckhout2004", "gibrat1931"],
    note: "α = 1 is the infinite-system limit, not a small-system prediction. MISSED as of 2026-08 (#180), see docs/grounding.md section 4.",
    // MISSED as of 2026-08, issue #180. The band is UNCHANGED and must stay
    // unchanged: it is literature-declared, and the code moving away from it does
    // not license moving it toward the code.
    //
    // What has to be recorded is WHY, because this is not an ordinary regression.
    // Until #180, blight was renormalised to each world's own worst cell on every
    // recompute. Measured over 8 worlds, that denominator ranged 5x within a single
    // run (median; single-step moves up to 2.6x), so a cell whose own contamination
    // never changed could read double or half from one epoch to the next because
    // some OTHER cell's works opened or closed. That jitter crossed marginal cells
    // back and forth over the abandonment bar (livability < 20) and the founding bar
    // (>= 45), producing 9.6 rebirths per world. The resulting spread of town AGES
    // is what the upper-half fit was reading as a Zipf tail.
    //
    // It is an artifact, and the experiment is decisive rather than suggestive:
    // freeze main's denominator at ANY constant and α collapses to 0.65-0.70 with
    // rebirths at 0.6-1.6. At a frozen denominator of 8.0 the settled blight
    // distribution is p50 4 against main's p50 5 — the same field, the same units,
    // the same magnitudes — and α still falls from 1.255 to 0.650. The level of
    // blight is not what met this band. The MOTION of the scale was.
    //
    // So the band was being met by numerical noise, and any correct normalisation
    // removes it, not only #180's. Retaining the artifact to keep the number would
    // be target-fitting of the purest kind: preserving a bug because it makes a
    // metric look right.
    //
    // The honest route back is a real mechanism, and the same measurement points at
    // it: FIRST-TIME foundings are 0.0 per world on main AND on #180. Every "new
    // town" this engine has ever produced is a resettlement; the frontier path at
    // engine.mjs (`livability >= 45 && a settled neighbour`) has never once fired on
    // ground that never held a town, because the founding pass already settles
    // everything above the bar. Scoped separately rather than built to hit a number.
    missed_since: "2026-08 (#180)",
  },

  // R5, blight–wealth correlation. The EJ literature finds disproportionate
  // exposure of the poor via siting AND post-siting sorting (UCC 1987; Bullard
  // 1990; Banzhaf-Ma-Timmins 2019), i.e. a negative mode, but the relation is
  // channel-dependent, not a law, so both signs must stay reachable across the
  // doctrine knob (the B4 design goal, kept).
  blight_wealth_corr: {
    // AMENDMENT OF PRECISION, 2026-08 (issue #178), not an amendment of aim. The
    // original string said only "across the default sweep" and never named the
    // sample, and the two readings disagree in SIGN: the same worlds give -0.12
    // over all regions and +0.46 over settled regions only. tools/atlas.mjs was
    // publishing the former while every live acceptance check used the latter.
    // Settled-only is adopted because environmental-justice exposure is about
    // people breathing something: roughly a quarter of regions are uninhabited
    // cells that export wealth exactly 0 while carrying plume blight, and
    // correlating poison against the "wealth" of empty ground measures nothing.
    // Note this is the HARDER reading and the one the engine currently FAILS.
    // Under the all-regions reading the target would already pass, which is
    // precisely why it was not adopted: choosing the favourable definition after
    // the fact is re-aiming, and the R4 precedent (#167) only licenses making a
    // metric MORE precise, never making it easier.
    metric: "per-world Pearson corr(blight_load, wealth) over is_settled regions; sweep = 24 seeds x regions=24 x ep=10 at default knobs (db=60)",
    mode: "negative",
    both_signs_reachable: true,
    cite: ["ucc1987", "bullard1990", "banzhaf2019"],
    note: "No numeric band: the literature supports a sign tendency, not a coefficient. MISSED as of 2026-08, see docs/grounding.md section 8.",
  },

  // R3, elite share dynamics. Absent shocks, concentration drifts upward where
  // returns on holdings outrun growth (Piketty 2014); fast growth can compress
  // shares through the ordinary channel; large discrete levelings come from
  // war/plague/collapse/revolt (Scheidel 2017).
  elite_share: {
    metric: "per-epoch ordinary drift sign distribution + shock ledger",
    ordinary_two_signed: true,   // g > r regions must show ordinary compression
    upward_mode_absent_shocks: true,
    catastrophic_leveling_discrete: true,
    cite: ["piketty2014", "pikettysaez2003", "scheidel2017"],
  },

  // Resource curse frequency: deliberately NOT pinned to a number. Whether
  // resource wealth curses is conditional on institutions and disputed
  // (van der Ploeg 2011; Mehlum-Moene-Torvik 2006). The suite may assert
  // "common but not universal" (present in some worlds, absent in others),
  // nothing tighter.
  resource_curse: {
    metric: "share of worlds with a populated high-endowment/low-wealth quadrant",
    qualitative: "common, not universal, both presence and absence must occur",
    cite: ["sachswarner1995", "vanderploeg2011", "mehlum2006"],
  },

  // Verdict diversity: RETIRED as a target. The old floor (≥6 classes, none
  // over 40%) was a designed property reported as a discovery; the class
  // distribution is now reported descriptively with no acceptance floor.
  verdict_diversity: {
    retired: true,
    note: "Report the observed distribution; do not tune toward a floor.",
  },
};

// Convenience accessors for the suite.
export const alphaRange = TARGETS.rank_size_alpha.range;
