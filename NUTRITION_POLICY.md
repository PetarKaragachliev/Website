# Nutrition Calculation Policy

Status: Starting calculations and product support/consent rules approved; first calculator slice implemented on 2026-11-03. Clinical/content review and complete browser/release validation remain open; this is not release approval.

Research date: 2026-11-03. Scope: the generally healthy adult MVP described in [PRD.md](PRD.md). This document separates research findings from proposed product defaults; the sources do not validate this calculator as a whole.

## Recommended Method

Use the simplified Mifflin-St Jeor resting energy equation, an explicit activity factor, a goal adjustment, and bodyweight-based protein with remaining energy allocated to fat/carbohydrate.

Why this method:

- It uses the inputs already agreed for the MVP and does not require a potentially unreliable body-fat estimate.
- A systematic review found Mifflin-St Jeor more reliable than the other commonly used resting-energy equations it compared, including Harris-Benedict [S2]. This does not establish universal superiority across all populations or newer methods.
- Fat-free-mass-based equations would require an additional measurement; indirect calorimetry measures resting expenditure but is not available through a normal website.
- Every output remains a starting estimate. An error in resting expenditure or activity classification propagates into calorie targets.

## Resting and Daily Energy

Let `W` be current weight in kg, `H` height in cm, and `A` age in years.

```text
Male equation category:   RMR = 10 * W + 6.25 * H - 5 * A + 5
Female equation category: RMR = 10 * W + 6.25 * H - 5 * A - 161
Estimated maintenance kcal/day = RMR * activity factor
```

These simplified coefficients are given in the original paper [S1]. RMR means resting metabolic rate; it is not maintenance energy. The source used male/female categories, which are equation assumptions, not a complete account of gender or physiology. Explain this limitation; do not infer a category from name or appearance. Suitability where neither category provides a useful estimate remains a review question.

The original derivation sample comprised healthy normal-weight and obese adults aged 19-78 [S1]. Our age-18 boundary is an extrapolation and underweight users were not a represented study category. Record those limitations rather than promising accuracy throughout every profile.

Implemented activity presets below are conventional calculator heuristics, not coefficients derived or validated by the Mifflin paper or guaranteed measures of expenditure:

| Preset | Factor | Intended explanation |
| --- | --- | --- |
| Mostly sedentary | 1.2 | Mainly seated day, little intentional activity |
| Lightly active | 1.375 | Some walking/light exercise across the week |
| Moderately active | 1.55 | Regular activity plus structured training |
| Very active | 1.725 | High daily movement and substantial training |

Activity represents the whole day, including work, walking, and training. Workout days alone must not select the factor. Do not add workout calories again after using an inclusive activity estimate. UI descriptions are implemented; qualified review is still needed because these categories are imprecise.

## Goal Distinction

The owner distinguishes priorities, not different kinds of muscle: some users accept more fat gain to increase overall body weight, while others prioritize minimizing fat gain. Both can use resistance training to build muscle and strength.

The owner's target-weight/weekly-pace requirement supersedes the original fixed -15%/maintenance/+5%/+10% goal adjustment. Rates below are restricted product choices, not medically validated guarantees. Users select their desired pace; the UI shows its approximate kg/week equivalent using current weight.

| Goal | Weekly pace choices (% of current weight) | Initial calorie adjustment |
| --- | --- | --- |
| Lose fat | 0.25% or 0.5% loss/week | Subtract desired kg/week * 7700 / 7; reject deficits above 20% of estimated maintenance |
| Maintain weight | 0% | Estimated maintenance; target weight equals current weight |
| Build muscle, minimize fat gain | 0.1% or 0.25% gain/week | Add 5% or 10% of estimated maintenance, respectively |
| Gain weight and build strength | 0.25% or 0.5% gain/week | Add 10% or 15% of estimated maintenance, respectively |

The rate choices and gain-rate-to-surplus mapping are engineering defaults informed by research, not optimal percentages established for every user. The slower 0.1% muscle-focused choice is a conservative product option, not a directly established recommendation from [S3]. Larger gain paces may not suit advanced trainees. Maintenance or recomposition may better suit some users; do not prescribe a surplus solely from height and weight.

