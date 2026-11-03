# Product Requirements

Status: First calculator slice implemented against the agreed scope and documented validation rules. Detailed workout rules, qualified content review, and full release validation remain open.

`TBD` means undecided, not an implied requirement. Agreed scope below does not imply that implementation or verification is complete.

## Product Definition

| Field | Decision |
| --- | --- |
| Product name | LiftFuel (temporary working name, not trademark/domain checked) |
| Problem to solve | Help users estimate nutrition targets and choose a concrete workout routine |
| Primary users | Generally healthy adults aged 18-56, inclusive |
| Main user outcome | Obtain estimated daily calories/macros and an actionable gym or home workout plan |
| Product owner / approver | Project owner |
| Target release date | TBD |

## Goals and Success

| Goal ID | User or business outcome | Metric and target | Measurement method |
| --- | --- | --- | --- |
| G-001 | Obtain understandable nutrition estimates | Every supported valid profile produces targets consistent with the approved calculation policy | Independent calculation tests and end-to-end journey |
| G-002 | Follow an actionable workout plan | Each generated exercise has sets, reps, rest, technique cues, and progression guidance and respects selected equipment | Plan invariant tests and manual content review |

## Scope

- MVP capabilities: Adult nutrition calculator; four goals (lose fat, maintain weight, build muscle, gain weight); gym and home workout generation; metric inputs; local saving and deletion.
- Explicit non-goals: Accounts, backend services, cross-device syncing, imperial units, aggressive/dirty-bulk prescriptions, rehabilitation, and medical nutrition or exercise prescriptions.
- Deferred capabilities: Technique videos and support for ages 16-17. The teen experience requires a separate reviewed approach, not reuse of adult prescriptions.
- Dependencies and constraints: HTML, CSS, and JavaScript in the browser; no frontend framework assumed. Calculation policy and exercise content must be defined and reviewed before release.
- Safety boundary: Do not generate personalized targets or plans for users outside ages 18-56 or users reporting pregnancy, injuries, or relevant medical conditions. Explain the limitation and recommend qualified guidance without attempting diagnosis.
- Nutrition outputs are estimates, not guaranteed results or medical advice. Muscle-focused gain prioritizes minimizing fat gain; overall weight gain prioritizes increasing bodyweight while accepting some fat gain. Neither promises muscle-only gain. Approved starting calculations and remaining gates are in [NUTRITION_POLICY.md](NUTRITION_POLICY.md).
- Agreed workout options: Beginner/intermediate/advanced; 2-5 days per week; 30/45/60-minute sessions. Home equipment choices: bodyweight, dumbbells, resistance bands, bench, and/or pull-up bar. Precise equipment capabilities and compatible exercise combinations still need definition.

## User Journeys

| Journey ID | User | Starting condition | Action | Expected outcome |
| --- | --- | --- | --- | --- |
| J-001 | Eligible adult | New visit | Enter metric profile, activity level, formula sex category, and goal | See estimated daily calories, protein, carbohydrates, and fat with assumptions |
| J-002 | Eligible adult | Workout setup | Select environment, equipment, experience, days/week, session length, and limitations | See a compatible plan with exact exercises and written guidance |
| J-003 | Returning user | Previously saved on this browser | Reopen site or delete saved data | Restore saved profile/plan or remove it through an explicit delete/reset action |

## Functional Requirements

All requirements below are MVP scope and high priority. Refine policy-dependent criteria before marking implementation items Ready.

| Requirement | Linked goal / journey | Behavior |
| --- | --- | --- |
| FR-001: Eligibility and validation | G-001, G-002 / J-001, J-002 | Validate age/profile inputs and require a single general-health eligibility confirmation; explain exclusions without a detailed medical questionnaire |
| FR-002: Nutrition estimate | G-001 / J-001 | Use current/target weight (kg), height (cm), age, activity, equation category, goal, and a restricted weekly pace shown in kg/week; explain initial calorie adjustment and uncertainty |
| FR-003: Workout generation | G-002 / J-002 | Use environment, equipment, experience, schedule, session length, and limitations to select exact exercises with complete written guidance |
| FR-004: Local persistence | G-001, G-002 / J-003 | Save profile and plan only with optional "Remember on this device" consent (off by default); explain shared-device implications and provide "Delete my saved data" |
| FR-005: Video-free first release | G-002 / J-002 | Provide useful text instructions without implying that unavailable videos exist |
| FR-006: Daily nutrient references | G-001 / J-001 | Show all requested nutrients as sourced intake references, limits, or nonnumeric guidance; distinguish these from actual food intake; use age/category-specific DRIs where applicable |
| FR-007: Flexible meal structure | G-001 / J-001 | Suggest four eating occasions with an optional four-hour example and even calorie/protein split; explain that three or four meals can work and no interval is universally healthiest |
| FR-008: Optional body assessment | G-001, G-002 / J-001, J-002 | Combine BMI/waist-to-height indicators with optional existing body-fat estimate/method and explicitly self-reported description; explain goal tradeoffs without inferring muscle or changing calories/exercises |

