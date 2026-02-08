# Roadmap: Factory Vibration Monitoring Application

## Milestones

- ✅ **v1.0 Database + API Layer** - Phases 7-11 (shipped 2026-02-08)
- 🚧 **v1.1 Factory & Gateway Management UI** - Phases 12-17 (in progress)

## Phases

<details>
<summary>✅ v1.0 Database + API Layer (Phases 7-11) - SHIPPED 2026-02-08</summary>

Delivered production-ready persistence and REST API for managing factories and gateways with encrypted credential storage.

### Phase 7: Database Schema
**Goal**: Production-ready PostgreSQL schema
**Plans**: 1 plan

Plans:
- [x] 07-01: Database schema and migrations

### Phase 8: Repository Layer
**Goal**: Type-safe data access with Kysely
**Plans**: 2 plans

Plans:
- [x] 08-01: Repository interfaces and base implementation
- [x] 08-02: Encryption service for gateway credentials

### Phase 9: API Framework
**Goal**: Fastify server with validation and security
**Plans**: 1 plan

Plans:
- [x] 09-01: Fastify setup with middleware and error handling

### Phase 10: Factory API
**Goal**: Complete factory CRUD operations
**Plans**: 2 plans

Plans:
- [x] 10-01: Factory routes and validation
- [x] 10-02: Factory pagination and filtering

### Phase 11: Gateway API
**Goal**: Complete gateway CRUD operations with encryption
**Plans**: 2 plans

Plans:
- [x] 11-01: Gateway routes with credential encryption
- [x] 11-02: Gateway CRUD routes and factory filtering

</details>

### 🚧 v1.1 Factory & Gateway Management UI (In Progress)

**Milestone Goal:** Build configuration interface for vibration analysts to manage factories and gateways through a web application

#### Phase 12: Frontend Foundation
**Goal**: React + Vite application with complete tooling infrastructure
**Depends on**: Nothing (new frontend milestone)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06, SETUP-07
**Success Criteria** (what must be TRUE):
  1. Developer can run `npm install && npm run dev` and see React app at localhost:5173
  2. Tailwind CSS classes render styled components correctly
  3. shadcn/ui Button component can be imported and rendered
  4. React Query DevTools show in browser for debugging API calls
  5. API client successfully fetches data from backend at http://localhost:3000
**Plans**: 3 plans

Plans:
- [x] 12-01-PLAN.md -- Scaffold Vite + React + TypeScript project with Tailwind CSS v4
- [x] 12-02-PLAN.md -- Initialize shadcn/ui components and CSS variable theming
- [x] 12-03-PLAN.md -- Configure React Query, API client, TypeScript types, and React Hook Form

#### Phase 13: Component Architecture
**Goal**: Reusable component library and navigation layout
**Depends on**: Phase 12
**Requirements**: NAV-01, NAV-02, NAV-03, COMP-01, COMP-02, COMP-03, COMP-04, COMP-05
**Success Criteria** (what must be TRUE):
  1. Side navigation displays Factories and Gateways links with active state highlighting
  2. Clicking navigation link changes page content while preserving layout
  3. UI components (Button, Input, Card, Table, Modal) exist with consistent styling
  4. Developer can import shared components with full TypeScript autocomplete
  5. All components follow consistent Tailwind class patterns
**Plans**: 3 plans

Plans:
- [x] 13-01-PLAN.md -- Install dependencies and add shadcn/ui component library (Input, Card, Table, Dialog, Label, Badge)
- [x] 13-02-PLAN.md -- Configure React Router, build AppLayout with Sidebar navigation and placeholder pages
- [x] 13-03-PLAN.md -- Create reusable FactoryForm and GatewayForm components with Zod validation

#### Phase 14: API Integration Layer
**Goal**: Type-safe React Query hooks connecting frontend to backend API
**Depends on**: Phase 13
**Requirements**: API-INT-01, API-INT-02, API-INT-03, API-INT-04, API-INT-05
**Success Criteria** (what must be TRUE):
  1. useFactories() hook fetches factory list with loading/error states
  2. useCreateFactory() mutation creates factory and automatically refetches list
  3. TypeScript interfaces for Factory and Gateway match backend response types exactly
  4. API errors display user-friendly messages (not raw error objects)
  5. Optimistic updates show immediate UI feedback before server confirmation
