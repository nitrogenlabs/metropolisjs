# AI Coding Assistant Instructions

## Shared NLabs Stack
- Use Lex (`@nlabs/lex`) for CLI workflows, building, compiling, deploying, and testing projects.
- Use Vitest for unit and integration tests.
- Use Playwright for end-to-end tests.
- Use GothamUI (`@nlabs/gothamui`) for the web presentation layer. Obtain components, views, routing, Tailwind setup, and default styles from GothamUI before creating custom project-level components.
- Use React v19 for frontend work.
- Use Tailwind v4 for CSS styles.
- Use MetropolisJS (`@nlabs/metropolisjs`) as the starting point for all frontend API integration. Create custom data types, actions, queries, or mutations only after MetropolisJS has been exhausted.
- Use Rip-Hunter to access API endpoints.
- Use `fetch` through Rip-Hunter rather than direct project-level `fetch` calls.
- Use ArkhamJS (`@nlabs/arkhamjs`) as the frontend data store. Store data, including session-storage-backed data, through Flux actions and event listeners.
- Prefer listening for Flux events over chaining `.then(...)` to Flux action promises.
- Flux actions update the data store before dispatching their events.
- Multiple listeners may listen for the same Flux action event.
- Read persistent data from the data store, and read event-specific data directly from the Flux action event when appropriate.
- Send all data as JSON.
- Use Reaktor (`@nlabs/reaktor`) for actions that interact with the ArangoDB database.

## Database
- All projects use the ArangoDB instance at `https://db.reaktor.io:8529`.
- ArangoDB is a document NoSQL database with SQL-style query and graph database features.
- When adding or deleting documents, check whether associated graph edges also need to be added or deleted.

## Project Structure
- Web apps should contain at least one microsite.
- Web apps should include a `src/ui` folder.
- Web apps with a backend should include a `src/api` folder or microsite.
- Library projects may use a root source folder without `src/ui` or `src/api`.
- Shared utility/helper functions should live in a shared file when used in more than one place.
- Keep one component per file.
- Each component should have a sibling test file named `MyComponent.test.ts` or `MyComponent.test.tsx`.
- Group components by component folder, for example `src/ui/components/MyComponent/MyComponent.tsx`.

## Package Scripts
- All projects should have at least `start`, `test`, and `update` scripts.
- If a project includes both `api` and `ui` workspaces, use `concurrently` in `start`:
  `"start": "concurrently \"npm run start -w api\" \"npm run start -w ui\""`
- Use this workspace test script:
  `"test": "npm run test --workspaces --ignore-scripts"`
- Use this workspace update script:
  `"update": "npm run update --workspaces"`

## Testing
- Maintain at least 90% unit test coverage.
- Components that require other components should have integration tests.
- Provide at least one Playwright e2e test for each happy path.

## Code Style
- Use arrow functions for functions.
- Correctly type all variables, props, and arguments unless TypeScript inference already provides the correct type.
- Sort props and object keys alphabetically.
- Check and fix all ESLint errors and warnings.
- Use `eslint-config-styleguide` for linting rules.

<!-- BEGIN SHARED ARCHITECTURE GUARDRAILS -->
## Shared architecture guardrails

These rules apply to new and modified code. The cross-project audit and capability backlog are maintained in `nitrogenx/docs/architecture-audit`. A proposed extraction is not an available package API until its export and consumer adoption are verified.

