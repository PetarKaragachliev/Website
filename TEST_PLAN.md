# Test Plan

Final integration verification (2026-11-12): **427 unit tests and 590 browser tests passed**, covering all five configured projects. Additional review regressions prove drafts cannot restore revoked remembering consent or permit old calorie credit after a transient invalidation-write failure. Earlier red/intermediate runs remain documented in STATUS.md; no capture or publication.

Training design preview regressions cover scoped blue/unchanged nutrition colors, disclosure/reopen and result-start scrolling on desktop/mobile, exclusive day selection and exact media IDs, click-only video loading and stale-iframe removal, fixed gym-only map without form/geolocation inputs, home removal and 320px reflow. Provider requests are stubbed in deterministic tests. Live embed smoke and media review limits are recorded separately in EXERCISE_MEDIA.md and STATUS.md.

2026-11-11 follow-up coverage: all 512 subsets of nine home equipment choices across three experience levels, deterministic selection, compatibility refusals, and independent setup-time budgets for every selected route and schedule. Browser journeys cover the single equipment grid, short labels and actual equipment routes. Nutrition regressions cover native disclosure close/reopen, retained inputs, explicit result-start scrolling on desktop/mobile, renamed labels, unchanged validation behavior, and visible storage failures after minimization. Latest execution evidence is in STATUS.md.

Status: Calculator/workout/integration unit and real-browser tests are configured, including later WebKit execution. Latest unit run: 426 passed. Initial current matrix: 573 passed, 2 failed because session-storage instance mocking was ineffective in Firefox/WebKit. Main corrected the prototype-level test and is running final verification; do not count the final matrix as passed until recorded in STATUS.md. Detailed dosing/catalog and energy estimates remain provisional pending professional review: [WORKOUT_POLICY.md](WORKOUT_POLICY.md), [TRAINING_ENERGY_POLICY.md](TRAINING_ENERGY_POLICY.md).

## Principles

- Derive expected outcomes from approved acceptance criteria, not the current implementation.
- Test one behavior or scenario at a time, with explicit assertions on observable outcomes.
- Use the smallest test level that proves the requirement; retain end-to-end coverage for critical user journeys.
- Use deterministic inputs and controlled external dependencies where needed.
- Give asynchronous checks explicit timeouts and useful failure diagnostics.
- Investigate uncovered behavior before deciding whether a coverage exclusion is justified.

## Red-Green-Refactor

1. Select a ready backlog item and one acceptance scenario.
2. Write a test that asserts the specified outcome at the relevant boundary.
3. Run it and confirm it fails because the behavior is missing or incorrect, not because of an unrelated environment or syntax error. Record the command and failure.
4. Implement the smallest change that satisfies the scenario.
5. Run the test and relevant regression checks. Record actual results.
6. Refactor only while preserving passing behavior, then rerun affected checks.
7. Update traceability and evidence before marking the item Done.

For test-runner setup, first demonstrate a deliberate assertion failure, then a passing assertion. This verifies the runner, not product behavior; product acceptance still needs its own tests.

## Test Levels

| Level | Use when | Planned tool / location |
| --- | --- | --- |
| Unit | Calculation, parsing, eligibility and provisional workout invariants | Built-in `node:test` and `node:assert/strict`; `tests/unit/nutrition.test.js`, `tests/unit/workout.test.js` |
| Integration / component | DOM behavior, shared state and storage need verification | Playwright in a real browser; `tests/e2e/calculator.spec.js`, `tests/e2e/training.spec.js`, `tests/e2e/integration.spec.js`; no simulated DOM dependency |
| End-to-end | A critical user journey must work through the application | Selected: `@playwright/test`; same browser suite, distinct scenario tests |
| Manual | A visual or exploratory check cannot be adequately automated | TBD; record procedure and observed result |

Do not require every level for every requirement. Choose based on risk and behavior, and record the rationale for critical scenarios not covered end-to-end.

## Scenario Coverage