For loss only, 7700 kcal/kg is an approximate initial adjustment heuristic, not a dynamic bodyweight model. Metabolic adaptation and changing water/tissue composition make the static rule inaccurate for trajectory prediction [S10]. Gain uses modest percentage surpluses rather than assuming each gained kg has the same energy cost or represents muscle. Neither mapping promises the selected pace will occur. No completion dates are calculated.

NHS gives general 0.5-1 kg/week loss advice [S11]; our smaller bodyweight-scaled menu is a deliberately conservative software choice, not a claim that weight loss is appropriate at every supported BMI. Review actual multiweek trends and individual suitability.

Target weight must be 35-250 kg with at most one decimal place. Loss targets must be below current weight; both gain goals require a higher target. A weight-change destination must also satisfy the existing BMI support range (18.5 inclusive, below 30, using unrounded values). Target weight does not replace current weight in metabolic, protein, or pace calculations.

Paces producing calories outside 1500-4500 or a loss deficit over 20% are disabled. If all paces are unavailable, give an explicit support-limit explanation instead of asking the user to choose an impossible option. Do not silently clamp, substitute a rate, or change the goal. Pace selection waits until current weight is valid, so error links never direct users to a disabled dependent selector.

A bodybuilding review discusses approximately 10-20% surpluses for novice/intermediate bodybuilders and more conservative amounts for advanced trainees [S3]. A small later study found faster gain primarily associated with more skinfold gain rather than consistently greater hypertrophy/strength [S5]. Neither establishes the optimal surplus for all users in this MVP.

Explain both options before goal selection. Never label a result "muscle-only gain" or promise a particular muscle/fat ratio. "Clean" and "dirty" are ambiguous labels: surplus size and food quality are separate issues. Do not imply unlimited eating or low-quality food is needed for weight gain. An aggressive dirty-bulk mode remains outside the previously agreed MVP; if the owner wants it, scope and safeguards require a separate decision.

Reaching a target weight does not automatically justify a cut or predict health, body composition, or strength. Users may later choose maintenance or fat loss after reassessment; automatic bulk/maintain/cut cycling and target-date predictions are not MVP requirements.

## Macro Allocation

Approved deterministic starting rule for eligible resistance-training users:

```text
Protein grams/day = 2.0 * current weight kg
Fat grams/day = 0.25 * target kcal / 9
Carbohydrate grams/day = (target kcal - 4 * protein grams - 9 * fat grams) / 4
```

- Protein: 2.0 g/kg is within the ISSN range for most exercising individuals [S4] and within the 1.6-2.2 g/kg range discussed in the bodybuilding review [S3]. It is not a universal optimal dose, especially during deficits or at high body fat.
- Fat: 25% is an approved product default within the 20-35% range discussed in [S3], not a uniquely superior ratio.
- Carbohydrate: Remaining calories support training; this does not guarantee that every profile receives an adequate carbohydrate amount.
- Use current bodyweight, not desired future bodyweight. Review suitability at weight extremes and during fat loss before release. Do not silently clamp negative carbohydrate or otherwise infeasible allocations to zero.

## Display and Arithmetic

- Keep full numeric precision through calculation. Round only displayed kcal and grams to the nearest whole number using JavaScript `Math.round` for positive values.
- Use 4 kcal/g for protein and carbohydrate and 9 kcal/g for fat for calculator consistency, not as a guarantee of exact food-label energy.
- Unrounded macro energy must match target kcal within 0.000001 kcal in reference tests. The difference between displayed kcal and energy reconstructed from displayed whole grams must be at most 9 kcal, allowing for rounding.
- Show the calculation assumptions and the fact that actual needs vary. Suggest reassessment using a multiweek weight trend and training/recovery, not a single weigh-in. This is guidance, not a new tracking feature or automatic adjustment algorithm.
- Display desired weekly kg to two decimal places using decimal-aware `Intl.NumberFormat` (0.175 -> 0.18); show the exact selected bodyweight percentage beside it. Do not feed display rounding back into calorie calculations. Target weight displays to at most one decimal place.

## Arithmetic Reference Cases

