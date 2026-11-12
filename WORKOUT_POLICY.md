# Workout Model Policy

## Status

Development preview, updated 2026-11-12. Not clinically validated. Qualified exercise-policy review is NOT complete. The owner approved strength plus separate movement guidance and the shared nutrition/workout integration, NOT the detailed exercise selection, dosing, timing assumptions or progression below. Those details and the energy estimate remain provisional engineering choices. Guidelines do not validate this generated plan or certify individual safety.

The pure model lives in `public/js/workout.js`, with independent unit tests and a Bulgarian form in `public/training.html`. The UI imports the validated common profile from nutrition; only environment, equipment, experience, days, duration and current training are entered here. Input snapshots/drafts are tab-session only by default; remembering explicitly permits persistent profile/six-setting inputs, never eligibility/results. Media follow EXERCISE_MEDIA.md; generation remains deterministic.

After workout generation both pages automatically show seven daily intakes when supported. Rest keeps base nutrition; training adds only estimated expenditure above allocated maintenance, never cumulative credits. See [TRAINING_ENERGY_POLICY.md](TRAINING_ENERGY_POLICY.md) for exact sources and method: 3.5 MET for sets plus ordinary between-set rests, 1.3 for setup; subtract `BMR * outsideActivityFactor / 1440` per included minute, flooring the session extra at zero. Warmup, cooldown, walking and afterburn earn no credit. Integrated estimation supports ages 19-56; age 18 can exercise without training energy. Whole blocked-day intakes are withheld, not clamped.

## Fixed Contract

The sole export is the synchronous, pure `calculateWorkout(input)`. It returns exactly `{ errors, plan }`: validation failure gives Bulgarian field messages and `plan: null`; success gives `errors: {}` and a plan. It neither mutates inputs nor shares mutable output arrays across calls. No imports, browser APIs, network calls or storage.

| Input | Accepted values |
| --- | --- |
| `age` | Integer number 18-56 inclusive, or exactly two decimal digits representing that range |
| `eligible` | Exactly `true`, freshly confirmed for this workout calculation |
| `environment` | `'gym'`, `'home'` |
| `experience` | `'beginner'`, `'intermediate'`, `'advanced'` |
| `days` | Strings `'2'`, `'3'`, `'4'`, `'5'` |
| `duration` | Strings `'30'`, `'45'`, `'60'` |
| `activity` | `'sedentary'`, `'light'`, `'moderate'`, `'very'` describing activity outside planned training; supplied by nutrition |
| `currentTraining` | `'none'`, `'one-two'`, `'three-plus'` |
| `goal` | `'lose'`, `'maintain'`, `'muscle'`, `'gain'` |
| `equipment` | Required dense array, no duplicates: `'dumbbells'`, `'bands'`, `'bench'`, `'pullup'`, `'barbell'`, `'kettlebell'`, `'rack'`, `'dips'`, `'multigym'`; `[]` is valid but not sufficient |

All fields are independently validated, including equipment for gym inputs. Bodyweight is implicit at home. Unknown extra properties are ignored. Weight, height, BMI, calorie values and nutrition limitations cannot block this pure model. The integration uses common weight for energy, not exercise selection. All four goals share this strength prescription; the separate nutrition model supplies the goal adjustment. A valid BMI/base-energy-limited profile can generate exercise without calorie days; all-paces-blocked shared profiles may explicitly keep `weeklyRate: ''`, never an invented selected pace.

Plan shape:

```text
{
  title, summary,
  sessions: [{
    title, dayLabel, estimatedMinutes, warmupMinutes,
    exercises: [{ id, name, sets, reps, restSeconds, setupSeconds, equipment, cues, progression }],
    cooldownMinutes
  }],
  movement: { title, items, caveat },
  progression, warnings
}
```

All human-readable strings are Bulgarian. `id` is a stable ASCII machine identifier, not display copy. `reps` is a numeric range string, inclusive, e.g. `'8-10'`. Exercise `equipment` contains Bulgarian display labels, NOT the input tokens. Numeric time fields are minutes except `restSeconds` and `setupSeconds`; `estimatedMinutes` is deliberately unrounded and may be fractional. Arrays in `cues`, `progression`, `warnings` and `movement.items` contain strings. There are no extra session/exercise metadata fields.

## Eligibility Boundary

Generally healthy adults aged 18-56 only. A single general confirmation covers pregnancy, breastfeeding, injury rehabilitation and relevant medical conditions requiring individualized exercise advice. This is not a diagnosis questionnaire, clinical screening or an assertion that excluded people should not exercise.

