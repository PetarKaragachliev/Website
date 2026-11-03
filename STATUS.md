# Development Status

Last updated: 2026-11-03.

## Snapshot

| Area | State |
| --- | --- |
| Project phase | First calculator slice implemented; browser/release checks incomplete |
| Documentation | Calculator baseline and test traceability recorded; workout/content-review decisions remain open |
| Product scope and approval | Approved calculator policy, nutrition support limits, single confirmation, and optional local saving; workout rules pending |
| Stack and hosting | Native HTML/CSS/JavaScript; public PetarKaragachliev/Website repository and GitHub Pages preview verified; test-gated publishing on main pushes |
| Name and design | LiftFuel (temporary); dark/green direction agreed; supplied fitness mockup reviewed |
| Active implementation sprint | Nutrition slice; profile-only saving delivered early with calculator |
| Application code | Calculator, target/pace, local saving, sourced nutrient references, and optional four-occasion meal example; no workout generator/videos or actual food-intake tracking |
| Automated tests and CI | 108 unit tests; 31 browser scenarios per configured project; active Linux CI includes WebKit and gates Pages deployment |
| Release readiness | Development preview active; qualified content review, manual accessibility/device checks, and workout features remain incomplete; local WebKit installation still blocked |

## Current Focus

Preview: https://petarkaragachliev.github.io/Website/ . Repository/workflow: https://github.com/PetarKaragachliev/Website/actions/workflows/pages.yml . Local edits alone are not uploaded: approved work is committed/pushed, then test-gated deployment publishes it. Nutrient output is reference guidance, not measured intake or a supplement plan; four-hour meal spacing is optional. Next product work remains workout selection/progression and reviewed content.

## Blockers and Decisions

| ID | Blocker / decision needed | Impact | Owner | Next action |
| --- | --- | --- | --- | --- |
| B-001 | Qualified nutrition/exercise review is unassigned | Public safety/content claims remain unverified | Project owner / reviewer TBD | Assign and complete review before release; current product limits are not clinical validation |
| B-002 | Detailed workout rules, catalog, and review ownership are undefined | Safe, compatible plan expectations cannot be finalized | TBD | Resolve PRD Q-003/Q-005 within agreed option ranges |
| B-003 | Local WebKit installation fails with EPERM opening Playwright.exe | Local full-browser command blocked; Linux CI runs WebKit independently rather than skipping it | Host owner / implementation owner | Resolve local host permissions without disabling protection; do not confuse CI coverage with successful local installation or real Safari-device testing |
| B-004 | Manual screen-reader/zoom, real-device browser review, hosting, and deployment checks incomplete | No accessibility-conformance or production-readiness claim | Implementation owner / project owner | Complete the release checklist after functionality/content review |
| B-005 (resolved) | Owner published through GitHub Desktop | Public repository, initial successful workflow, and hosted preview verified | Project owner / implementation owner | Git push and workflow checks now work through existing authorized Git access; no credentials are stored in the repository |

## Verification Evidence

Evidence includes intentional TDD failures, subsequent passing checks, the locally blocked WebKit run, and verified GitHub Pages/CI setup. There is no build step for the static application. An active development preview is not a production or clinical approval; the README workflow badge reports current remote status.

Use one entry per verification run. Preserve the initial red result and later green result as separate entries.