**Plans**: 2 plans

Plans:
- [ ] 14-01-PLAN.md -- Factory CRUD hooks with query key factory and global error handling
- [ ] 14-02-PLAN.md -- Gateway CRUD hooks with query key factory and factory filtering

#### Phase 15: Factory Management UI
**Goal**: Complete factory CRUD interface with validation and user feedback
**Depends on**: Phase 14
**Requirements**: FACTORY-UI-01, FACTORY-UI-02, FACTORY-UI-03, FACTORY-UI-04, FACTORY-UI-05, FACTORY-UI-06
**Success Criteria** (what must be TRUE):
  1. User can view list of all factories with name, location, timezone, and creation date
  2. User can create new factory through form with inline validation errors
  3. User can edit existing factory with form pre-populated with current values
  4. User can delete factory after confirming in modal dialog
  5. All operations show success/error notifications and loading spinners during requests
**Plans**: TBD

Plans:
- [ ] TBD (planning in progress)

#### Phase 16: Gateway Management UI
**Goal**: Complete gateway CRUD interface with factory filtering and secure password handling
**Depends on**: Phase 15
**Requirements**: GATEWAY-UI-01, GATEWAY-UI-02, GATEWAY-UI-03, GATEWAY-UI-04, GATEWAY-UI-05, GATEWAY-UI-06, GATEWAY-UI-07
**Success Criteria** (what must be TRUE):
  1. User can view list of all gateways with factory name, gateway ID, URL, and connection details
  2. User can filter gateway list by factory using dropdown selector
  3. User can create new gateway through form with factory select, gateway ID, URL, email, password, model, firmware
  4. User can edit gateway details and optionally change password (password field blank by default, only updates if filled)
  5. User can delete gateway after confirming in modal dialog
  6. All operations show success/error notifications and loading spinners during requests
**Plans**: TBD

Plans:
- [ ] TBD (planning in progress)

#### Phase 17: Quality & Polish
**Goal**: Production-ready code with validation, responsive design, and documentation
**Depends on**: Phase 16
**Requirements**: QUAL-UI-01, QUAL-UI-02, QUAL-UI-03, QUAL-UI-04, QUAL-UI-05
**Success Criteria** (what must be TRUE):
  1. TypeScript strict mode enabled with zero errors
  2. All forms validate inputs with clear error messages before submission
  3. Application works on desktop (1920x1080) and tablet (768x1024) without horizontal scroll
  4. Developer can read README and set up frontend in under 5 minutes
  5. Component patterns are consistent across all pages (same hook usage, composition style)
**Plans**: TBD

Plans:
- [ ] TBD (planning in progress)

## Progress

**Execution Order:**
Phases execute in numeric order: 12 → 13 → 14 → 15 → 16 → 17

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 7. Database Schema | v1.0 | 1/1 | Complete | 2026-02-07 |
| 8. Repository Layer | v1.0 | 2/2 | Complete | 2026-02-07 |
| 9. API Framework | v1.0 | 1/1 | Complete | 2026-02-08 |
| 10. Factory API | v1.0 | 2/2 | Complete | 2026-02-08 |
| 11. Gateway API | v1.0 | 2/2 | Complete | 2026-02-08 |
| 12. Frontend Foundation | v1.1 | 3/3 | Complete | 2026-02-08 |
| 13. Component Architecture | v1.1 | 3/3 | Complete | 2026-02-08 |
| 14. API Integration Layer | v1.1 | 0/? | Not started | - |
| 15. Factory Management UI | v1.1 | 0/? | Not started | - |
| 16. Gateway Management UI | v1.1 | 0/? | Not started | - |
| 17. Quality & Polish | v1.1 | 0/? | Not started | - |

---
*Last updated: 2026-02-08*
