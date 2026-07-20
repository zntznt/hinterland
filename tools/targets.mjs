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
    note: "α = 1 is the infinite-system limit, not a small-system prediction.",
  },

  // R5, blight–wealth correlation. The EJ literature finds disproportionate
  // exposure of the poor via siting AND post-siting sorting (UCC 1987; Bullard
  // 1990; Banzhaf-Ma-Timmins 2019), i.e. a negative mode, but the relation is
  // channel-dependent, not a law, so both signs must stay reachable across the
  // doctrine knob (the B4 design goal, kept).
  blight_wealth_corr: {
    metric: "per-world corr(blight_load, wealth) across the default sweep",
    mode: "negative",
    both_signs_reachable: true,
    cite: ["ucc1987", "bullard1990", "banzhaf2019"],
    note: "No numeric band: the literature supports a sign tendency, not a coefficient.",
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