Synthetic eligible profile: 70 kg, 180 cm, age 30, activity factor 1.55. These are arithmetic fixtures, not individualized nutrition recommendations. All four male-category rows use RMR 1680 and estimated maintenance 2604 kcal/day. Female-category maintenance uses RMR 1514 and maintenance 2346.7. Loss uses target 65 kg and pace 0.25%; muscle gain uses target 75 kg and pace 0.1%; overall gain uses target 75 kg and pace 0.25%. Maintenance keeps 70 kg with zero planned change.

| Equation category | Goal | Unrounded target kcal | Display kcal | Protein g | Fat g | Carbohydrate g |
| --- | --- | --- | --- | --- | --- | --- |
| Male | Lose fat | 2411.5 | 2412 | 140 | 67 | 312 |
| Male | Maintain | 2604 | 2604 | 140 | 72 | 348 |
| Male | Build muscle | 2734.2 | 2734 | 140 | 76 | 373 |
| Male | Gain weight | 2864.4 | 2864 | 140 | 80 | 397 |
| Female | Maintain | 2346.7 | 2347 | 140 | 65 | 300 |

These examples verify arithmetic only. They do not validate activity accuracy, safety, clinical suitability, or a working application.

## Calculator Validation and Safety Rules

Status: Nutrition support restrictions, a single eligibility confirmation, and opt-in local saving are approved product behavior. Parsing/activity/display specifications below are the first calculator implementation baseline. Numeric support bounds are conservative software-scope decisions, not diagnostic thresholds or proof of safe intake. A user outside scope is not "invalid" or necessarily unable to exercise.

| ID | Implementation rule | Observable behavior / tests |
| --- | --- | --- |
| V-001 | Keep ages 18-56 inclusive; age must be a whole number | Reject blank/fractional/nonfinite ages as input errors; explain unsupported ages without suggesting that older adults cannot exercise; test 17/18/56/57 |
| V-002 | Support weight 35-250 kg and height 130-230 cm inclusive, each to at most one decimal place | These are MVP input bounds, not healthy ranges; label units; reject blanks, nonfinite, trailing text, out-of-range values, and excess precision without silently rounding; permit dot or comma as decimal separator, not grouping separators or exponent notation |
| V-003 | Require explicit goal, equation category, and activity choices; activity factors 1.2/1.375/1.55/1.725 with the descriptions above | No preselected sex category or activity guess from workout frequency; reject arbitrary factors/unknown choices at the calculation boundary; declining an equation category leaves nutrition unavailable without preventing otherwise eligible workout setup |
| V-004 | Approved: one explicit eligibility confirmation instead of a detailed medical questionnaire; unchecked by default | Confirmation: "I understand this tool is for generally healthy adults and is not intended for pregnancy/breastfeeding, injury rehabilitation, or conditions requiring individualized nutrition or exercise guidance." Without confirmation, no personalized targets/plans; general information remains available. Explain that eating-disorder concerns and sudden/unexplained weight loss warrant qualified guidance; do not collect diagnoses or infer medical clearance |
| V-005 | Adopt the NHS adult-from-18 BMI screening convention for this MVP; calculate BMI as weight kg / height m squared without rounding before screening | Automated nutrition only at BMI >=18.5 and <30. Outside this interval, show a neutral support-limitation message and professional-guidance option rather than calorie/macronutrient prescriptions; do not block future workouts solely because of BMI if the other eligibility checks pass |
| V-006 | Support computed nutrition targets from 1500 through 4500 kcal/day inclusive, plus finite positive RMR/maintenance and positive macro amounts | Outside the envelope, explain that this calculator cannot provide a suitable automatic target; do not clamp calories, silently switch goal, or show a partial prescription. This all-user envelope is an unvalidated product guardrail, not a minimum/maximum safe intake or an endorsement of targets within it |
| V-007 | Use the restricted goal/weekly-pace mapping above; no unrestricted rates, target-date promise, or automatic bulk/cut cycle | Explain priorities and uncertainty before selection; no promise of muscle-only gain or guaranteed progress; no automatic cut on reaching a scale weight |
| V-008 | Invalidate dependent results when any relevant profile/eligibility/setup input changes; rerun validation before calculation and restoration | Hide outdated nutrition immediately after profile changes; hide outdated plans after setup/eligibility changes. Show actionable errors linked to fields; focus an error summary on failed submit; no stale result presented as current |
| V-009 | Approved: optional "Remember on this device" checkbox, off by default, and "Delete my saved data" action | Store only profile/workout inputs, plan, and saving preference needed for the feature; do not persist eligibility confirmation, diagnostic history, or analytics. On a new visit, restore permitted inputs but require the single V-004 confirmation before showing personalized results. Recompute nutrition from validated inputs; validate saved plan data. Handle storage failure without blocking unsaved use; deletion removes only this app's data and clears its displayed profile/results. Turning remembering off removes previously saved app data but may retain current in-memory inputs |
| V-010 | Validate target weight, direction, and destination BMI | Reject invalid/unsupported destinations; maintenance target is current weight; stale results disappear after target changes |
| V-011 | Weekly pace is chosen from the goal-specific allowlist and computed from current weight | Recheck rates at the calculation boundary, not only in the dropdown; show approximate kg/week; disable unsupported choices; explain when none are available |
| V-012 | Loss deficit cannot exceed 20% of estimated maintenance; final calorie and macro limits remain enforced | Withhold rather than clamp; the 20% ceiling is a conservative product guardrail, not a safety guarantee |