- Before implementing infrastructure or presentation logic, inspect the owning shared package's public exports, documentation, and tests. Check the consumer's installed version and lockfile, not only the sibling checkout. Use public package entry points; do not import another repository's source/internal files or add absolute runtime paths. Verify public declarations against the actual consumer framework types, including callback inference; preserve supported public framework type aliases rather than emitting private generated-type paths.
- Package ownership: GothamUI (`@nlabs/gothamui`) owns web components, views, routing, styles, scoped document-head lifecycle/serialization, and generic media/editor presentation. MetropolisJS owns frontend API actions/adapters, session policy/orchestration, and cache ingestion. Rip-Hunter owns HTTP/GraphQL encoding, headers, status/errors, timeouts, and streaming. ArkhamJS and its storage/React packages own state, persistence, and Flux event mechanics. Reaktor owns backend/database actions, authorization, and graph-edge lifecycle. Lex owns build/test/lint/deployment orchestration. Utils owns pure reusable helpers without UI, session, endpoint, or database policy.
- Use React 19 and Tailwind v4 for web UI. GothamJS is a legacy dependency: use GothamUI for new shared web capabilities, and migrate legacy imports, mocks, aliases, and style scans together when a validated compatible release is available. Do not introduce new GothamJS dependencies or assume a package rename alone completes migration.
- React Native renderers and lifecycle bindings stay native. Prefer compatible LanternUI/native primitives; do not import DOM-based GothamUI components into native views. Share platform-neutral contracts, policies, and controllers through supported lean entry points.
- Do not create project-level copies of routing/listener protocols, session expiry/refresh controllers, request clients, persistence queues, media compositors, web document-head lifecycle, or generic UI when a supported shared implementation exists. Compose thin app adapters for configuration, callbacks, platform events, and business rules. If the package lacks a required capability, document the concrete gap and extend the owning package within the authorized scope before adoption. Do not silently copy a helper or treat a proposed API as implemented.
- Keep product-specific contracts/selectors/workflows in an existing app-shared/domain package when they have no cross-product meaning. Preserve provider accounting, editorial/provenance rules, game simulation, secure credentials, and authorization checks in their domain owners. Similar-looking pages alone do not justify merging business behavior.
- Use MetropolisJS for frontend integration and Rip-Hunter for transport. No direct app-level `fetch` or parallel HTTP/GraphQL stack. Transport-library implementation and request implementations explicitly injected into Rip-Hunter for tests or native compatibility may use the platform request primitive. Preserve binary/multipart/streaming contracts rather than forcing them to JSON; ordinary API data uses JSON.
- Preserve the consumer's timeout policy explicitly: absolute request/body deadlines and Node socket-idle timeouts are different contracts. Shared deadline scheduling must handle finite durations above the platform timer limit with bounded intervals and elapsed-time accounting; preserve zero-disable policy, exact abort reasons, and timer/listener cleanup. Keep retry, redirect, response decoding and paid-operation accounting in domain adapters; do not replay mutations automatically. Transport tests must inject the binding used by the installed package and block unintended outbound provider/database connections.
- Use public Lex commands for deployment orchestration and Reaktor provisioning for pure resource/configuration planning. Keep only secret-free app descriptors and domain startup smoke checks locally. Preserve provider fields, exact stage targets, revision/ETag guards, asset-before-HTML ordering and smoke-before-ZIP checks; shared Lambda alias promotion and cloud acceptance require separate verification.
- Use ArkhamJS actions/store/event subscriptions for shared and persisted frontend state. Flux actions update state before dispatching events; prefer listeners over promise chains. Use the appropriate secure-storage adapter for credentials, never unencrypted preference persistence. Keep platform-specific storage bindings outside pure policy modules.
- Preserve behavior during extraction: refresh windows and rounding, single-flight semantics, network-failure/signout policies, stale-result guards, retries/idempotency, timeout/cancellation behavior, missing/error handling, and configuration precedence. Keep browser/native events local. An unfinished or stub production flow remains unfinished until separately implemented and tested; a refactor must not claim to complete it.
- Centralize implementation regression tests in the owning package. Keep consumer contract/integration tests and happy-path Playwright tests for web flows; native changes require suitable native/bundle/device checks. Maintain at least 90% unit coverage, run affected typechecks/builds/lint, and report baseline failures separately. Do not weaken assertions or duplicate algorithms in tests merely to satisfy coverage.
- Use Lex CLI workflows and Lex's bundled Vitest/Playwright where supported. Do not add duplicate direct test-runner dependencies solely for a new suite. Inspect script hooks before verification; avoid unintended whole-project auto-fixes, builds, or external tool invocation during a read-only review. Verify the actual installed lint command's nonmutating/fix, config and max-warning contracts against a controlled fixture before read-only use; parsing a dry-run flag or reporting success does not establish that files were unchanged or the requested rules ran. Native command launch failures must report a sanitized command and error code without exposing arguments, paths, environment, or raw errors. If Lex lacks a required native command, use the project's existing native tool and document that limitation; do not copy tooling scripts or patch installed dependencies as a permanent workaround.
- After Lex adoption, verify the actual consumer runner, coverage provider and compiler versions and public types as one installed contract. Check that bare runner imports, public assertion/setup types and jest-dom integration resolve a compatible instance without temporary aliases or symlinks. Validate actual unassisted commands and the supported package-manager peer graph; do not assume a hoisted or peer-only dependency is portable across npm and Yarn.
- Adopt verified compatible published registry versions with manifest/lockfile agreement. For authorized shared-package work, publish the owning package before consumer adoption; do not use local or repository-relative archives, file links, source aliases, or vendored shared source as consumer dependencies. Existing archive pins are migration debt: replace them with verified published releases within the authorized scope, rather than introducing another archive. Immutable tarballs are reviewed publication artifacts, not consumer dependency substitutes. Do not assume local exports are published, blanket-upgrade unrelated dependencies, or alter registry/release state without authorization.
- For authorized release publication, use the verified public Lex immutable-archive workflow with the exact reviewed tarball, lifecycle scripts disabled and an explicit intended distribution tag. Recheck archive hashes, registry payload/version and tags after execution; a dry run or authenticated identity does not establish publication, and two-factor rejection must remain an unresolved release gate. Never rebuild a frozen archive from a dirty producer tree or promote latest implicitly.
- Shared fixes require package regression tests plus a representative consumer integration check before removing the old implementation. Record ownership, adoption status, and remaining gaps in the audit. Keep local project instructions; update these guardrails centrally and check all scoped AGENTS.md files with `nitrogenx/scripts/sync-architecture-guardrails.py --check`.