| Date | Item / acceptance ID | Phase | Command or manual procedure | Expected outcome | Actual outcome | Result / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-03 | PLAN-001 proposal arithmetic only | Reference check | Executed Node.js inline assertions: calculate all five NUTRITION_POLICY.md cases, compare exact targets within 0.000001 kcal and rounded outputs to table; assert unrounded energy balance and displayed discrepancy <=9 kcal | All five fixtures and energy/rounding checks pass | All assertions passed; process exit 0 | Arithmetic verified only, not an application test or clinical validation |
| 2026-11-03 | PLAN-003 runtime / runner probe only | Tool check | `node --version`, `npm --version`; Node inline parent process runs `node:test` children with `assert.equal(1,2)` then `assert.equal(2,2)` and asserts failure/pass reports and exit codes | Node/npm available; intentional failure exits 1, passing probe exits 0 | Node v24.19.0, npm 11.17.0; expected red/green outcomes verified after correcting initial PowerShell quoting error | No project tests or browser suite created; browser dependencies not installed |
| 2026-11-03 | PRD visual proposal | Contrast check | Node inline WCAG relative-luminance assertions on main text/background, main text/panel, secondary text/panel, and button text/accent | All four normal-text pairs >=4.5:1 | 17.65:1, 15.87:1, 8.24:1, 14.54:1 respectively; exit 0 | Token pairs only, not whole-page accessibility validation |
| 2026-11-03 | APP-002 | Red | `node --test --test-name-pattern="reference profile: male, lose" "tests/unit/nutrition.test.js"` | Eligible profile must produce reference nutrition | Assertion failed: eligible profile had null result | Intended missing-behavior failure; import/runner worked |
| 2026-11-03 | APP-001/APP-002 | Green | `npm test` | Numerical reference, input, activity, eligibility, BMI, and calorie support cases pass | 55 tests passed, exit 0 | Real exported calculation path exercised |
| 2026-11-03 | Calculator UI | Red | `npm run test:e2e -- --project=chromium-desktop --grep="calculate real displayed" --timeout=5000` | Profile form can be used to calculate displayed targets | Failed waiting for Age input before UI existed | Intended missing-interface failure |
| 2026-11-03 | Full initial browser matrix | Blocked | `npm run test:e2e` | All configured browser journeys pass | Initial 60-case run: 50 passed; WebKit third case timed out in beforeEach, subsequent launches reported missing executable | WebKit had passed two cases before host failure; not a full pass |
| 2026-11-03 | WebKit installation | Blocked | `npx playwright install --force webkit` | Reinstall browser executable | Download completed, extraction repeatedly failed with EPERM opening Playwright.exe | No leftover Playwright process found; Windows Defender query returned no detection entries; exact cause beyond host access failure is unconfirmed |
| 2026-11-03 | Privacy/accessibility regressions | Red | Chromium targeted regressions for failed module, unrelated errors, and corrected accessible description | No native profile submission; retain unrelated errors; remove corrected error descriptions | Each newly added regression failed for its intended defect before fix | Submit is now disabled until module initialization; per-field correction clears only its own visible and accessible error |
| 2026-11-03 | Disabled-JavaScript test locator | Test correction | Browser scenario with JavaScript disabled | Disabled submit prevents profile navigation and the noscript notice is visible | Initial text-query assertion could not find noscript content; direct `noscript .notice` locator passed | Corrected test selector; no application assertion skipped or removed |
| 2026-11-03 | Boundary typing | Red / Green | Unit tests for array-valued activity/goal | Reject wrong field types, including saved profiles | New cases initially failed; strict string validation added; unit suite subsequently passed | Browser restoration also rejects invalid typed saved records |
| 2026-11-03 | Dependency installation/audit | Tool check | `npm install`; `npm audit --omit=dev` | Install pinned tooling; check reported vulnerabilities | Install audited 52 packages with zero vulnerabilities; production audit also zero; transitive whatwg-encoding deprecation warning | No production runtime npm dependencies |
| 2026-11-03 | APP-001/APP-002/profile portion of APP-005 | Final Green | `npm run test:e2e -- --project=chromium-desktop --project=chromium-mobile --project=chromium-tablet --project=firefox` | All 16 scenarios pass across the four available projects after regression fixes | 64 passed, zero failures, exit 0; final unit rerun also 55 passed | Includes displayed targets, privacy without JS/module, accessible error correction, confirmation, stale results, saving lifecycle, malformed/unavailable storage, and 320px reflow |
| 2026-11-03 | Calculator visual review | Screenshot review | Inspected final generated desktop and mobile calculator.png artifacts in test-results | Dark/green responsive interface with readable layout and no overflow | Desktop and mobile screenshots reviewed; browser overflow assertions pass | Not a manual screen-reader, full zoom, or actual mobile-device review |
| 2026-11-03 | APP-007 | Red | Targeted unit scenarios for weekly loss, wrong-direction target, and maintenance target; browser target/pace journey | New behavior must be present before results can pass | Three unit assertions failed for missing behavior; browser failed waiting for Target weight field before UI existed | Expected TDD failures |
| 2026-11-03 | APP-007 rounding and dependencies | Red / Fix | Browser rounding assertion, then no-available-pace and disabled-error-link regressions; unit missing-weight dependency check | Decimal 0.175 displays 0.18; impossible pace selections get guidance; error links remain focusable | Found native toFixed rounding mismatch and two dependent-control defects; each fixed without weakening assertions | Intl decimal formatting; explicit all-unavailable limit path; pace validation waits for valid current weight |
| 2026-11-03 | APP-007 | Green | `npm test`; available-browser matrix command above | All existing and new target/pace/profile-migration scenarios pass | 87 unit tests passed; 100 browser checks passed across Chromium desktop/mobile/tablet and Firefox, exit 0 | WebKit remains blocked by previously recorded host error; no new WebKit pass claimed |
| 2026-11-03 | APP-008 preparation | Local verification | Git initialization; action SHA refs checked with git ls-remote; workflow review; `npm test`; available-browser matrix | Local repository ready; no unexpected action refs; preview notice and existing behavior pass | Local main initialized; pinned refs verified; workflow reviewed; 87 unit and 104 browser checks passed | No actual GitHub Actions run, Pages settings change, remote push, or hosted URL verified. CLI browser authorization timed out and auth status remains unauthenticated; owner will use Desktop |
| 2026-11-03 | APP-008 verification | Hosted preview / CI | Read origin/main, dry-run authorized Git push, GitHub CLI repository/run queries using existing authorized access, and fetched Pages URL | Public repository and successful initial deployment exist | PetarKaragachliev/Website public, main branch; workflow run 41682204644 completed successfully; hosted calculator reachable | https://github.com/PetarKaragachliev/Website/actions/runs/41682204644 ; local standalone CLI login is not required for Desktop publishing |
| 2026-11-03 | APP-009 | Red | Unit test for nutrient guidance on eligible calculator output; browser nutrient-output scenario | Reference/meal feature must exist and be shown | Unit assertion failed for absent result.guidance; browser failed for missing daily-guidance region before implementation | Intended behavior-level failures |
| 2026-11-03 | APP-009 | Local Green | `npm test`; available-browser matrix; static review | Reference values/units/age boundaries, optional meal split, stale hiding, and mobile layout pass | 108 unit tests and 124 browser checks passed; review found no concrete issues | No actual-intake, deficiency, supplement-dose, or universal meal-timing claim; new source document records definitions/evidence |
| 2026-11-03 | APP-007 visual / preview | Review | Reran target/pace browser journey on desktop/mobile, inspected weight-plan.png screenshots, restarted static preview, and fetched current HTML/module | Target, pace, and new results visible without broken layout; current assets served | Two targeted browser checks passed; screenshots reviewed; HTML/module HTTP 200 and new field/function markers found | Preview restarted at http://127.0.0.1:4173 (PID 10764); earlier preview PID 3596 stopped for tests |
| 2026-11-03 | Local preview | HTTP smoke check | Started local static server; fetched `/` and `/js/nutrition.js` with Node and asserted status/content | Calculator HTML and module served successfully | Both HTTP 200 at http://127.0.0.1:4173; HTML title and calculation action found | Preview left running (PID 3596); initial inline smoke command needed ESM syntax correction, then passed; stop this preview before running Playwright on the same port |