For each approved requirement, consider success, invalid input, empty state, dependency failure, recovery, and relevant authorization boundaries. Mark scenarios not applicable with a reason rather than inventing requirements.

For website journeys, define agreed browser and viewport coverage, keyboard interaction, focus behavior, and accessibility checks. Automated accessibility checks do not replace applicable manual interaction checks.

## Traceability

| Requirement | Acceptance criterion | Backlog item | Scenario / test ID | Level | Test location | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| FR-001 | AC-001, AC-002 | APP-001 | Rejected field values, age boundaries, eligibility, input/error correction | Unit + browser | tests/unit/nutrition.test.js; tests/e2e/calculator.spec.js | STATUS.md |
| FR-002 | AC-003, AC-004 | APP-002 | Five reference cases, activity branches, energy consistency, nutrition support bounds, stale-result invalidation | Unit + browser | Same files; reference-profile tests and calculation journeys | STATUS.md |
| FR-004 | AC-007 through AC-009, AC-020, AC-032 | APP-005 | Tab snapshots/drafts; opt-in v6 profile/six-setting inputs only; fresh eligibility, opt-out, deletion, malformed/unavailable storage, legacy activity reselection and no cross-tab resurrection | Unit + browser | tests/unit/profile-storage.test.js; tests/unit/shared-plan.test.js; tests/e2e/calculator.spec.js; tests/e2e/integration.spec.js | STATUS.md; final integration matrix pending |
| FR-002, FR-004 | AC-011 through AC-013 | APP-007 | Target direction/BMI, restricted rates, calorie effects, current-weight basis, zero-change maintenance, all-disabled guidance, accessible dependencies, persisted/legacy profiles | Unit + browser | tests/unit/nutrition.test.js; tests/e2e/calculator.spec.js | STATUS.md |
| FR-003, FR-005 | AC-005, AC-006, AC-010, AC-029 | APP-003, APP-004 | Deterministic home/gym plans; all levels/days/budgets; equipment subsets/refusals; independent time/pattern invariants; complete Bulgarian written guidance; all 12 activity/history branches; no BMI/calorie/body-type gate or modification | Unit + browser | tests/unit/workout.test.js; tests/e2e/training.spec.js | WORKOUT_POLICY.md provisional contract; STATUS.md records red and pre-fix green, final results pending |
| FR-001, FR-003, FR-009 | AC-026 through AC-028 | APP-003, APP-014 | Same-tab links without nutrition success; generation needs valid common profile; common fields only on nutrition, six settings only on training; fresh personal workout affirmation, restored equipment, stale-output invalidation, loader recovery and no-JS native-submit protection | Browser | tests/e2e/training.spec.js; tests/e2e/calculator.spec.js; tests/e2e/integration.spec.js | STATUS.md; independent no-handoff slice is historical |
| FR-006, FR-007 | AC-014 through AC-017 | APP-009 | All nutrient rows; source-table boundaries/units; reference/limit distinctions; meal totals; optional spacing; eligibility/stale hiding; responsive navigation | Unit + browser | tests/unit/guidance.test.js; tests/e2e/calculator.spec.js | STATUS.md; NUTRIENT_REFERENCES.md supplies expected values |
| FR-008, FR-004 | AC-018 through AC-020, AC-024, AC-025 | APP-013, APP-005 | Unchanged BMI/RFM/reference thresholds, waist separation, fat/fat-free mass, descriptive ratios, training self-report; v6 profile and v1-v5 decoding without guessed waist/choices; UI clears legacy activity; valid body bonus at nutrition limits or missing goal | Unit + browser | tests/unit/body-assessment.test.js; tests/unit/rfm.test.js; tests/unit/profile-storage.test.js; tests/e2e/calculator.spec.js; tests/e2e/integration.spec.js | BODY_ASSESSMENT.md; official reference table and limitations recorded |
| FR-002, FR-003, FR-004 | AC-030 through AC-032 | APP-014, APP-005 | Seven independently checked daily intakes on both pages; actual schedule, rest base, extra above maintenance once, regeneration replaces credit; unchanged-input eligibility renewal preserves setup; edits invalidate; drafts/tab navigation, source recheck and cross-tab revocation/replacement; visible storage failures | Unit + browser | tests/unit/training-nutrition.test.js; tests/unit/shared-plan.test.js; tests/e2e/integration.spec.js | TRAINING_ENERGY_POLICY.md method; 426 units passed, final matrix pending |
| FR-002, FR-003 | AC-030, AC-031 | APP-014 | 3.5 MET sets/rest, 1.3 setup; allocated maintenance subtraction; no warmup/cooldown/walking/afterburn credit; same 2 g/kg protein, 25% fat, carbs remainder; nearest-10 daily kcal; BMI/base-energy/all-pace limits allow exercise without calorie days; explicit blank pace; age 18 training intake unavailable, ages 19-56 supported; whole blocked-day withholding outside 1500-4500 | Unit + browser | tests/unit/training-nutrition.test.js; tests/unit/shared-plan.test.js; tests/e2e/integration.spec.js | Independent arithmetic/boundary assertions, not measured-burn validation |
| FR-002, FR-009, FR-004 | AC-018, AC-019, AC-021 through AC-023, AC-026 | APP-013; D-018 clarification | Bulgarian nutrition-first shared form; required explicit activity/goal without defaults and five measurements including `waistRfm`; ordinary noncollapsible `section#nutrition-details` before waist; **Изчисли моите резултати** computes both, nutrition success focus, focused linked errors/no save for missing nutrition, no body-only UI/reset; native-submit privacy, consent/deletion failures, responsive layout, same-tab training/return | Browser + unit | tests/e2e/calculator.spec.js; tests/unit/i18n.test.js | STATUS.md; historical optional-diet/reset evidence is retained, not the current contract |
| D-014 | Development policy | APP-011 | Non-OneDrive execution, sync-root aliases, no media capture or workspace diagnostic output | CLI/unit | tests/unit/workspace.test.js; tests/unit/test-policy.test.js | No screenshot, video or trace assertions are used |

