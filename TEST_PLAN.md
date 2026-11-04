# Test Plan

Status: Calculator unit and real-browser tests are configured. Chromium desktop/mobile/tablet and Firefox have been exercised; WebKit installation/verification is blocked on this host. Detailed workout policy, workout tests, and clinical/release review remain open.

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
| Unit | Calculation, parsing, eligibility; workout rules later | Built-in `node:test` and `node:assert/strict`; `tests/unit/nutrition.test.js` |
| Integration / component | DOM behavior and storage need verification | Playwright in a real browser; `tests/e2e/calculator.spec.js`; no simulated DOM dependency |
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
| FR-004 | AC-007 through AC-009 | APP-005 (profile portion) | Opt-in, reload, confirmation not persisted, opt-out, deletion, malformed data, unavailable storage | Browser | tests/e2e/calculator.spec.js | STATUS.md; workout storage not built |
| FR-002, FR-004 | AC-011 through AC-013 | APP-007 | Target direction/BMI, restricted rates, calorie effects, current-weight basis, zero-change maintenance, all-disabled guidance, accessible dependencies, persisted/legacy profiles | Unit + browser | tests/unit/nutrition.test.js; tests/e2e/calculator.spec.js | STATUS.md |
| FR-003, FR-005 | AC-005, AC-006, AC-010 | APP-003, APP-004 | Workout generation and exercise guidance | Planned | Not created | Not run; deferred |
| FR-006, FR-007 | AC-014 through AC-017 | APP-009 | All nutrient rows; source-table boundaries/units; reference/limit distinctions; meal totals; optional spacing; eligibility/stale hiding; responsive navigation | Unit + browser | tests/unit/guidance.test.js; tests/e2e/calculator.spec.js | STATUS.md; NUTRIENT_REFERENCES.md supplies expected values |
| FR-008, FR-004 | AC-018 through AC-020, AC-024, AC-025 | APP-013 | Raw BMI/reference thresholds, two-waist separation, fat/fat-free mass, optional ratios, training self-report, no automatic normal/low-BMI loss, v1-v5 strict storage | Unit + browser | tests/unit/body-assessment.test.js; tests/unit/rfm.test.js; tests/unit/profile-storage.test.js; tests/e2e/calculator.spec.js | BODY_ASSESSMENT.md; official reference table and limitations recorded |
| FR-009, FR-004 | AC-021 through AC-023, AC-026 | APP-013 | Bulgarian-only collapsed UI, central body/right vertical nutrition, linked errors, optional-diet reset, private native-submit protection, consent/deletion failures, responsive layout, new training tab | Browser + unit | tests/e2e/calculator.spec.js; tests/unit/i18n.test.js | LOCALIZATION.md; obsolete single-waist/English-switch UI tests were replaced, not skipped |
| D-014 | Development policy | APP-011 | Non-OneDrive execution, sync-root aliases, no media capture or workspace diagnostic output | CLI/unit | tests/unit/workspace.test.js; tests/unit/test-policy.test.js | No screenshot, video or trace assertions are used |

Individual scenario names are in the linked test files; extend traceability as workout requirements become executable tests.

## MVP Test Scenarios

Calculator/profile-storage checks below are implemented; workout checks remain planned. Expected numbers derive from independently worked examples in [NUTRITION_POLICY.md](NUTRITION_POLICY.md), not recorded calculator output. Detailed execution evidence and blocked checks are in STATUS.md.

| Scenario group | Acceptance criteria | Required checks |
| --- | --- | --- |
| Eligibility | AC-001 | Boundary ages 17/18/56/57; confirmation unchecked/checked/revoked; no personalized results without confirmation; no detailed medical questions; no newly valid-looking stale prescription after becoming ineligible |
| Input validation | AC-002 | Empty, nonnumeric, nonfinite, negative/zero where disallowed, and agreed boundary values; clear errors without invalid calculations |
| Nutrition | AC-003, AC-004 | All goals and activity/sex-category branches; independent reference kcal/macros; approved surplus/deficit limits and rounding; macro-energy consistency |
| Workout compatibility | AC-005, AC-006 | Gym/home and supported equipment; experience and schedule boundaries; time budgets; complete exercise guidance; explicit unsupported-combination feedback |
| Local storage | AC-007 through AC-009 | Off by default/no persistence; opt-in save/reload; fresh single eligibility confirmation; eligibility not persisted; delete/reload; opting out removes saved data; unavailable storage; malformed data; unrelated storage keys preserved |
| Text-only exercises | AC-010 | Every exercise has written guidance and no broken/pretend video player |
| Browser journeys | J-001 through J-003 | Form to nutrition result; workout setup to exercise details; reload/delete; mobile and desktop keyboard-accessible flows |