For V-002, a decimal comma is normalized only when it is the sole separator; values such as `1,000`, `1.2.3`, `70kg`, or `7e1` are rejected rather than guessed. Reject whitespace-only entries before numeric conversion. Validate again in JavaScript, not only through HTML form attributes.

V-005 is deliberately restrictive because current-weight protein allocation at weight extremes has not been reviewed. BMI does not distinguish muscle from fat: some muscular users will be referred unnecessarily. It is not evidence that people with BMI >=30 must not exercise or cannot use a suitable nutrition plan. The owner explicitly chose to withhold automatic calorie/macro targets for underweight users while retaining general information and otherwise eligible workouts. This does not diagnose illness or assume inadequate eating is the cause. Qualified review can support a broader later policy without implying a promised feature.

The owner approved the minimal confirmation and opt-in saving approach. The previously proposed yes/no/unsure health questionnaire is superseded, not a hidden implementation requirement. Eligibility confirmation is session-only and is not proof of health or professional clearance.

The NHS applies adult BMI screening from 18 [S7]; CDC uses BMI-for-age through 19 and adult categories from 20 [S8]. This proposal deliberately chooses one convention rather than mixing them. The choice still needs review for our audience.

The 1500-4500 envelope is not derived from a clinical trial. NIDDK's planner rejects targets below 1000 kcal and excludes pregnancy/breastfeeding [S9], but that does not establish a safe universal intake, justify our exact envelope, or make every target over 1000 appropriate. Our product limits require review before public release.

Workout guidance should also explain that sharp pain, dizziness, or chest pain is a reason to stop, with prompt medical or emergency guidance as appropriate. No maximal-strength testing, injury rehabilitation, or claims of medical clearance in generated plans. Exact exercise selection, volume, and progression remain a separate pending specification.

## Acceptance Mapping

- AC-001: V-001 and V-004 eligibility; V-005/V-006 suppress nutrition only, not otherwise eligible workouts.
- AC-002: V-002/V-003 parsing, field validation, and unsupported-choice checks.
- AC-003/AC-004: Existing approved calculations, activity/rounding proposal, V-005/V-006 support envelope, and V-007 explanation.
- AC-005/AC-006: Agreed workout input choices and explicit unsupported combinations; detailed plan rules still pending.
- AC-007 through AC-009: V-009 opt-in, restoration requiring the single eligibility confirmation, deletion, and malformed/unavailable-storage cases.
- All affected result journeys: V-008 stale-result invalidation and accessible error feedback.
- AC-011/AC-012: V-010 through V-012 target and weekly-pace validation, calculation effects, maintenance behavior, and unsupported-choice guidance.
- AC-013: Saved record version 2 includes targetWeight and weeklyRate. Keep the existing browser key `liftfuel.profile.v1` so existing users can restore base inputs. Legacy record version 1 is validated without inventing missing targets or rates; ask weight-change users to choose both. Nothing is rewritten until they opt in and calculate; eligibility is never restored.