Individual scenario names are in the linked test files. Workout tests exercise the provisional implementation contract, not professional safety validation or detailed owner approval.

## MVP Test Scenarios

Calculator/profile-storage, workout preview and shared integration checks below are implemented. Nutrition expected numbers derive from independent examples in [NUTRITION_POLICY.md](NUTRITION_POLICY.md); workout constraints from WORKOUT_POLICY.md and integration energy from TRAINING_ENERGY_POLICY.md. Browser integration reconstructs energy from displayed prescriptions, not calculator energy output. Input saving/handoff/calorie integration are no longer deferred; final matrix evidence and professional review remain open in STATUS.md.

| Scenario group | Acceptance criteria | Required checks |
| --- | --- | --- |
| Eligibility | AC-001 | Boundary ages 17/18/56/57; confirmation unchecked/checked/revoked; no personalized results without confirmation; no detailed medical questions; no newly valid-looking stale prescription after becoming ineligible |
| Input validation | AC-002 | Empty, nonnumeric, nonfinite, negative/zero where disallowed, and agreed boundary values; clear errors without invalid calculations |
| Nutrition | AC-003, AC-004, AC-018, AC-019 | All goals and activity/sex-category branches; independent reference kcal/macros; approved surplus/deficit limits and rounding; macro-energy consistency; explicit required activity/goal with no defaults, five required measurements, one shared submission and nutrition success focus; missing nutrition focuses linked errors and does not save, while valid body bonus remains independent |
| Workout compatibility | AC-005, AC-006 | Gym/home and supported equipment; experience and schedule boundaries; time budgets; complete exercise guidance; explicit unsupported-combination feedback |
| Local storage | AC-007 through AC-009, AC-032 | Remember off by default, tab snapshots/drafts automatic; opt-in profile/six-setting save/reload, never results/eligibility; fresh per-flow eligibility; delete/reload and opt-out; unavailable/malformed storage; unrelated keys preserved; cross-tab revocation cannot resurrect |
| Text-only exercises | AC-010 | Every exercise has written guidance and no broken/pretend video player |
| Browser journeys | J-001 through J-003 | Form to nutrition result; workout setup to exercise details; reload/delete; mobile and desktop keyboard-accessible flows |