| Acceptance ID | Requirement | Given / When | Observable outcome |
| --- | --- | --- | --- |
| AC-001 | FR-001 | Age is below 18 or above 56, or the single eligibility confirmation is not given; request generation | Personalized nutrition and workout generation is blocked with an explanation; general information remains available; no detailed health questionnaire or claim of medical clearance |
| AC-002 | FR-001 | Required numeric input is empty, nonnumeric, nonfinite, or outside approved bounds; submit | Clear field-level feedback; no new result is generated from invalid input |
| AC-003 | FR-002 | Eligible profile with valid inputs; calculate for each supported goal | Daily kcal and protein/carbohydrate/fat grams match the approved formula, adjustments, allocation, and rounding policy |
| AC-004 | FR-002 | Nutrition results are displayed | Show estimate limitations, selected goal, and calculation assumptions; calorie/macro consistency follows the approved tolerance |
| AC-005 | FR-003 | Supported equipment and schedule; generate a plan | Plan uses only available equipment, follows approved schedule/time rules, and includes exact exercises, sets, reps, rest, technique cues, and progression |
| AC-006 | FR-003 | Equipment, schedule, or limitations cannot support an approved plan | Explain that no suitable plan is available; do not silently substitute an incompatible one |
| AC-007 | FR-004 | Remembering is explicitly enabled and profile/plan is saved; reload the same browser | Restore valid selections; show personalized results/plan only after a new single eligibility confirmation; no account required |
| AC-008 | FR-004 | Saved data exists; activate delete/reset, then reload | Saved profile and plan remain removed; a new user state is shown |
| AC-009 | FR-004 | Storage is unavailable or saved data is malformed; open/use site | Site remains usable, explains unavailable saving when applicable, and does not display invalid saved results |
| AC-010 | FR-005 | Any generated exercise is displayed | Written guidance is available; no broken video players or claims of available technique videos |
| AC-011 | FR-002 | Choose a weight-change goal and target | Target is required, has at most one decimal place, agrees with the goal direction, and stays within supported bounds/BMI; maintenance keeps current weight |
| AC-012 | FR-002 | Choose or edit a weekly pace | Only goal-specific rates are selectable; show bodyweight-scaled kg/week and selected target in results; changing pace recalculates calories/macros; unsupported choices are disabled and all-unavailable cases get an explanation, not an impossible selection error |
| AC-013 | FR-004 | Restore a saved profile from before or after target/pace fields existed | New profiles retain target and pace; legacy base inputs are validated/restored without inventing missing plan choices; eligibility still requires a fresh confirmation |
| AC-014 | FR-006 | Eligible valid nutrition result | Display 12 nutrient rows: fiber, free/added sugar at kcal *0.05 /4, saturated fat, cholesterol (FDA Daily Value 300 mg/day), sodium, potassium, vitamins A/C, calcium, iron, ALA omega-3 in mg/day, and magnesium; no separate total-sugar/MUFA/PUFA/trans rows or universal cholesterol maximum claim |
| AC-015 | FR-006 | Change age/category/calories and recalculate | Age 18, 19, 30/31, and 50/51 reference boundaries follow NUTRIENT_REFERENCES.md; energy-based references update without implying measured intake or supplement doses |
| AC-016 | FR-007 | Display meal guidance | Four optional occasions at example times 08:00/12:00/16:00/20:00; estimated per-occasion energy/protein divide existing totals; four hours is not claimed healthiest or mandatory |
| AC-017 | FR-006, FR-007 | Eligibility/input changes, unsupported output, or reload before confirmation | Hide nutrient/meal guidance with other stale results; supported recalculation refreshes it; maintain responsive and keyboard-accessible navigation |
| AC-018 | FR-008 | Enable assessment and provide valid age/current weight/height/waist plus any optional estimate/method/description | Show approximate measurement-based profile, BMI and waist ratio; interpretation uses unrounded NICE thresholds below BMI 35; no inferred muscular/low-muscle label, diagnosis, or silent plan change |
| AC-019 | FR-008 | Nutrition inputs/targets are unavailable or not selected, but body-assessment inputs and eligibility are valid | Standalone assessment works without nutrition goal/category/activity; valid assessment can coexist with a nutrition-limit explanation, including all-disabled pace choices |
| AC-020 | FR-004, FR-008 | Save/reload, withdraw eligibility, disable assessment, or delete | Remember only validated opted-in measurements in version-3 records, never interpretation/eligibility; restore v1/v2 profiles without inventing measurements; hide stale results; disabling and saving removes stored body details |