### Unit test rules

These apply to every unit test in every project. Tests that touch real I/O, real time or heavy per-test work pass on a quiet machine, fail intermittently on a loaded one, and block commits.

- Mock every request. A unit test never reaches a real network, database, cloud provider, DNS, socket, loopback server, or filesystem outside a per-test temporary directory. Stub the transport at its boundary (the injected request implementation, `fetch`, or an in-memory fake of the port) and make any unexpected outbound call fail the test.
- Time is a dependency. Tests of deadlines, retries, expiry or debouncing use a fake clock and advance it deterministically; a real deadline of a few milliseconds is a race on a loaded machine. Run until the operation reaches the port the test holds open, assert that premise, then advance the clock. Never sleep to wait for work.
- Isolate every test. Each test builds its own state and does not depend on order, shared module state, or the asynchronous leftovers of an earlier step. Split a test that chains several behaviors through one rendered tree or one long async sequence.
- Keep tests fast. The default 5 s limit is a ceiling, not a budget. A unit test that takes more than 1 s alone is a defect: find where the time goes (a missing mock, real crypto or password-hash cost, schema or module graph rebuilt per test, a fixture rebuilt per test) and remove it by mocking, injecting a test-only cost parameter whose default is the production value, sharing immutable setup, or splitting the test. Never lower a production security or cost parameter for a test. Measure per-test durations before and after.
- No workarounds. Do not raise `testTimeout` or add per-test timeouts, add retries or sleeps, use `skip`, `todo` or `only`, loosen, widen or delete an assertion or mock, rerun until green, or bypass hooks (`--no-verify`) to make a test pass. An intermittent test is a defect with a cause: reproduce it (loop it under CPU load), fix the cause, and if the code under test cannot be made deterministic, refactor that code or remove the test and state why.
- Verify before changing a test. Read the code under test and establish whether the code or the test is wrong, and keep the assertion's intent. After the fix, prove the test still fails when the behavior breaks (change the implementation, see it fail, restore it), run the test repeatedly under load, and run lint.
- Report a failed pre-commit or CI run by test name and cause. Do not retry blindly or call a failure a flake without a reproduction or evidence.

### Test automation rules

- Pre-commit runs only unit tests. Pre-push runs only end-to-end tests. Neither hook runs the other kind, and neither runs more than the tests need, for example only the builds their tests consume.
- Only TypeScript and JavaScript files (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.mts`, `.cts`) trigger a unit test run. Only those and CSS (`.css`) trigger an end-to-end run. Documentation, JSON, images, configuration and every other file type never trigger a run, whether the trigger is a hook, a CI path filter or a watcher.
- The pre-commit hook decides from the staged files, counting deletions and renames. The pre-push hook decides from every commit being pushed, not only the last one: a new branch is compared with where it left the default branch, and an unreadable range runs the tests instead of skipping them.
- Each project tests its own hooks by running the real hook scripts in a temporary git repository with `npm` stubbed, and proves each rule by breaking it and seeing a test fail.
- Define the end-to-end suite explicitly (one script that runs it) so the pre-push hook has a single entry point. Do not leave end-to-end configs unreferenced.
- A hook is never skipped to get a change in. Fix the cause or report the failing test.
<!-- END SHARED ARCHITECTURE GUARDRAILS -->