`eligible` must be supplied explicitly each time. The pure model can reject a missing/false value but cannot establish that a boolean represents a fresh user action. The form shows a new full general confirmation and clears it after successful generation; it never reuses nutrition eligibility or restores it from storage. Renewing nutrition eligibility with unchanged inputs may preserve valid workout settings and recomputed totals. Relevant profile/setup edits invalidate credits; session-only drafts never become persisted results. Source rechecks and cross-tab revocation/replacement must not resurrect stale inputs, credits or consent.

## Provisional Strength Policy

| Weekly selection | Example days | Structure |
| --- | --- | --- |
| 2 | Monday, Thursday | Full body both days |
| 3 | Monday, Wednesday, Friday | Full body each day |
| 4 | Monday, Tuesday, Thursday, Friday | Upper, lower, upper, lower |
| 5 | Monday, Tuesday, Thursday, Friday, Saturday | Upper, lower, upper, lower, light full-body technique |

Output day labels are Bulgarian. Full-body essentials are knee-dominant, hip-dominant, push and pull. Upper essentials are push and pull; lower essentials are knee- and hip-dominant. Repetition of fixed sessions is intentional, not random variety. Optional core, bilateral calf raises and light lateral raises follow the essential patterns, in that priority order for full-body sessions. Upper adds lateral raises then core; lower adds calves then core. No maximal testing, ballistic work, compulsory failure training, supersets or unilateral timing ambiguity. Alternating core repetitions are counted as total across both sides.

| Experience | Regular sets | Regular repetitions |
| --- | --- | --- |
| Beginner | 2 | 8-10 |
| Intermediate | 2 | 8-12 |
| Advanced | 3, reduced to 2 for essentials if needed to fit | 6-10 |

Essential rests are 90 seconds; accessory rests are 60 seconds. Pull-ups use 4-6 repetitions, not an assumed novice capacity. The fifth session always has one set per essential movement, 6-8 repetitions (pull-ups 3-4), 60-second rests, no accessories and at least four repetitions in reserve. Regular work targets at least three repetitions in reserve. These are conservative initial prescriptions, not optimization for advanced athletes.

Beginners are explicitly advised to start with 2-3 days even if requesting the complete 4/5-day preview. The generated schedule is provisional, not an instruction to jump immediately from no training to five days. Allow roughly 48 hours between demanding work for the same muscle group. Saturday technique follows Friday lower work and must be skipped if residual fatigue exists; it is not a fifth hard workout. Recovery needs override the example calendar.

Progress only after two comfortable exposures at the top of the range with reserve and stable technique. Use the smallest available weight increment and return to the lower repetition bound. Bodyweight progression stays within the range before seeking an appropriate next variation from an instructor. Reduce load/sets or omit accessories when recovery is poor; do not increase strength and cardio simultaneously. No guaranteed results; integrated energy is a low-confidence planned estimate, not measured calorie burn.

## Equipment Safety

Gym assumes a leg press, chest-press machine, seated low-row cable and suitable light dumbbells. Those assumptions are stated in every gym plan. Missing equipment or unfamiliar settings require instructor help, not an automatic substitute. Gym selection is unchanged; no one-repetition-maximum testing.

Home selection is deterministic. Pulling priority: multi-gym, barbell (taken from rack when selected), dumbbells, kettlebell, bands, then existing pull-up ability for intermediate/advanced users. Hinge priority: barbell, dumbbells, kettlebell, floor bridge. Squat priority: kettlebell, bodyweight. Push priority: multi-gym, dumbbells with bench, dumbbells from floor, wall push-up. Rows use both arms simultaneously. A bench enables dumbbell bench press but does not solve pulling.

All nine equipment choices appear in one home fieldset/grid. Capability tokens and confirmations were removed before workout saving existed; removed tokens remain rejected as unknown equipment, not migrated into current saved settings. Equipment never establishes mastered technique. No barbell back squats or dips are prescribed at any experience level. Barbell includes suitable plates and collars; use only easy loads and familiar handling, otherwise seek instruction. With barbell and rack, the row uses stable, equally adjusted hooks just below standing hand height, a checked empty-bar pickup/return, and clear space to step back and row off the hooks. It is not a squat or an inverted row. If the setup is unsuitable, do not execute it; seek instruction and recalculate with other gear. Kettlebell squat, hinge and row are controlled two-handed movements, not swings or other ballistic lifts.

