# Training Energy Integration

## Scope And Approval

The owner approved sharing nutrition inputs with workout setup, using everyday activity **outside workouts**, automatically adding estimated training energy only on training days, and saving inputs/settings beyond the tab only with Remember enabled. No initial mode selector or automatic navigation is introduced. Rest days keep the base intake, not an additional calorie reduction.

The energy estimate is a provisional, low-confidence planning model, not measured calorie expenditure, a validated individual fueling prescription, or professional approval. Existing calorie/BMI/pace support limits remain in force. Exercise generation does not require an available calorie target.

## Research

| Source | Relevant evidence |
| --- | --- |
| [2024 Adult Compendium: conditioning exercise](https://pacompendium.com/conditioning-exercise/) | Code 02054: 3.5 MET, multiple resistance exercises, 8-15 repetitions at varied resistance. Code 02050: 6 MET, vigorous lifting. No automatic vigorous category based on self-reported experience. |
| [Official unit conversion](https://pacompendium.com/unite-conversions/) | Gross kcal = MET x 3.5 x kg / 200 x minutes. The simpler MET x kg x hours convention differs by about 5%; it is not mixed into this model. |
| [Compendium inactivity categories](https://pacompendium.com/inactivity/) | Quiet standing is 1.3 MET, used here only as a provisional setup/transition assumption. It is not a measurement of inter-set recovery. |
| [Herrmann et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC10818145/) | Standard MET categories are population estimates, not precise individual expenditure. Adult Compendium scope is ages 19-59. |
| [Mitchell et al., 2024 scoping review](https://pmc.ncbi.nlm.nih.gov/articles/PMC11393209/) | Resistance exercise measurement is difficult; inter-set recovery contributes, study timing boundaries differ, and anaerobic energy is not fully represented by oxygen measurements. No universal afterburn multiplier is justified. |
| [Official corrected-MET guidance](https://pacompendium.com/corrected-mets/) | Standard or corrected METs do not replace individual measurement or eliminate estimation error. |

## Implemented Calculation

The workout model already specifies upper repetition bounds, sets, between-set rest, setup, five minutes of warmup and three minutes of cooldown. These are **planned**, not timed or observed, quantities. Four seconds per upper-bound repetition is retained from the existing session budget. A prescription can be completed differently or not at all; no completion is inferred.

For each session:

```text
liftingMinutes = sum(4 * upperRepetitions * sets
                     + (sets - 1) * restSeconds) / 60
setupMinutes = sum(setupSeconds) / 60
includedMinutes = liftingMinutes + setupMinutes

grossIncludedKcal = currentWeightKg * 3.5 / 200
                   * (3.5 * liftingMinutes + 1.3 * setupMinutes)
alreadyAllocatedKcal = baseMaintenanceKcal / 1440 * includedMinutes
extraKcal = max(0, grossIncludedKcal - alreadyAllocatedKcal)

restDayIntake = originalBaseIntake
trainingDayIntake = originalBaseIntake + extraKcal
```

The 3.5 MET category covers each conventional lifting block including its ordinary between-set rest. We do not multiply every rest minute by a quiet-rest MET, because recovery after a set is not quiet resting physiology. Setup gets a separate 1.3 MET assumption. No calorie credit is given for unspecified warmup/cooldown activities, walking suggestions, incidental cardio, or post-session afterburn.

Subtracting the allocated baseline is an **accounting assumption**, not a Compendium-validated physiological equation: the existing Mifflin resting estimate times outside-workout activity already allocates energy across all 1440 minutes. Subtracting only 1 standard MET would not necessarily remove that overlap. The real displaced activity may differ from the day's average; this model cannot know it.

The category's closest description is 8-15-repetition lifting, while some existing plans include 6-10 repetitions or light technique. Applying the same category to those blocks is explicitly provisional. No circuit, maximal-effort or 6-MET upgrade is inferred. A true measurement-backed implementation would require actual protocol, elapsed timing and individual assessment; this product provides none of those.

## Independent Arithmetic Fixture

For 80 kg, base maintenance 2400 kcal, one exercise with two sets of 8-10 repetitions, 90 seconds between sets and 60 seconds setup:

```text
liftingMinutes = (4 * 10 * 2 + 90) / 60 = 17/6
setupMinutes = 1
grossIncludedKcal = 80 * 3.5 / 200 * (3.5 * 17/6 + 1.3)
                 = 15.7033333333
alreadyAllocatedKcal = 2400 / 1440 * 23/6 = 6.3888888889
extraKcal = 9.3144444444
```

This is an isolated arithmetic fixture, not an expected whole-workout burn. Unit tests use independently calculated cases, invalid timing inputs, age boundaries, support limits and nonaccumulation checks.

## Daily Targets And Limits

Seven rows follow the actual Monday-Sunday schedule generated by the workout model. Training credits differ if session workloads differ; unused duration is not charged. Rest days remain unchanged. Each regeneration starts from the nutrition baseline rather than the previously adjusted intake.

- The original absolute deficit or surplus remains unchanged; extra expenditure is added once, without another percentage adjustment.
- Protein remains 2 g/kg of current weight every day. Fat remains 25% of each day's calories; carbohydrate receives the remaining energy.
- All calculations retain precision internally. Daily table kcal and additions round to the nearest 10; gram values round for display. Rounded columns need not exactly reconcile.
- A training-day target outside 1500-4500 kcal or with invalid macro allocation is withheld, not clamped. Other valid days remain available.
- At age 18, exercise generation remains available but this adult MET estimate and training-day targets are withheld. The supported estimator ages are 19-56, the overlap of the app and source scopes.
- Valid general profiles blocked by nutrition BMI/calorie/pace limits can still generate exercises. If every pace is blocked, an explicit blank pace may be shared, but no explanatory candidate is persisted as a selected pace and no calorie table is invented.
- A training day is a scheduled day, not proof a session happened. If the schedule is not followed, its estimate does not describe actual expenditure. No wearable calories are added.

## Shared Inputs And Consent

Age, current weight, goal and outside-workout activity are entered only on nutrition. The full canonical nutrition profile remains available to recompute the same baseline. Workout settings contain only environment, equipment, experience, days, duration and current-training history. Eligibility must be freshly affirmed and is never transferred or persisted.

Committed inputs travel through versioned session storage; pending nutrition edits use an allowlisted tab-only draft and invalidate workout linkage. Remember opt-in additionally permits local persistence of profile and the six workout settings. Generated plans, calorie results and health affirmations are recomputed, not stored. Legacy profile versions 1-5 preserve measurement origins, but their old activity selection is cleared in the UI for explicit outside-workout reselection; new standalone profiles are v6.

Remembered session snapshots reconcile with the persistent source so another tab cannot restore revoked consent or deleted/replaced inputs. Changes invalidate prior credits; eligibility-only reconfirmation preserves an unchanged committed setup. Storage failures produce warnings, with no unconsented persistent fallback. Deletion targets app-owned keys rather than clearing unrelated browser data. Inputs are not placed in navigation URLs or provider requests.

A pending nutrition draft independently blocks old shared inputs even if a separate invalidation write fails. Draft remembering preferences are historical, not authorization: restoration checks current persistent consent before enabling Remember. Session data may survive a browser's session-recovery feature; it is not a secure vault or a guarantee of erasure on closing a window.

## Review Still Required

Engineering tests establish implementation consistency, not individual safety or energy accuracy. Qualified review of the MET category, timing assumptions, baseline accounting, activity factors, compensation policy and macro targets remains open. Existing health exclusions and eating-disorder/sudden-weight-change guidance remain applicable. Adjust real-world nutrition using multiweek trends and qualified guidance, not precision claims about a predicted workout.