Workout assertions verify the documented provisional constraints rather than treat current outputs as a reference model. Determinism and isolation are explicit checks; randomness is not implemented. Passing tests do not establish clinical safety or approval of detailed dosing/catalog.

Exercise approved options across beginner/intermediate/advanced, 2-5 days/week, 30/45/60-minute sessions, and available home/gym equipment. Unsupported combinations must get explicit feedback, not an invented compatible plan. Add nutrition boundary and safety scenarios once the proposal's approval blockers are resolved.

## Environment and Data

- Application: Browser-native HTML, CSS, and JavaScript; no backend or accounts.
- Selected development runtime/package manager: Node.js 24 LTS and npm; installed versions checked as Node v24.19.0 and npm 11.17.0. Node is for development/tests, not a production backend.
- Selected unit runner: built-in `node:test` with strict assertions. Selected browser runner: `@playwright/test`. Development-only static server: `http-server` bound to `127.0.0.1`, with caching disabled. No framework, transpiler, bundler, Jest, Vitest, or jsdom needed.
- Implemented layout: static assets/modules under `public/`; unit tests under `tests/unit/`, browser tests under `tests/e2e/`. Browser-native ES modules are imported directly in Node tests. Exact development dependencies are pinned in package.json/package-lock.json.
- Browser / viewport plan: Chromium at 360x800, 768x1024, 1440x900; Firefox/WebKit desktop smoke journeys before release; manual reflow at 320 CSS px and keyboard/zoom/screen-reader review. Browser/device emulation does not prove real Safari/mobile compatibility.
- Test data: synthetic 70 kg/180 cm/age-30 reference profile and explicit validation/support-limit variants. Each Playwright test uses an isolated browser context; storage tests only use synthetic data.
- External services: None approved for the MVP. Review network behavior to ensure profile data is not sent off-device.
- Application environment variables: None required. No credentials or external service keys.
- CI provider: active GitHub Actions workflow `.github/workflows/pages.yml`. A previous successful test/deploy run and live Pages URL have been verified. Node 24, lockfile-based installation, unit tests, and all five browser projects including Linux WebKit must pass before each Pages deployment. PRs test without deploying. See the README workflow badge for current remote status; earlier local WebKit permission failures are historical, not a current waiver.

## Verification Commands

Current integration evidence is the status at the top of this document: 426 units passed; initial matrix 573 passed/2 failed, prototype-mocking fix under final verification by main. The numbered results below and the Workout Preview Evidence section are historical milestones, not current totals or current WebKit blockers. Preserve them as evidence of earlier runs.

Scripts are configured: `dev` serves `public/` on loopback port 4173; `test` runs the explicit unit-test glob; `test:e2e` runs Playwright with its managed development server. The server must not already be running on 4173 when the browser suite starts (`reuseExistingServer: false`).

