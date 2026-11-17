# Development Backlog

Current language follow-up (D-021): owner-approved BG/EN dropdown ready for test-gated publishing. All 431 units and 50 focused language browser checks passed after the dropdown refinement; the prior full bilingual matrix passed 630 checks. Qualified content review remains open.

Status: Calculator and expanded-equipment workout previews implemented and verified locally, including WebKit. Detailed workout dosing/catalog still lack professional review and explicit owner approval. No release is approved.

Current integration follow-up (2026-11-12): common profile on nutrition, training-specific setup, automatic seven-day intakes, tab-session snapshots/drafts and opt-in v6 profile/six-setting persistence implemented. Latest unit run: 426 passed. Initial matrix: 573 passed, 2 failed because instance-level session-storage mocking was ineffective in Firefox/WebKit; main corrected the prototype-level test and is running final verification. No final matrix pass is claimed here. Energy method/sources: [TRAINING_ENERGY_POLICY.md](TRAINING_ENERGY_POLICY.md); professional dosing/energy review remains open.

Latest completed follow-up (2026-11-11): simplified single equipment grid and restored short labels; conservative equipment-only selection without added capability checkboxes; native nutrition disclosure with automatic result scrolling; nutrition sidebar/goal renaming; visible storage-failure feedback. Verification is recorded in STATUS.md. These local changes are not published.

Sprint dates, capacity, estimates, and owners are TBD. The outline below is a planning template, not an approved delivery schedule.

## Workflow

Completed local design preview: blue training theme, input minimization/result scrolling, active-day media column and gym-only example map. Open follow-ups: owner visual review, qualified media/technique review, playback checks for the remaining candidates, owner-supplied gym locations and a controlled multi-pin map. The single example is not all Plovdiv gyms. No publication.

States: `Draft`, `Ready`, `In Progress`, `Blocked`, `Done`.

### Ready Criteria

- The item links to an approved requirement and acceptance criteria, or explicitly identifies a setup deliverable.
- Scope and exclusions are clear; dependencies and open decisions are resolved.
- Expected behavior and the first failing test are identified. Documentation-only items instead define a concrete review or validation check.
- A verification method and owner are assigned.

### Done Criteria

- Acceptance criteria are satisfied and verified with recorded evidence.
- Behavior changes followed red-green-refactor; the intended initial failure and final passing result are recorded.
- Relevant regression tests and agreed quality checks pass.
- Applicable desktop, mobile, and accessibility checks are completed.
- Related documents and STATUS.md reflect the actual result.
- Any unverified behavior remains explicitly open, not marked Done.

## Sprint Outline

| Sprint | Goal | Entry gate | Exit gate | State |
| --- | --- | --- | --- | --- |
| 0: Policy and Setup | Establish calculator baseline and test tooling; refine workout policy separately | Agreed product scope | Documented calculator policy and running tests; workout baseline implemented provisionally, detailed approval/review remain open | In Progress |
| 1: Nutrition Slice | Deliver eligibility checks and an end-to-end adult nutrition calculator | Calculator policy/test baseline | AC-001 through AC-004 verified across agreed browsers; qualified review still open | Blocked |
| 2: Workout Slice | Generate compatible gym/home plans with complete written guidance | Provisional WORKOUT_POLICY.md baseline implemented; detailed approval/review still open | AC-005, AC-006, AC-010, AC-026 through AC-029 verified; policy approval and review complete | In Progress |
| 3: Local Saving | Save, restore, and delete profile/plan safely | Stable profile and plan behavior | AC-007 through AC-009 and relevant regressions pass | Draft |
| Release Validation | Validate the agreed MVP for release | All MVP items complete | Release checks pass and release decision is recorded | Draft |

Sprint sizing and sequence are provisional until capacity and dependencies are reviewed. Release validation is a final check, not a reason to defer testing until the end.

## Initial Planning Items

| ID | Sprint | Deliverable | Verification | State |
| --- | --- | --- | --- | --- |
| PLAN-001 | 0 | Document parsing/activity/display calculator baseline; eligibility and saving approved | Implemented baseline matches independent numerical fixtures and validation cases; clinical review tracked separately | Done |
| PLAN-002 | 0 | Provisional workout rules/catalog defined in [WORKOUT_POLICY.md](WORKOUT_POLICY.md); strength plus separate activity-adjusted movement direction approved | Resolve PRD Q-003/Q-005: explicit owner approval of detailed dosing/catalog and qualified equipment/time/guidance/progression review remain outstanding | In Progress |
| PLAN-003 | 0 | Configure Node tests, Playwright, and local static server | Runner/product red-green and real-browser journeys verified, including later WebKit runs; earlier installation block is historical | Done |
| PLAN-004 | 0 | Refine the calculator slice into test scenarios | Traceability and reference/validation/browser cases recorded in TEST_PLAN.md and STATUS.md | Done |

## MVP Implementation Candidates

Calculator/profile-storage items have implementation evidence. Workout preview items passed local unit/available-browser verification against a provisional policy, not Done pending detailed approval, qualified review and remaining release checks.