At home, dip bars replace the optional bilateral calf raise (`calf`) with `supported-calf`: light hand contact for balance on correctly installed, stable parallel bars of suitable height for an upright stance. Both feet stay on a flat non-slip floor, with forefeet remaining grounded while the heels rise and lower; no step, hanging, bodyweight loading of the bars, added weights, dips or makeshift supports. If the installation, stability or height is unsuitable, skip the accessory and seek instruction. The model cannot verify these conditions. The replacement keeps the existing calf accessory priority, sets, repetitions, 60-second setup, accessory rest and bodyweight progression; it is included only when the full accessory fits the budget, never on upper-only or light fifth sessions. Gym plans and home plans without dip bars retain plain calf raises. Dip bars alone still cannot supply pulling; no supported push or mastered dips are assumed.

Multi-gym selection yields a conditional plan requiring manufacturer-designated chest-press and row stations and familiar settings. The checkbox does not verify those features or skill. If either is absent or unfamiliar, the output states the plan is not executable: do not improvise; get instruction or deselect and recalculate with other equipment. These warnings are limitations, not safety certification.

Bodyweight, bench, rack or dip station without a supported pulling route return `errors.equipment`, with no incomplete plan. A multi-gym supplies pulling only under the stated station/setup assumptions, not verified by the model. A beginner with only a pull-up bar (even with a bench) also receives that error: the model cannot assume scalable, controlled pull-ups. Intermediate/advanced pull-up-bar-only plans explicitly require already mastered repetitions with reserve. If those are unavailable, obtain suitable pulling equipment and recalculate, without testing a maximum or improvising supports. The existing pull-up warning and route remain unchanged.

Band rows use a suitable intact band around shod feet according to manufacturer instructions. A generic band token cannot establish suitability: the output warns that unsuitable bands make the plan unexecutable without other equipment. No door/towel/table anchors or furniture pulling substitutes. A pull-up bar must be correctly mounted and rated. The model cannot inspect gear or assess execution.

## Time Budget

Every session includes five minutes of warmup (general movement and easy preparatory repetitions) and three minutes of cooldown. For each exercise:

```text
exerciseSeconds = sets * upperRepBound * 4
                + (sets - 1) * restSeconds
                + setupSeconds
sessionSeconds = 5 * 60 + sum(exerciseSeconds) + 3 * 60
estimatedMinutes = sessionSeconds / 60
```

Four seconds per repetition represents controlled movement, approximately two seconds each direction. Setup/transition is 60 seconds normally, 90 for multi-gym, and 120 for barbell row (including pickup from rack), barbell hinge or dumbbell bench press, including the first exercise. Only between-set rests are counted; the transition covers movement between exercises. This is a transparent estimate, not measured individual completion time.

Allocate essentials first. If three-set essentials exceed the selected budget, reduce them to two sets without shortening rests. All supported minimum essential sessions fit. Add each accessory only if its full time fits, otherwise omit it. Do not pad short sessions to the requested ceiling. Never round an over-budget session down. Actual queues, learning, bar access, individual rests or warmup may take longer: omit accessories or end within the chosen window rather than rush or shorten necessary rest.

## Separate Movement Guidance

No universal step target. Separate movement guidance earns no calorie credit. Outside-training activity is a baseline description, not measured aerobic minutes or a training history. The two inputs are kept separate:

- Sedentary with no current training: provisional start of 5-10 comfortable walking minutes on three days; after a comfortable week add five minutes to one walk only if recovering well. With existing training, account for current cardio/walking first and do not automatically add walks; optional comfortable sitting breaks do not override recovery.
- Light: optional 10-15 walking/cycling minutes on two days if above normal activity and tolerated; increase one session gradually.
- Moderate: account for existing work, transport and cardio first; an additional easy 10-15-minute session is optional.
- Very active/physical worker: no mandatory additional walking or cardio; prioritize recovery, with optional easy movement.
- No current training: lower end initially, hold for 1-2 weeks; do not increase walking during a week introducing strength.
- Current 1-2 sessions: replace corresponding existing sessions, do not stack plans; retain tolerated cardio.
- Current 3+ sessions: replace existing strength work, do not automatically add cardio.

All 12 activity/history combinations include both messages. Existing daily movement counts according to actual intensity. Strength time is not automatically counted as aerobic time. The public-health reference of 150-300 moderate aerobic minutes/week or equivalent is a long-term orientation, NOT an immediate dose or evidence that a worker already meets it. Moderate effort is described using the ability to speak in sentences.

## Sources And Limits

Accessed via webfetch on 2026-11-05:

