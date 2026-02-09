---
phase: quick
plan: 001
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/**/*
  - backend/package.json
  - backend/tsconfig.json
  - backend/.kysely-codegenrc.json
  - backend/.env.example
  - package.json
  - .gitignore
  - frontend/src/types/api.ts
autonomous: true

must_haves:
  truths:
    - "Backend code lives in backend/src/ instead of src/"
    - "Backend builds and compiles with tsc from backend/"
    - "Backend dev server starts with npm script from root or backend/"
    - "Backend tests pass (vitest run)"
    - "Database migrations still run correctly"
    - "Frontend proxy still reaches backend API"
  artifacts:
    - path: "backend/src/main.ts"
      provides: "Backend entry point in new location"
    - path: "backend/package.json"
      provides: "Backend-specific package.json with dependencies and scripts"
    - path: "backend/tsconfig.json"
      provides: "Backend TypeScript config with rootDir=./src"
    - path: "package.json"
      provides: "Root workspace package.json orchestrating backend/ and frontend/"
  key_links:
    - from: "package.json (root)"
      to: "backend/package.json"
      via: "npm workspaces"
      pattern: '"workspaces".*"backend"'
    - from: "backend/package.json scripts"
      to: "backend/src/"
      via: "tsx and tsc commands referencing src/"
      pattern: "tsx.*src/"
---

<objective>
Reorganize the monorepo by moving the backend code from the root-level `src/` directory into a proper `backend/` directory with its own package.json and tsconfig.json, mirroring the existing `frontend/` structure.

Purpose: Clean monorepo structure where backend and frontend are peer directories, each self-contained with their own configs, dependencies, and build processes. This enables proper npm workspaces, independent dependency management, and clearer project organization.

Output: A `backend/` directory containing all backend source code, configs, and dependencies. Root package.json becomes a workspace orchestrator. All imports, scripts, and configs updated to reflect the new structure.
</objective>