| Check | Command / procedure | Current result |
| --- | --- | --- |
| Unit tests | `node --test --test-reporter=dot "tests/unit/*.test.js"` | Latest recorded run: 426 passed; earlier milestone was 387 including 92 workout cases |
| Workout unit tests | `node --test --test-reporter=spec tests/unit/workout.test.js` | Initial missing-module red recorded separately; follow-up independently passed all 92 tests after review fixes |
| Focused workout UI | Chromium desktop focused training/navigation scenarios | 13 passed before review fixes; restored consent/equipment and history regressions failed before fixes, then passed in the final full matrix |
| Integration / component tests | Actual DOM/storage scenarios in the Playwright suite | Chromium/Firefox exercised; no simulated DOM claims |
| Chromium desktop | Included in available-browser matrix below | All 48 calculator/workout scenarios passed; no media capture |
| Available browser matrix | `npm run test:e2e -- --project=chromium-desktop --project=chromium-mobile --project=chromium-tablet --project=firefox` | All 192 passed: 36 calculator + 12 training scenarios per project, across four projects; no media capture |
| Full browser matrix | `npm run test:e2e` | Earlier WebKit permission block resolved for later local runs; current final integration matrix pending, not waived |
| Formatting / lint / type checks, as applicable | TBD | Not configured |
| Production build | None required for native static files; verify deployed static site separately | GitHub Pages development preview active; not production/content-review approval |
| Visual / accessibility review | Keyboard focus/error-description checks, 320 CSS px overflow assertions, owner visual feedback | Historical screenshots were reviewed before the owner prohibited further capture; new screenshots/traces/videos are disabled; manual assistive-tech/device checks remain open |

Populate commands after stack selection and record successful execution, not assumed syntax.

## First TDD Slice

After owner approval of relevant validation/safety rules, establish a deliberate failing assertion and passing assertion to verify the runner. Then test one independent reference nutrition scenario, observe the intended missing-behavior failure, implement only that scenario, and expand across goals, equation categories, and activity factors. Do not call a missing-import or syntax failure the intended behavior-level red result.

Every product test must assert a specified output or observable boundary behavior. Browser tests must go beyond page-load checks: submit a real profile, assert the displayed kcal/macros, exercise an exclusion or validation case, and separately verify storage lifecycle as that feature is built. Keep one scenario per test. Fail setup/checks if zero applicable tests are discovered; no default retries masking failures.

### Workout Preview Evidence

The model's initial run failed with `ERR_MODULE_NOT_FOUND` because `workout.js` did not exist. Preserve this as a missing-module red, not a behavior-level assertion failure. The UI's first red was the missing generate action. Before the latest review fixes, 91 workout unit tests and 13 focused desktop checks passed. Review then found restored consent/equipment state and contradictory sedentary/existing-cardio guidance; dedicated new regressions failed before fixes. Final unit/full matrix runs are still in progress: expected 92 workout tests, 387 total unit tests and 192 browser checks across four available projects. A later main-agent entry must record actual final outcomes; these expected totals are not passing evidence.

Use a 30-second browser-test timeout and 5-second assertion timeout. At the owner's request, do not capture screenshots, traces, or video, including on failures. Explicit screenshot calls were removed; configuration turns all capture off. Text-only test artifacts go to the OS temporary directory under `opencode/liftfuel-test-results`, outside the OneDrive workspace. No external services or paid APIs are needed. Add no fixed coverage percentage now; cover approved branches and investigate uncovered behavior before exclusions.

Tool references: https://nodejs.org/docs/latest-v24.x/api/test.html and https://playwright.dev/docs/intro . Playwright and the static server are installed development dependencies only. Initial installation reported no npm vulnerabilities and a transitive whatwg-encoding deprecation notice. Historically, WebKit reinstallation (`npx playwright install --force webkit`) failed with EPERM; later local WebKit runs supersede that blocker. Never waive checks or change OS security settings to claim a full pass.

## Failure Handling and Release Gate

- Investigate the first failing assertion and its cause before downstream errors.
- Do not silently skip flaky tests or remove assertions to obtain a passing run.
- Record a blocked check with its cause, owner, and next action; do not count it as passed.
- Release requires verified MVP acceptance criteria, agreed quality checks, no unresolved release-blocking defects, and an explicit release decision in STATUS.md.
- Coverage metrics and thresholds: TBD after identifying meaningful behavior and risks. A percentage alone does not establish correctness.

Record results in [STATUS.md](STATUS.md); scope and work items live in [PRD.md](PRD.md) and [BACKLOG.md](BACKLOG.md).