- [WHO: Guidelines on physical activity and sedentary behaviour (2020)](https://www.who.int/publications/i/item/9789240015128). Primary guideline publication page; evidence-based population recommendations, including strength and aerobic activity. The page was accessed, not the complete linked PDF.
- [WHO: Physical activity fact sheet](https://www.who.int/news-room/fact-sheets/detail/physical-activity). Public guidance: all movement counts, some activity is better than none, work/transport/leisure matter, reduce sedentary time. Its retrieved text references at least 150 moderate minutes/week. The broader guideline reference is 150-300 minutes and strength on at least two days; this model does not assert that its schedule guarantees compliance.
- [ACSM: Progression models in resistance training for healthy adults (2009), DOI 10.1249/MSS.0b013e3181915670](https://doi.org/10.1249/MSS.0b013e3181915670). Primary ACSM position stand, abstract retrieved through [Europe PMC's public record API](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:19204579&format=json&resultType=core). Supports context-dependent prescription, large/multijoint movements before accessories, novice 2-3-day frequency and progression after exceeding a repetition target. This is an older position stand, not a claim of an exhaustive current ACSM review. Full text was not reviewed. Its RM/heavy-loading prescriptions are NOT copied: the preview deliberately avoids maximum testing and failure and uses modest loads with reserve.

Access limitations: PubMed's page for PMID 19204579 returned a cookies interstitial; `https://acsm.org/resistance-training-benefits/` returned HTTP 403. Neither was treated as reviewed substantive guidance.

The exact catalog, set/repetition/rest choices, five-day structure, reserve targets, movement starting doses, increments and timing constants are provisional design choices, not direct WHO/ACSM prescriptions. Qualified review and explicit owner approval of these details remain outstanding. Self-report, broad activity categories, unverified equipment and inability to observe technique limit individual suitability. No pregnancy/rehab/condition-specific advice is implemented.

## Verification

Current integration evidence (2026-11-12): latest unit run passed 426 tests. Initial browser matrix passed 573 and failed 2: session-storage instance mocking was ineffective in Firefox/WebKit. Main corrected the prototype-level test and is running final verification; no final matrix pass is claimed here. Traceability includes `tests/e2e/integration.spec.js`, `tests/unit/shared-plan.test.js` and `tests/unit/training-nutrition.test.js`. The following records are historical runs, not current totals.

Supported-calf follow-up: the new route regression failed before implementation. Final `node --test --test-reporter=spec tests/unit/workout.test.js` passed all 95 tests; Chromium desktop training E2E passed all 23 checks using the same temporary config and reused server, with media capture disabled. Tests verify actual accessory selection/removal, plain-calf equivalence, conservative cues, gym isolation, omission when the budget is exhausted and no accessory on upper-only/light fifth sessions. The subset/budget matrix now keeps dip-bar and no-dip-bar routes distinct. A first test incorrectly assumed every 30-minute band plan must omit calves; the beginner version fits exactly, so the pruning scenario uses the genuinely tighter barbell/rack setup instead. Full-suite/all-project verification is left to the coordinating agent for this follow-up.

Equipment-only follow-up: the updated unit spec first failed on the missing rack-row route (92 passed, 2 failed), then passed after implementation. `npm test` passed all 389 tests, including 94 workout tests. `npx playwright test tests/e2e/training.spec.js --config C:\Users\Petar\AppData\Local\Temp\opencode\liftfuel-nutrition.config.mjs` passed all 110 checks across Chromium desktop/mobile/tablet, Firefox and WebKit, reusing the server with screenshots, traces and video disabled. The nine-token subset matrix checks order independence, equipment requirements, pattern completeness and exact budgets across every selected route, level, day count and duration. These engineering checks do not validate individual exercise safety.

Spec-first tests were written before `workout.js` existed. `node --test --test-reporter=spec tests/unit/workout.test.js` first failed with `ERR_MODULE_NOT_FOUND` (0 passed, 1 failed), then passed the initial 88 tests after implementation.

Expanded tests exposed a real sparse-equipment-array validation defect and an overly strict floating-point seconds round-trip assertion. Dense validation now examines array holes; the timing assertion compares the specified seconds/60 value directly, without rounding or waiving budget checks. The final `node --test --test-reporter=spec tests/unit/workout.test.js` run passed all 91 tests, with zero failures or skips.

Subsequent review added a behavior-level regression for sedentary users with existing training. It failed before the conditional movement guidance fix; the final workout suite passed all 92 tests. Restored eligibility/equipment and history-page handling received failing-then-passing browser regressions. The complete local run passed 387 units and 192 browser checks; professional policy validation remains outstanding.

Tests exercise the real calculator: export/shape, determinism and isolation, malformed fields and age boundaries, fresh-boolean requirement, no BMI/calorie gate, all gym schedules/levels/budgets, all home equipment subsets, home schedules/budgets for each pulling route, independent pattern and timing invariants, Bulgarian display strings, light fifth sessions, equipment safety warnings and all 12 movement branches. UI integration and browser results are recorded in STATUS.md.
