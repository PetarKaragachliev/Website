# LiftFuel

Temporary working name. Visual direction: dark charcoal and lime green, inspired by the owner's Dribbble fitness reference; see PRD.md for details.

Active development folder on this computer: `C:\Users\Petar\Projects\LiftFuel`, outside OneDrive. The previous OneDrive copy is no longer used for development and was left untouched. Open this new folder in OpenCode and GitHub Desktop; remove the old Desktop repository entry without deleting files to stop background fetches into its synced `.git` folder.

Website preview: https://petarkaragachliev.github.io/Website/ . Source: https://github.com/PetarKaragachliev/Website .

[![Test and Publish Preview](https://github.com/PetarKaragachliev/Website/actions/workflows/pages.yml/badge.svg)](https://github.com/PetarKaragachliev/Website/actions/workflows/pages.yml)

The site opens directly in Bulgarian, with no English selector. The original sidebar, central input panel, right-hand results panel and LF hero artwork are retained. Nutrition is primary in one shared form: explicitly choose activity and goal (neither has a default), enter the five required measurements (formula category, age, height, current weight and `waistRfm`), confirm eligibility, and select **Изчисли моите резултати**. Additional measurements are optional. **Хранителна цел** (`section#nutrition-details`) is an ordinary noncollapsible section before waist. One click computes nutrition and bonus body analysis, focusing the nutrition output on success. The right panel shows calorie/protein/carbohydrate/fat placeholders before calculation, not invented targets, with the remaining nutrients vertically below fats.

Body analysis retains its existing formulas and limits and can still provide a valid bonus when nutrition reaches support limits or a goal is missing. Missing required nutrition choices produces a focused error summary with linked field errors and does not save the submission. There is no body-only UI or nutrition-only reset.

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
| [BODY_ASSESSMENT.md](BODY_ASSESSMENT.md) | Bonus body assessment, required RFM waist, optional measurements, interpretation limits, and storage/consent behavior |
| [LOCALIZATION.md](LOCALIZATION.md) | Bulgarian-only interface, retained local nutrition translations, and cleanup of old language preferences |
| [STATUS.md](STATUS.md) | Current state, blockers, and recorded results |

## Start Here

1. Run the calculator locally using the commands below.
2. Check STATUS.md for results, open release checks, and the WebKit installation blocker.
3. Resolve workout-selection/progression rules before implementing the next feature slice.

## Local Development

- Prerequisites: Node.js 24 LTS and npm. Development uses a static server; there is no production Node backend.
- Run Git/npm/tests only in a checkout outside OneDrive or other sync folders. `.gitignore` does not exclude files from OneDrive. The `predev`, `pretest`, and `pretest:e2e` hooks refuse detected OneDrive workspaces, including configured root aliases/junctions. These hooks do not intercept arbitrary Git commands or guarantee `npm install` creates no files before lifecycle checks; the external checkout is the actual fix.
- Dependencies: `npm install` (executed successfully); use `npm ci` for subsequent lockfile-based clean installations.
- Development: `npm run dev`, then open http://127.0.0.1:4173 . Do not open index.html directly via `file://`; browser ES modules need HTTP serving.
- Unit tests: `npm test`.
- Browser setup: `npx playwright install chromium firefox webkit`. Chromium and Firefox installed; this host currently denies writing WebKit's executable (`EPERM`), so the full install/check is blocked.
- Verified available-browser matrix: `npm run test:e2e -- --project=chromium-desktop --project=chromium-mobile --project=chromium-tablet --project=firefox`.
- Full matrix including WebKit: `npm run test:e2e`. WebKit remains configured, not skipped; fix its host installation problem before expecting this command to pass.
- Owner requirement: do not generate website screenshots, screen recordings, or browser traces unless explicitly requested. All explicit screenshot calls are removed; Playwright screenshot/trace/video capture is off. Text-only diagnostics go to the OS temporary directory under `opencode/liftfuel-test-results`, outside OneDrive. The website itself has no display/camera-capture feature.
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
2. Choose **File > Add Local Repository** and select `C:\Users\Petar\Projects\LiftFuel`. This active folder is already a Git repository connected to the existing GitHub project; do not create a nested repository or continue using the old OneDrive copy.
3. For a new repository, click **Publish repository**, choose its name, and uncheck **Keep this code private** if public sharing is intended. The current project's published repository is named `Website`.
4. Open the repository on GitHub, then **Settings > Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Open **Actions > Test and Publish Preview**. If the first run failed because Pages was not enabled yet, use **Re-run all jobs** after step 4.
6. After a successful deployment, the Pages settings/environment shows the shareable website URL. The repository URL is for source code; share the Pages URL to let others use the calculator.

Future updates: review changes, commit the intended files, and use **Push origin** in Desktop when you want to publish. A successful workflow updates the preview automatically. The assistant does not commit/push future work unless requested.

## Layout

- `public/index.html`, `public/styles.css`: Accessible form and dark/green responsive interface.
- `public/js/nutrition.js`: Input validation and nutrition calculations, shared by browser and unit tests.
- `public/js/guidance.js`: Sourced age/category nutrient references and optional four-occasion meal structure. Values are references/limits, not actual intake or supplement doses. Four-hour spacing is an example, not a universal health rule.
- `public/js/body-assessment.js`: RFM, BMI weight category, estimated fat/fat-free masses, two distinct waist measurements, descriptive proportions and provisional age/category reference comparison. No muscle-mass diagnosis or automatic calorie/exercise changes.
- `public/js/profile-storage.js`: strict normalized v5 profile records and protocol-preserving v1-v4 restoration, without saved eligibility or calculated results.
- `public/js/measurements.js`: Strict metric parsing shared by nutrition and body assessment.
- `public/js/i18n.js`, `public/js/bg-models.js`, `public/js/bg-app.js`: local Bulgarian nutrition-model translations; static analyzer text is Bulgarian directly.
- `public/training.html`: separate, clearly labeled future-feature page opened in the same browser tab from the completed analysis, with a return link; no workout generation or health data in URLs.
- `public/js/app.js`: DOM rendering and consent-based local profile storage.
- `public/js/start.js`: versioned application entry point and explicit startup-failure/reload feedback. Keep its HTML revision and imported application revision in sync when changing the startup contract; the submit button stays disabled until initialization completes.
- `tests/unit/`, `tests/e2e/`: Independent numerical fixtures and real browser scenarios.

No profile data is sent to an application backend. Device remembering is off by default. Consented successful shared-form calculation saves strict version-5 inputs at `liftfuel.profile.v1`, with separate RFM and midpoint waists; the schema is unchanged and legacy body-only saved records remain readable. Legacy records retain their original measurement origins without guessing missing values or nutrition choices. Eligibility and computed percentages/masses are never saved. Source links navigate externally only when activated.

The old `liftfuel.language` preference is no longer read or written; Delete still removes it if present. Browser-storage failures do not stop unsaved analysis and do not falsely claim retained data was deleted.