Workout assertions must verify approved constraints rather than demand arbitrary identical plans. Test selection randomness deterministically if randomness is introduced; randomness is not currently a requirement.

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
- CI provider: active GitHub Actions workflow `.github/workflows/pages.yml`. A previous successful test/deploy run and live Pages URL have been verified. Node 24, lockfile-based installation, unit tests, and all five browser projects including Linux WebKit must pass before each Pages deployment. PRs test without deploying. See the README workflow badge for current remote status; local WebKit remains separately blocked by host permissions.

## Verification Commands

Scripts are configured: `dev` serves `public/` on loopback port 4173; `test` runs the explicit unit-test glob; `test:e2e` runs Playwright with its managed development server. The server must not already be running on 4173 when the browser suite starts (`reuseExistingServer: false`).

| Check | Command / procedure | Current result |
| --- | --- | --- |
| Unit tests | `npm test` | 295 calculation/reference/storage/body/RFM/local-translation and workspace-policy tests passed |
| Integration / component tests | Actual DOM/storage scenarios in the Playwright suite | Chromium/Firefox exercised; no simulated DOM claims |
| Available browser matrix | `npm run test:e2e -- --project=chromium-desktop --project=chromium-mobile --project=chromium-tablet --project=firefox` | Final 128 passed, 32 current-flow scenarios per project, one final full local run after targeted fixes; no media capture |
| Full browser matrix | `npm run test:e2e` | Local run blocked by WebKit executable permissions; active CI executes the full matrix on Linux, not waived |
| Formatting / lint / type checks, as applicable | TBD | Not configured |
| Production build | None required for native static files; verify deployed static site separately | GitHub Pages development preview active; not production/content-review approval |
| Visual / accessibility review | Keyboard focus/error-description checks, 320 CSS px overflow assertions, owner visual feedback | Historical screenshots were reviewed before the owner prohibited further capture; new screenshots/traces/videos are disabled; manual assistive-tech/device checks remain open |

Populate commands after stack selection and record successful execution, not assumed syntax.

## First TDD Slice

After owner approval of relevant validation/safety rules, establish a deliberate failing assertion and passing assertion to verify the runner. Then test one independent reference nutrition scenario, observe the intended missing-behavior failure, implement only that scenario, and expand across goals, equation categories, and activity factors. Do not call a missing-import or syntax failure the intended behavior-level red result.

Every product test must assert a specified output or observable boundary behavior. Browser tests must go beyond page-load checks: submit a real profile, assert the displayed kcal/macros, exercise an exclusion or validation case, and separately verify storage lifecycle as that feature is built. Keep one scenario per test. Fail setup/checks if zero applicable tests are discovered; no default retries masking failures.

Use a 30-second browser-test timeout and 5-second assertion timeout. At the owner's request, do not capture screenshots, traces, or video, including on failures. Explicit screenshot calls were removed; configuration turns all capture off. Text-only test artifacts go to the OS temporary directory under `opencode/liftfuel-test-results`, outside the OneDrive workspace. No external services or paid APIs are needed. Add no fixed coverage percentage now; cover approved branches and investigate uncovered behavior before exclusions.

Tool references: https://nodejs.org/docs/latest-v24.x/api/test.html and https://playwright.dev/docs/intro . Playwright and the static server are installed development dependencies only. Initial installation reported no npm vulnerabilities and a transitive whatwg-encoding deprecation notice. WebKit reinstallation (`npx playwright install --force webkit`) fails with EPERM writing its executable; do not waive the check or change OS security settings to claim a full pass.

## Failure Handling and Release Gate

- Investigate the first failing assertion and its cause before downstream errors.
- Do not silently skip flaky tests or remove assertions to obtain a passing run.
- Record a blocked check with its cause, owner, and next action; do not count it as passed.
- Release requires verified MVP acceptance criteria, agreed quality checks, no unresolved release-blocking defects, and an explicit release decision in STATUS.md.
- Coverage metrics and thresholds: TBD after identifying meaningful behavior and risks. A percentage alone does not establish correctness.

Record results in [STATUS.md](STATUS.md); scope and work items live in [PRD.md](PRD.md) and [BACKLOG.md](BACKLOG.md).