Review stale-result behavior after changing eligibility or profile inputs when refining UI criteria. No previous result should be presented as a newly valid prescription for an excluded profile.

## Quality Requirements

Dark/green direction is agreed. Detailed accessibility/browser targets below remain proposed engineering acceptance specifications.

| Area | Required behavior or target | Verification method |
| --- | --- | --- |
| Responsive layout and supported viewports | Proposed checks at 360x800, 768x1024, and 1440x900; no horizontal page overflow; reflow check at 320 CSS px | Browser journeys and manual zoom/reflow review |
| Accessibility standard and keyboard behavior | Proposed WCAG 2.2 AA target; labels, keyboard controls, visible focus, linked field errors, error summary focus, reduced motion; do not communicate state by green/red alone | Contrast checks, manual keyboard/zoom/screen-reader checks; no conformance claim from automation alone |
| Supported browsers | Proposed current Chromium/Chrome/Edge, Firefox, and WebKit coverage; actual Safari/mobile-device spot checks before release where available | Playwright browser matrix and recorded manual checks; emulation is not real-device proof |
| Performance and measurement conditions | TBD | TBD |
| Security and privacy, including data handling | No backend or accounts; explain device-local profile saving and deletion; no analytics or external data transmission approved | Storage lifecycle tests and network review |
| Reliability and error recovery | TBD | TBD |

## Visual Direction

- Reference: https://dribbble.com/services/266278-Mobile-App-UI-UX-Design by Edu Sites. Reviewed the linked page and its first full-size fitness mockup on 2026-11-03.
- Adopt the near-black/charcoal surfaces, lime-green highlights, condensed bold headings, restrained borders, and rounded workout panels. Adapt to a responsive website rather than reproducing a phone frame.
- Proposed palette: background `#0B0F0C`, panel `#151C17`, main text `#F2F6EF`, secondary text `#AAB6A9`, accent `#C4F542`, button text `#10150B`. These are chosen design tokens, not colors sampled from the reference.
- Use lime for primary actions and selected states, not large blocks of body copy. Pair display headings with a readable system sans-serif for forms/instructions. Any later custom fonts must be appropriately licensed and served locally.
- Desktop: profile/setup alongside nutrition results, with a separate workout section. Mobile: single-column forms and results, readable exercise details, touch-friendly controls. Proposed minimum control target is 44x44 CSS px.
- No invented activity charts, streaks, chat, or meal tracking merely because the reference is a fitness dashboard. No copied images, brand marks, or unlicensed assets.
- Dark theme only for MVP; light mode remains outside current scope.

## Decisions and Open Questions