<execution_context>
@/Users/craigcronin/.claude/get-shit-done/workflows/execute-plan.md
@/Users/craigcronin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Move backend source and create backend package</name>
  <files>
    backend/src/* (all files from src/)
    backend/package.json (new, from root package.json backend deps)
    backend/tsconfig.json (moved from root tsconfig.json)
    backend/.kysely-codegenrc.json (moved from root, path updated)
    backend/.env.example (copied from root)
    backend/migrations/* (moved from root migrations/)
    package.json (root - converted to workspace orchestrator)
    .gitignore (updated for backend/)
  </files>
  <action>
    This is a structural move. Use git mv for history preservation where possible.

    **Step 1: Create backend directory and move source code**
    ```
    mkdir -p backend
    git mv src backend/src
    git mv migrations backend/migrations
    ```

    **Step 2: Create backend/package.json**
    Create a new `backend/package.json` extracted from the current root package.json. It should contain:
    - `"name": "backend"`
    - `"version": "1.0.0"`
    - `"private": true`
    - All `dependencies` currently in root package.json (fastify, kysely, pg, ws, zod, etc.)
    - All `devDependencies` currently in root package.json (typescript, tsx, vitest, kysely-codegen, node-pg-migrate, pino-pretty, @types/*)
    - `scripts` section - copy ALL scripts from root package.json, updating paths:
      - `"build": "tsc"`
      - `"dev": "tsx --env-file=.env src/main.ts"`
      - `"dev:api": "tsx --env-file=.env src/api/server.ts"`
      - `"start": "node dist/main.js"`
      - `"start:api": "node dist/api/server.js"`
      - `"test": "vitest run"`
      - `"test:watch": "vitest"`
      - `"db:migrate": "tsx node_modules/.bin/node-pg-migrate up && npm run db:codegen"`
      - `"db:migrate:create": "node-pg-migrate create -j ts -m migrations"`
      - `"db:codegen": "kysely-codegen"`
      - `"db:seed": "tsx --env-file=.env src/database/seed.ts"`
      - `"db:reset": "tsx --env-file=.env src/database/reset.ts"`
    - Keep the `"node-pg-migrate"` config section with `"migrations-dir": "migrations"` (migrations are now relative to backend/)

    **Step 3: Move backend tsconfig.json**
    Move root `tsconfig.json` to `backend/tsconfig.json`. No content changes needed since:
    - `rootDir` is already `./src` (relative, still correct)
    - `outDir` is already `./dist` (relative, still correct)
    - `include` is already `["src/**/*"]` (relative, still correct)

    ```
    git mv tsconfig.json backend/tsconfig.json
    ```

    **Step 4: Move and update .kysely-codegenrc.json**
    Move to backend/ and keep `outFile` as `src/database/types.ts` (it's relative, still correct from backend/).
    ```
    git mv .kysely-codegenrc.json backend/.kysely-codegenrc.json
    ```

    **Step 5: Copy .env.example to backend/**
    ```
    cp .env.example backend/.env.example
    ```
    Also copy .env to backend/.env if it exists (for local dev - it's gitignored).
    ```
    cp .env backend/.env 2>/dev/null || true
    ```

    **Step 6: Convert root package.json to workspace orchestrator**
    Replace root package.json with a minimal workspace config:
    ```json
    {
      "name": "mti-wifi-gsd",
      "version": "1.0.0",
      "private": true,
      "workspaces": ["backend", "frontend"],
      "scripts": {
        "dev": "npm run dev --workspace=backend",
        "dev:api": "npm run dev:api --workspace=backend",
        "dev:frontend": "npm run dev --workspace=frontend",
        "build": "npm run build --workspaces",
        "build:backend": "npm run build --workspace=backend",
        "build:frontend": "npm run build --workspace=frontend",
        "test": "npm run test --workspaces --if-present",
        "test:backend": "npm run test --workspace=backend",
        "db:migrate": "npm run db:migrate --workspace=backend",
        "db:seed": "npm run db:seed --workspace=backend",
        "db:reset": "npm run db:reset --workspace=backend",
        "docker:up": "docker compose up -d",
        "docker:down": "docker compose down",
        "docker:reset": "docker compose down -v && docker compose up -d"
      }
    }
    ```
    Note: docker commands stay at root since docker-compose.yml stays at root.

    **Step 7: Update .gitignore**
    Current .gitignore has:
    ```
    node_modules/
    dist/
    .env
    *.js.map
    docker-compose.override.yml
    ```
    This is fine - the patterns are relative and will match in subdirectories too. No changes needed unless we want to be more explicit. Add `backend/.env` entry to be safe (though `**/.env` pattern via `node_modules/` style would catch it, the explicit `.env` line only matches root).

    Update .gitignore to:
    ```
    node_modules/
    dist/
    .env
    backend/.env
    *.js.map
    docker-compose.override.yml
    ```

    **Step 8: Update frontend/src/types/api.ts comments**
    Lines 5-7 reference `src/api/schemas/*`. Update these comments to reference `backend/src/api/schemas/*`:
    ```
    * - backend/src/api/schemas/factories.ts
    * - backend/src/api/schemas/gateways.ts
    * - backend/src/api/schemas/common.ts
    ```

    **Step 9: Clean up root dist/ directory**
    Remove the old `dist/` directory at root since builds will now output to `backend/dist/`.
    ```
    rm -rf dist/
    ```

    **IMPORTANT: Do NOT modify any import paths within backend/src/**. All imports use relative paths (e.g., `../utils/logger`, `./config`) which remain correct since the entire src/ tree moved as a unit. The internal structure is unchanged.**
  </action>
  <verify>
    1. Verify directory structure: `ls backend/src/` shows api, acquisition, config.ts, database, gateway, main.ts, output, repositories, types, utils
    2. Verify directory structure: `ls backend/migrations/` shows the 3 migration files
    3. Verify backend/package.json exists with all dependencies
    4. Verify backend/tsconfig.json exists with correct config
    5. Verify backend/.kysely-codegenrc.json exists
    6. Verify root package.json has workspaces config
    7. Verify old src/ directory no longer exists at root
    8. Verify old migrations/ directory no longer exists at root
    9. Verify old tsconfig.json no longer exists at root
    10. Verify old .kysely-codegenrc.json no longer exists at root
  </verify>
  <done>
    All backend source code, migrations, and config files live under backend/. Root package.json is a workspace orchestrator. No source files remain at root level. Old root-level dist/ cleaned up.
  </done>
</task>

<task type="auto">
  <name>Task 2: Install dependencies and verify build/test/run</name>
  <files>
    backend/node_modules/* (npm install)
    backend/package-lock.json (may be generated)
    package-lock.json (root, regenerated by workspaces)
  </files>
  <action>
    **Step 1: Install workspace dependencies**
    From the project root, run:
    ```
    npm install
    ```
    This will install dependencies for all workspaces (backend and frontend). npm workspaces will hoist shared dependencies to root node_modules and create workspace-specific node_modules where needed.

    If npm install fails due to lock file conflicts, delete the root package-lock.json and root node_modules first:
    ```
    rm -rf node_modules package-lock.json
    npm install
    ```

    **Step 2: Verify TypeScript compilation**
    ```
    cd backend && npx tsc --noEmit
    ```
    This should compile without errors. If there are path resolution issues, check that tsconfig.json rootDir and include patterns are correct.

    **Step 3: Run backend tests**
    ```
    npm run test --workspace=backend
    ```
    OR from backend/:
    ```
    cd backend && npm test
    ```
    All existing tests (command-client.test.ts, encryption.test.ts) must pass.

    **Step 4: Verify dev server can start (quick smoke test)**
    Only if database is running (docker). If docker is not running, skip this step.
    ```
    cd backend && npx tsx --env-file=.env src/api/server.ts &
    sleep 3
    curl -s http://localhost:3000/api/health
    kill %1
    ```
    Expected: health endpoint returns 200 OK.

    **Step 5: Verify frontend still builds**
    ```
    npm run build --workspace=frontend
    ```
    Frontend should build without issues since it has its own self-contained setup and only connects to backend via HTTP proxy.

    **Step 6: If any issues arise with node-pg-migrate**
    The db:migrate script uses `tsx node_modules/.bin/node-pg-migrate up`. In a workspace setup, the binary might be in the root node_modules/.bin/ or backend/node_modules/.bin/. If the script fails, update backend/package.json db:migrate to use `npx node-pg-migrate up` instead, which resolves binaries correctly in workspaces.

    Similarly for db:codegen, change to `npx kysely-codegen` if the direct path doesn't work.
  </action>
  <verify>
    1. `npm ls --workspaces` shows both backend and frontend workspaces
    2. `cd backend && npx tsc --noEmit` exits 0 (no compilation errors)
    3. `npm run test --workspace=backend` - all tests pass
    4. `npm run build --workspace=frontend` - frontend builds successfully
    5. No TypeScript errors related to missing modules or incorrect paths
  </verify>
  <done>
    npm workspaces are configured and functional. Backend compiles, tests pass, frontend builds. The monorepo reorganization is complete and all code paths are verified working.
  </done>
</task>

</tasks>

<verification>
1. Directory structure matches target: backend/ and frontend/ are peer directories under root
2. No backend source code remains at root level (no src/, no migrations/, no tsconfig.json)
3. Root package.json is a slim workspace orchestrator with convenience scripts
4. Backend has its own package.json with all dependencies and scripts
5. TypeScript compilation succeeds from backend/
6. All tests pass
7. Frontend build succeeds
8. Git history preserved for moved files (via git mv)
</verification>

<success_criteria>
- `ls -d backend/src frontend/src` both exist
- `ls src/ 2>/dev/null` returns error (no root src/)
- `cat package.json | grep workspaces` shows workspace config
- `cd backend && npx tsc --noEmit` exits 0
- `npm run test --workspace=backend` passes all tests
- `npm run build --workspace=frontend` succeeds
- All import paths within backend/src/ resolve correctly (no changes needed since relative paths moved with the tree)
</success_criteria>

<output>
After completion, create `.planning/quick/001-reorganize-monorepo-move-src-to-backend/001-SUMMARY.md`
</output>
