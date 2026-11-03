# Development Backlog

Status: Calculator slice implemented and verified in unit/Chromium/Firefox checks. WebKit verification is blocked; workout implementation is not started. No release is approved.

Sprint dates, capacity, estimates, and owners are TBD. The outline below is a planning template, not an approved delivery schedule.

## Workflow

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
| 0: Policy and Setup | Establish calculator baseline and test tooling; refine workout policy separately | Agreed product scope | Documented calculator policy and running tests; workout rules remain open | In Progress |
| 1: Nutrition Slice | Deliver eligibility checks and an end-to-end adult nutrition calculator | Calculator policy/test baseline | AC-001 through AC-004 verified across agreed browsers; WebKit currently blocked | Blocked |
| 2: Workout Slice | Generate compatible gym/home plans with complete written guidance | Reviewed exercise catalog and ready workout rules | AC-005, AC-006, AC-010 and applicable eligibility checks pass | Draft |
| 3: Local Saving | Save, restore, and delete profile/plan safely | Stable profile and plan behavior | AC-007 through AC-009 and relevant regressions pass | Draft |
| Release Validation | Validate the agreed MVP for release | All MVP items complete | Release checks pass and release decision is recorded | Draft |

Sprint sizing and sequence are provisional until capacity and dependencies are reviewed. Release validation is a final check, not a reason to defer testing until the end.

## Initial Planning Items

| ID | Sprint | Deliverable | Verification | State |
| --- | --- | --- | --- | --- |
| PLAN-001 | 0 | Document parsing/activity/display calculator baseline; eligibility and saving approved | Implemented baseline matches independent numerical fixtures and validation cases; clinical review tracked separately | Done |
| PLAN-002 | 0 | Define workout rules within agreed experience, 2-5 day, 30/45/60-minute, and equipment options; review catalog | Resolve PRD Q-003/Q-005; review equipment, time budgets, guidance, and progression | Draft |
| PLAN-003 | 0 | Configure Node tests, Playwright, and local static server | Runner/product red-green and real Chromium/Firefox journeys verified; complete WebKit installation remains blocked | Blocked |
| PLAN-004 | 0 | Refine the calculator slice into test scenarios | Traceability and reference/validation/browser cases recorded in TEST_PLAN.md and STATUS.md | Done |

## MVP Implementation Candidates

Calculator/profile-storage items now have implementation evidence. They remain open until required browser/review checks are resolved. Workout items are Draft until their rules are defined.

| ID | Sprint | Requirement / acceptance criteria | Deliverable | State |
| --- | --- | --- | --- | --- |
| APP-001 | 1 | FR-001 / AC-001, AC-002 | Implemented eligibility gate/metric form; unit and Chromium/Firefox tests pass; WebKit remains open | Blocked |
| APP-002 | 1 | FR-002 / AC-003, AC-004 | Implemented four-goal estimates, assumptions, and limits; unit and Chromium/Firefox tests pass; WebKit/release review open | Blocked |
| APP-003 | 2 | FR-003 / AC-005, AC-006 | Equipment/schedule-compatible gym and home workout generation | Draft |
| APP-004 | 2 | FR-003, FR-005 / AC-005, AC-010 | Written exercise details and progression without video placeholders | Draft |
| APP-005 | 3 | FR-004 / AC-007 through AC-009 | Profile-only saving delivered with calculator; workout saving deferred; WebKit verification open | In Progress |
| APP-006 | Release Validation | All MVP requirements and quality criteria | Responsive, keyboard, browser, safety, privacy, and regression validation | Draft |
| APP-007 | 1 | FR-002, FR-004 / AC-011 through AC-013 | Target weight, restricted weekly pace, updated calories/results, and legacy profile restoration implemented; unit/available-browser checks pass, WebKit/release review remains open | Blocked |
| APP-008 | Preview Sharing | D-011 | Public PetarKaragachliev/Website repository, successful Pages workflow, and live development-preview URL verified | Done |
| APP-009 | Nutrition Guidance | FR-006, FR-007 / AC-014 through AC-017 | Requested nutrient references/limits, age/category boundaries, flexible four-occasion meal example and even split implemented/tested; qualified nutrition/content review remains a release gate | Blocked |
| APP-010 | Body Context | FR-008, FR-004 / AC-018 through AC-020 | Optional BMI/waist indicators, existing body-fat/method, self-description, independent assessment, and consent-based v3 storage implemented; qualified interpretation/content review remains a release gate | Blocked |
| APP-011 | Waist Estimate / Development Hygiene | D-014, FR-008 / AC-018, AC-020 | Adult RFM, protocol-specific waist interpretation, v4 migration, and non-OneDrive development checkout/guards implemented; professional body-composition/content review remains a release gate | Blocked |

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

- Reviewed 5-10 second technique videos, generated/supplied by the owner after workout plans are defined. AI-generated technique must be reviewed before publication.
- Ages 16-17: deferred pending a separate age-appropriate approach and qualified review.
- Accounts, syncing, imperial units, and aggressive bulking are outside the agreed MVP, not implicitly scheduled future work.

References: [PRD.md](PRD.md), [TEST_PLAN.md](TEST_PLAN.md), [STATUS.md](STATUS.md).