| ID | Question | Owner | Decision / rationale |
| --- | --- | --- | --- |
| D-001 | Audience and safety boundary | Project owner | Launch for generally healthy adults 18-56; defer minors and exclude special medical needs |
| D-002 | First release and videos | Project owner | Calculator and written workout plans first; owner supplies videos later, with technique review before publication |
| D-003 | Stack, units, and persistence | Project owner | HTML/CSS/JavaScript; metric only; browser-local saving; no accounts/backend |
| D-004 | Supported goals | Project owner | Fat loss, maintenance, muscle building, and weight gain; conservative surplus rather than dirty bulk |
| D-005 | Workout option ranges | Project owner | Beginner/intermediate/advanced, 2-5 days/week, 30/45/60 minutes; proposed home equipment list accepted |
| D-006 | Starting nutrition calculations | Project owner | Approved 2026-11-03: Mifflin-St Jeor plus activity estimate; goal multipliers 0.85/1.00/1.05/1.10; protein 2.0 g/kg, fat 25%, carbohydrate remainder |
| D-007 | Working name and visual direction | Project owner / implementation choice | Temporary name permitted: LiftFuel; dark theme with green accents inspired by supplied Dribbble reference |
| D-008 | Underweight nutrition scope | Project owner | Confirmed option 1: no automated calorie/macro targets for users classified as underweight by the agreed screening convention; general nutrition information and otherwise eligible workouts remain available; not a diagnosis |
| D-009 | Eligibility interaction and local-saving consent | Project owner | Approved: single general-health eligibility confirmation instead of medical questions; optional "Remember on this device" off by default and "Delete my saved data" action; eligibility confirmation is not persisted |
| D-010 | Target weight and weekly pace | Project owner request / implementation policy | Add target weight and restricted desired weekly gain/loss; replaces D-006's fixed goal adjustments with pace-sensitive rules in NUTRITION_POLICY.md. No unrestricted/aggressive entry, guaranteed health claim, or completion-date prediction |
| D-011 | Source control and shared development preview | Project owner | Public GitHub repository named liftfuel and GitHub Pages preview approved. Public source includes planning documents; only public/ is deployed. Preview labels unfinished features/content review, and does not imply production or clinical approval |
| D-012 | Actual repository and extended nutrition guidance | Project owner request / implementation | Owner published PetarKaragachliev/Website (rather than proposed liftfuel). Add sourced nutrient references and a flexible meal example, not a food diary/menu, actual nutrient-intake calculation, supplement plan, or universal four-hour health prescription |
| D-013 | Nutrient revisions and body context | Project owner | Remove MUFA/PUFA/trans and total-sugar rows, use 5% free/added-sugar calculation, label cholesterol 300 mg FDA DV, and show ALA in mg. Optional combined body inputs guide discussion only; calculated indicators and self-reported traits remain separate, without diagnosis or calorie/exercise overrides |
| Q-001 | What activity descriptions, bounds, safety handling, rounding, and tolerances should apply? | Implementation owner / reviewer TBD | Calculator implementation baseline selected in NUTRITION_POLICY.md and exercised in tests; qualified safety/content review is still a release gate |
| Q-002 | What distinguishes muscle-building and weight-gain targets and plans? | Project owner | Minimize excess fat gain vs prioritize overall gain. Restricted muscle-focused paces use 5%/10% starting surpluses; overall gain uses 10%/15%. No need to invent different exercises solely for these labels |
| Q-003 | Which splits, volume, progression rules, exact equipment capabilities, and exercise catalog are supported within agreed options? | TBD | Input options agreed; generation/content rules pending |
| Q-004 | What are the final brand, browser/accessibility acceptance details, and hosting location? | TBD | Working name and dark/green direction recorded; engineering targets proposed; hosting/final brand pending |
| Q-005 | Who reviews nutrition assumptions and exercise guidance before release? | TBD | Pending |
| Q-006 | Finalize the conservative nutrition support envelope and eligibility behavior? | Project owner | Resolved product direction: nutrition support limits accepted; single general-health confirmation approved; implementation details in NUTRITION_POLICY.md |
| Q-007 | Approve opt-in saving and eligibility confirmation on return? | Project owner | Resolved by D-009; no detailed medical screening or persisted eligibility confirmation |

## Approval

- Approved scope and acceptance criteria: Product scope, starting nutrition calculations, nutrition support limits, eligibility confirmation, and local-saving behavior approved. Calculator parsing/activity/display specifications are the documented implementation baseline; workout policy and release review remain pending.
- Starting calculation approval: Project owner, 2026-11-03. This is not approval of clinical safety or release readiness.
- Changes after approval: Update affected requirements, backlog items, and tests together.

Planning and evidence: [BACKLOG.md](BACKLOG.md), [TEST_PLAN.md](TEST_PLAN.md), [STATUS.md](STATUS.md).