The nutrition/profile-saving portions are exercised by tests/unit/nutrition.test.js and tests/e2e/calculator.spec.js. Workout-specific parts remain planned, not implemented; no saved workout plan exists yet. JavaScript-disabled or failed-module visits cannot submit profile inputs because the submit control remains disabled until the application initializes.

## Approval and Remaining Gates

- Retained approved baseline: Mifflin-St Jeor with activity-based maintenance estimation; protein 2.0 g/kg current weight, fat 25% of target calories, carbohydrate from remaining calories. The owner's new target/pace requirement replaces fixed goal multipliers with the documented pace-sensitive policy.
- Activity descriptions, full-precision arithmetic, whole-number display, and parsing bounds are implemented and tested as the calculator baseline.
- V-001 through V-012 calculator behavior is implemented; workout-specific storage/generation behavior is still deferred. Nutrition support limits and single-confirmation behavior are accepted product scope, not clinical validation.
- V-009 opt-in saving and deletion are approved; verify consent, restoration, deletion, and unavailable-storage behavior during implementation rather than seeking the same product approval again.
- Assign qualified review of nutrition assumptions and user-facing safety guidance before release.

APP-001/APP-002 now have implementation and unit/Chromium/Firefox evidence. WebKit verification is blocked by this host's executable installation permissions; no full browser or clinical validation is claimed. Qualified review remains a release gate, not a completed result.

## Sources

Sources were accessed on 2026-11-03. These are selected relevant sources, not an exhaustive systematic review. Database hosting does not imply NIH endorsement.

- S1: Mifflin et al. (1990), *A new predictive equation for resting energy expenditure in healthy individuals*. Original equation and simplified coefficients: https://pubmed.ncbi.nlm.nih.gov/2305711/
- S2: Frankenfield et al. (2005), *Comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults: a systematic review*. Comparative reliability and individual-error limitations: https://pubmed.ncbi.nlm.nih.gov/15883556/
- S3: Iraki et al. (2019), *Nutrition Recommendations for Bodybuilders in the Off-Season: A Narrative Review*. Bodybuilding-specific surplus and macro ranges; not a general-population trial: https://pmc.ncbi.nlm.nih.gov/articles/PMC6680710/
- S4: ISSN (2017), *Position Stand: protein and exercise*. Protein guidance for healthy exercising individuals: https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/
- S5: Helms et al. (2023), *Effect of Small and Large Energy Surpluses on Strength, Muscle, and Skinfold Thickness in Resistance-Trained Individuals*. Eight weeks, 17 completers (15 men, 2 women), poor separation of surplus groups; limited generalizability: https://pmc.ncbi.nlm.nih.gov/articles/PMC10620361/
- S6: NHS, *Healthy ways to gain weight*. General adult guidance suggests roughly 300-500 extra kcal/day and medical advice for unexplained loss; this is not the same as an optimal muscle-gain prescription. Page last reviewed March 2023; review was due March 2026: https://www.nhs.uk/live-well/healthy-weight/managing-your-weight/healthy-ways-to-gain-weight/
- S7: NHS, *Calculate your body mass index (BMI) for adults*. Adult-from-18 convention, exclusions, and BMI limitations: https://www.nhs.uk/health-assessment-tools/calculate-your-body-mass-index/calculate-bmi-for-adults/
- S8: CDC, *Adult BMI Categories* (20+) and *Child and Teen BMI Categories* (2-19). Retrieved through a text proxy when direct requests were blocked: https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html and https://www.cdc.gov/bmi/child-teen-calculator/bmi-categories.html
- S9: NIDDK, *Body Weight Planner*. Adult/pregnancy/breastfeeding exclusions and its own 1000-kcal constraint, not validation of our proposed envelope: https://www.niddk.nih.gov/bwp
- S10: Hall et al., *Quantification of the effect of energy imbalance on bodyweight*. Dynamic changes and why static energy-per-weight rules do not predict a reliable trajectory: https://pmc.ncbi.nlm.nih.gov/articles/PMC3880593/
- S11: NHS, *Tips to help you lose weight*. General gradual-loss advice, not validation of this app's exact rate choices: https://www.nhs.uk/live-well/healthy-weight/managing-your-weight/tips-to-help-you-lose-weight/