| ID | Sprint | Requirement / acceptance criteria | Deliverable | State |
| --- | --- | --- | --- | --- |
| APP-001 | 1 | FR-001 / AC-001, AC-002 | Implemented eligibility gate/metric form with local browser evidence including later WebKit; qualified/release review open | Blocked |
| APP-002 | 1 | FR-002 / AC-003, AC-004 | Implemented four-goal estimates, assumptions and limits with local browser evidence; final integration matrix and release review open | Blocked |
| APP-003 | 2 | FR-003 / AC-005, AC-006, AC-026 through AC-029 | Implemented deterministic home/gym strength preview, all agreed levels/days/durations, time budgets and insufficient-equipment refusal; separate activity/history-adjusted walking/cardio; independent of BMI/calories/body type; local regressions passed, policy review/approval pending | In Progress |
| APP-004 | 2 | FR-003, FR-005 / AC-005, AC-010 | Written sets/reps/rest/cues/progression implemented without videos; detailed catalog/dosing remain provisional pending explicit owner approval and professional review | In Progress |
| APP-005 | 3 | FR-004 / AC-007 through AC-009, AC-020, AC-027, AC-032 | Shared tab snapshots/drafts and opt-in v6 profile plus six workout settings implemented; no persisted eligibility/results; v1-v5 decoding with UI activity reselection, stale-credit invalidation and cross-tab revocation checks; final matrix pending | In Progress |
| APP-006 | Release Validation | All MVP requirements and quality criteria | Responsive, keyboard, browser, safety, privacy, and regression validation | Draft |
| APP-007 | 1 | FR-002, FR-004 / AC-011 through AC-013 | Target weight, restricted weekly pace, updated calories/results and legacy profile restoration implemented; final integration matrix and qualified/release review open | Blocked |
| APP-008 | Preview Sharing | D-011 | Public PetarKaragachliev/Website repository, successful Pages workflow, and live development-preview URL verified | Done |
| APP-009 | Nutrition Guidance | FR-006, FR-007 / AC-014 through AC-017 | Requested nutrient references/limits, age/category boundaries, flexible four-occasion meal example and even split implemented/tested; qualified nutrition/content review remains a release gate | Blocked |
| APP-010 | Body Context | FR-008, FR-004 / AC-018 through AC-020 | Optional BMI/waist indicators, existing body-fat/method, self-description, independent assessment, and consent-based v3 storage implemented; qualified interpretation/content review remains a release gate | Blocked |
| APP-011 | Waist Estimate / Development Hygiene | D-014, FR-008 / AC-018, AC-020 | Adult RFM, protocol-specific waist interpretation, v4 migration, and non-OneDrive development checkout/guards implemented; professional body-composition/content review remains a release gate | Blocked |
| APP-012 | Localization | D-021, FR-009, FR-004 / AC-021 through AC-023 | BG-default top BG/EN switch restored locally; local static/dynamic presentation without reload, preserving inputs/results/iframes/disclosures and calculation/profile contracts. Guarded independent `liftfuel.language`; Delete resets BG only after successful removal. All 431 units and 630 browser checks passed, including 40 language checks; clinical-language review pending; not published | In Progress |
| APP-013 | Expanded Body Analyzer | D-016 / AC-018 through AC-026 | Dual-waist model, BMI/RFM/fat/fat-free mass, age/category reference comparison and cautious profiles; optional proportions, central layout/right nutrient column, v5 storage, separate training placeholder implemented/tested; qualified content review remains open | Blocked |
| APP-014 | Shared Integration | D-020 / AC-026 through AC-032 | Common age/weight/goal/outside activity only on nutrition; six training settings; automatic nonaccumulative seven-day intake with unchanged rest base, age/support limits and whole-day withholding. Integration/unit coverage implemented; final matrix and qualified energy/dosing review pending | In Progress |

APP-010/APP-011/APP-013 record historical v3/v4/v5 milestones, not current storage/UI contracts. D-020/APP-014 supersede the independent D-019 slice; original three-region Bulgarian styling, same-tab links, loader recovery and no-JavaScript native-submit protection remain. Earlier 92 workout / 387 total units and 192 browser checks are historical evidence, not current integration totals. No capture is enabled; see STATUS.md for run evidence.

## Implementation Item Template

- ID: TBD.
- Title and user outcome: TBD.
- Requirement / acceptance IDs: TBD.
- Sprint, priority, owner, estimate: TBD.
- State: Draft.
- Scope / exclusions: TBD.
- Dependencies: TBD.
- First failing test and expected failure: TBD.
- Additional applicable scenarios: TBD.
- Verification commands or manual procedure: TBD.
- Evidence: TBD; link to the result in STATUS.md.

## Deferred Work

- Qualified review of detailed workout dosing/catalog and integrated energy estimates remains deferred release work, not a reason to describe implemented handoff, input saving or calorie integration as absent.
- Reviewed 5-10 second technique videos, generated/supplied by the owner after workout plans are defined. AI-generated technique must be reviewed before publication.
- Ages 16-17: deferred pending a separate age-appropriate approach and qualified review.
- Accounts, syncing, imperial units, and aggressive bulking are outside the agreed MVP, not implicitly scheduled future work.

References: [PRD.md](PRD.md), [TEST_PLAN.md](TEST_PLAN.md), [STATUS.md](STATUS.md).
