# LiftFuel

Temporary working name. Visual direction: dark charcoal and lime green, inspired by the owner's Dribbble fitness reference; see PRD.md for details.

Website preview: https://petarkaragachliev.github.io/Website/ . Source: https://github.com/PetarKaragachliev/Website .

[![Test and Publish Preview](https://github.com/PetarKaragachliev/Website/actions/workflows/pages.yml/badge.svg)](https://github.com/PetarKaragachliev/Website/actions/workflows/pages.yml)

A browser-based nutrition calculator and workout planner for generally healthy adults aged 18-56. The agreed MVP supports metric inputs, fat loss, maintenance, muscle building, conservative weight gain, gym/home plans, and device-local saving.

Built with HTML, CSS, and JavaScript; no accounts or backend. Exercise instructions will include sets, reps, rest, technique cues, and progression. Videos are deferred until the owner supplies reviewed clips.

The calculator includes target weight and restricted desired weekly gain/loss, responsive calorie/macro estimates, validation, eligibility confirmation, and optional local profile saving/deletion. Weekly kg choices scale with current weight; unsupported destinations/rates are blocked. Rates are planning preferences, not promised results or universal health guarantees. Workout generation and videos are not implemented. Qualified content review and the full release checklist remain open.

## Documents

| Document | Purpose |
| --- | --- |
| [PRD.md](PRD.md) | Product goals, scope, requirements, and acceptance criteria |
| [BACKLOG.md](BACKLOG.md) | Sprint plan and testable work items |
| [TEST_PLAN.md](TEST_PLAN.md) | Test strategy, TDD workflow, and verification evidence |
| [NUTRITION_POLICY.md](NUTRITION_POLICY.md) | Approved starting calculations, sourced rationale, arithmetic fixtures, and remaining safety gates |
| [NUTRIENT_REFERENCES.md](NUTRIENT_REFERENCES.md) | Daily nutrient reference tables, limits, sources, and flexible meal guidance; not a food diary or supplement plan |
| [STATUS.md](STATUS.md) | Current state, blockers, and recorded results |

## Start Here

1. Run the calculator locally using the commands below.
2. Check STATUS.md for results, open release checks, and the WebKit installation blocker.
3. Resolve workout-selection/progression rules before implementing the next feature slice.

## Local Development

- Prerequisites: Node.js 24 LTS and npm. Development uses a static server; there is no production Node backend.
- Dependencies: `npm install` (executed successfully); use `npm ci` for subsequent lockfile-based clean installations.
- Development: `npm run dev`, then open http://127.0.0.1:4173 . Do not open index.html directly via `file://`; browser ES modules need HTTP serving.
- Unit tests: `npm test`.
- Browser setup: `npx playwright install chromium firefox webkit`. Chromium and Firefox installed; this host currently denies writing WebKit's executable (`EPERM`), so the full install/check is blocked.
- Verified available-browser matrix: `npm run test:e2e -- --project=chromium-desktop --project=chromium-mobile --project=chromium-tablet --project=firefox`.
- Full matrix including WebKit: `npm run test:e2e`. WebKit remains configured, not skipped; fix its host installation problem before expecting this command to pass.
- Build: None. The active GitHub Pages workflow publishes only `public/`; node_modules, tests, and development artifacts are not part of the hosted site.

## GitHub Publishing

The owner published the public repository `PetarKaragachliev/Website` and its GitHub Pages development preview (the original proposed repository name was `liftfuel`). Source and planning documents are public. Publishing a preview does not mean content has completed qualified review or all MVP features are built.

- Workflow: `.github/workflows/pages.yml`. Pull requests run tests only; pushes to `main` and manual runs on `main` deploy after tests pass.
- Checks: Node.js 24, `npm ci`, unit tests, and the complete Playwright matrix on Linux, including WebKit. The local WebKit installation failure is not waived in CI.
- Hosting: GitHub Pages must be configured with **GitHub Actions** as its source. The deployed URL comes from the successful deployment's `github-pages` environment.
- After setup, explicitly approved commits pushed to `main` automatically update the public preview if all checks pass. Changes only on this computer are not automatically committed or uploaded.
- Authentication: GitHub Desktop can handle sign-in and publishing. Its login does not automatically sign the GitHub CLI in; CLI use is optional for the owner. Never put tokens/passwords in source or chat. The publishing account needs repository access and permission to push workflow files.
- User data: Profiles remain in the viewer's browser. GitHub serves the website and receives normal hosting requests; "local profile saving" does not mean the hosting provider sees no traffic. Localhost profiles do not transfer to the GitHub Pages origin.

Editing local files does not update GitHub by itself. Approved updates must be committed and pushed to `main`; tests and successful deployment then update the public preview automatically. The workflow badge above shows its current state.

### Publish With Desktop

Initial setup is already complete for `PetarKaragachliev/Website`; these steps describe first-time publishing, not a request to create another repository.

1. Sign into your GitHub account in GitHub Desktop.
2. Choose **File > Add Local Repository** and select `C:\Users\Petar\OneDrive\Desktop\Website`. This folder is already initialized as a Git repository; do not create a second repository inside it.
3. For a new repository, click **Publish repository**, choose its name, and uncheck **Keep this code private** if public sharing is intended. The current project's published repository is named `Website`.
4. Open the repository on GitHub, then **Settings > Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Open **Actions > Test and Publish Preview**. If the first run failed because Pages was not enabled yet, use **Re-run all jobs** after step 4.
6. After a successful deployment, the Pages settings/environment shows the shareable website URL. The repository URL is for source code; share the Pages URL to let others use the calculator.

Future updates: review changes, commit the intended files, and use **Push origin** in Desktop when you want to publish. A successful workflow updates the preview automatically. The assistant does not commit/push future work unless requested.

## Layout

- `public/index.html`, `public/styles.css`: Accessible form and dark/green responsive interface.
- `public/js/nutrition.js`: Input validation and nutrition calculations, shared by browser and unit tests.
- `public/js/guidance.js`: Sourced age/category nutrient references and optional four-occasion meal structure. Values are references/limits, not actual intake or supplement doses. Four-hour spacing is an example, not a universal health rule.
- `public/js/app.js`: DOM rendering and consent-based local profile storage.
- `tests/unit/`, `tests/e2e/`: Independent numerical fixtures and real browser scenarios.

No profile data is sent to an application backend. Saving keeps the browser key `liftfuel.profile.v1`, with record version 2 storing target weight and pace. Earlier version-1 profiles restore validated base inputs without inventing new plan choices. Eligibility confirmation is never persisted. Explicit research links navigate to external sites only when activated.