Include environment or revision details when needed to reproduce a run. Record failures and blocked checks as well as passes. Do not put secrets or sensitive test data in evidence.

## Completed Work

- Created linked planning and TDD templates: PRD.md, BACKLOG.md, TEST_PLAN.md, STATUS.md, and README.md.
- Recorded agreed audience, safety exclusions, four goals, gym/home support, metric units, HTML/CSS/JavaScript stack, local saving, and text-first exercise guidance.
- Linked MVP requirements to acceptance criteria, draft backlog items, and planned test scenarios.
- Recorded accepted workout option ranges and clarified the muscle-focused vs overall-weight-gain priorities.
- Researched and documented Mifflin-St Jeor, activity estimation limitations, protein guidance, and surplus evidence in NUTRITION_POLICY.md.
- Project owner approved starting calculations on 2026-11-03: Mifflin-St Jeor with activity estimate; -15%/maintenance/+5%/+10% goals; protein 2.0 g/kg, fat 25%, remaining calories carbohydrate.
- Reviewed supplied Dribbble page and first full-size mockup; recorded temporary LiftFuel name, dark/green direction, responsive adaptation, and checked proposed text contrast pairs.
- Proposed V-001 through V-009 validation/safety/persistence behavior with sources and explicit owner-approval tradeoffs; selected minimal test tools without installing browser dependencies or implementing the app.
- Recorded acceptance of nutrition support restrictions and explicit confirmation of option 1 for underweight users: no automatic nutrition targets, general information and otherwise eligible workouts allowed.
- Owner approved one general-health eligibility confirmation instead of detailed medical questions, optional "Remember on this device" off by default, and "Delete my saved data". Updated PRD acceptance criteria and planned tests; eligibility confirmation is not saved.
- Implemented responsive dark/green calculator, four-goal estimates, validation, single eligibility confirmation, support-limit messages, error/result focus, opt-in local profile storage, and deletion. No accounts, telemetry, or remote profile API.
- Implemented disabled-submit protection for unavailable JavaScript/modules, strict restored-profile validation, stale-result invalidation, and persistent unrelated field feedback. Review findings received dedicated failing regressions before fixes.
- Configured pinned Node/Playwright/static-server tooling and independent unit/browser tests. Profile saving does not include a workout plan because workout generation has not been built.
- Added target weight and goal-specific weekly gain/loss choices, kg/week labels, pace-sensitive calorie/macro estimates, current/target BMI checks, maximum 20% loss-deficit guard, and explanations when every pace is outside product limits. Target/pace changes invalidate old results.
- Added saved record version 2 while preserving the existing storage key; legacy records restore validated base inputs and explicitly request missing target/pace rather than guessing. Eligibility is never persisted.
- The requested target/pace feature supersedes the earlier fixed goal adjustments. New rate choices and surplus mappings are conservative product heuristics, not clinically reviewed guarantees.
- Initially prepared local Git and a pinned Pages workflow, then verified the owner's subsequent public repository and preview publication. Only public/ is deployed; qualified content review is still pending.
- Verified the owner-published public Website repository and initial successful Pages workflow/live calculator. Source updates require an explicit commit/push; the publishing workflow is automatic afterward, not on every local edit.
- Added 14 requested nutrient categories plus a separate free-sugars limit; sourced age/category references, RDA/AI/limit labels, no invented numeric goals, ALA-specific omega-3, and explicit unknown-intake/supplement caveats. Added an optional four-occasion meal example and even calorie/protein split without changing daily totals or storage schema.
- Product approval and test passes are not clinical validation; full browser/release checks remain incomplete.

## Next Milestones

1. Resolve host WebKit executable access and complete its configured scenarios; perform remaining manual accessibility/device checks.
2. Agree on workout-selection, sets/reps, rest, progression rules, and exercise catalog, then implement that slice using TDD.
3. Complete qualified nutrition/exercise review and deployment/release checks; videos remain deferred until reviewed clips are supplied.

## Release Decision

- Decision: Not ready for public release; calculator is available for local development/review.
- Approver and date: TBD.
- Acceptance and quality-check evidence: Calculator unit/browser evidence above; incomplete full-browser and manual/content/deployment checks.
- Known issues and accepted risks: WebKit host installation blocked; no workout generator; support limits and formula estimates not clinically validated. No release-risk acceptance recorded.

Workflow and release criteria: [TEST_PLAN.md](TEST_PLAN.md). Project navigation: [README.md](README.md).
