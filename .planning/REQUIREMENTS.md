# Requirements: Milestone v1.1 Factory & Gateway Management UI

**Defined:** 2026-02-08
**Core Value:** Build a reliable foundation for multi-gateway factory monitoring: persistent data model, REST API, and connection orchestration

## v1.1 Requirements

Requirements for Milestone v1.1: Factory & Gateway Management UI (Web Application). Provides vibration analysts with interface to configure factories and gateways.

### Project Setup & Foundation

- [ ] **SETUP-01**: React + Vite application builds and runs with TypeScript
- [ ] **SETUP-02**: Tailwind CSS configured and working
- [ ] **SETUP-03**: shadcn/ui components installed and accessible
- [ ] **SETUP-04**: React Query configured for API state management
- [ ] **SETUP-05**: React Hook Form installed for form handling
- [ ] **SETUP-06**: API client configured to connect to Fastify backend (http://localhost:3000)
- [ ] **SETUP-07**: Theming infrastructure with CSS variables for colors (supports future theme switching)

### Layout & Navigation

- [ ] **NAV-01**: Side navigation component with Factories and Gateways links
- [ ] **NAV-02**: Page layout component with consistent header and content area
- [ ] **NAV-03**: Routing configured with React Router (or similar)

### Component Architecture

- [ ] **COMP-01**: Shared UI component library (Button, Input, Card, Table, Modal, etc.)
- [ ] **COMP-02**: Reusable form components (FactoryForm, GatewayForm)
- [ ] **COMP-03**: Components organized in logical directories (ui/, forms/, layout/)
- [ ] **COMP-04**: Components use TypeScript with proper prop types
- [ ] **COMP-05**: Consistent styling patterns using Tailwind classes

### Factory Management UI

- [ ] **FACTORY-UI-01**: Factory list page shows all factories with pagination
- [ ] **FACTORY-UI-02**: Create factory form with validation (name, location, timezone)
- [ ] **FACTORY-UI-03**: Edit factory form (pre-populated with current values)
- [ ] **FACTORY-UI-04**: Delete factory with confirmation modal
- [ ] **FACTORY-UI-05**: Success/error notifications for all factory operations
- [ ] **FACTORY-UI-06**: Loading states while fetching/submitting data

### Gateway Management UI

- [ ] **GATEWAY-UI-01**: Gateway list page shows all gateways with factory information
- [ ] **GATEWAY-UI-02**: Filter gateways by factory
- [ ] **GATEWAY-UI-03**: Create gateway form with validation (factory select, gateway ID, URL, email, password, model, firmware)
- [ ] **GATEWAY-UI-04**: Edit gateway form (update connection details, optionally change password)
- [ ] **GATEWAY-UI-05**: Delete gateway with confirmation modal
- [ ] **GATEWAY-UI-06**: Success/error notifications for all gateway operations
- [ ] **GATEWAY-UI-07**: Loading states while fetching/submitting data

### API Integration

- [ ] **API-INT-01**: React Query hooks for factory CRUD operations (useFactories, useCreateFactory, etc.)
- [ ] **API-INT-02**: React Query hooks for gateway CRUD operations (useGateways, useCreateGateway, etc.)
- [ ] **API-INT-03**: TypeScript types shared between frontend and backend (Factory, Gateway interfaces)
- [ ] **API-INT-04**: Error handling for API failures with user-friendly messages
- [ ] **API-INT-05**: Optimistic updates for better UX

### Code Quality

- [ ] **QUAL-UI-01**: TypeScript strict mode enabled for frontend
- [ ] **QUAL-UI-02**: Consistent component patterns (hooks, composition)
- [ ] **QUAL-UI-03**: Form validation with clear error messages
- [ ] **QUAL-UI-04**: Responsive design (works on desktop and tablet)
- [ ] **QUAL-UI-05**: README documents frontend setup and development workflow

## Future Requirements

Deferred to later milestones.

### Real-Time Features

- **RT-01**: Gateway connection status updates in real-time (online/offline)
- **RT-02**: WebSocket connection for live status updates
- **RT-03**: Auto-refresh gateway list when status changes

### Gateway Orchestration Integration

- **ORCH-UI-01**: Connect/disconnect buttons for individual gateways
- **ORCH-UI-02**: Bulk connect/disconnect operations
- **ORCH-UI-03**: Connection health indicators (latency, uptime)

### Sensor Management

- **SENSOR-UI-01**: Sensor list view with assignment status
- **SENSOR-UI-02**: Assign sensors to equipment
- **SENSOR-UI-03**: Configure sensor acquisition schedules

### Alarm Monitoring

- **ALARM-UI-01**: Dashboard landing page with active alarms
- **ALARM-UI-02**: Alarm list with filtering and sorting
- **ALARM-UI-03**: Alarm acknowledgment workflow
- **ALARM-UI-04**: Waveform visualization for alarm events

## Out of Scope

Explicitly excluded from v1.1:

| Feature | Reason |
|---------|--------|
| User authentication/login | Future security milestone - focus on configuration UI first |
| Real-time gateway status | Needs gateway orchestration layer (WebSocket connections) |
| Alarm monitoring dashboard | Needs sensor data APIs and waveform persistence |
| Sensor assignment to equipment | Needs gateway orchestration working first |
| Mobile responsive (phone-sized) | Tablet/desktop sufficient for analysts, mobile not priority |
| Dark mode toggle | Theming infrastructure in place, but toggle UI deferred |
| Data visualization/charts | No sensor data to visualize yet |
| Audit logs UI | Database supports it, but UI deferred |
| Multi-tenant organization switching | Single org sufficient for v1.1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (To be filled by roadmapper) | | |

**Coverage:**
- v1.1 requirements: 36 total
- Mapped to phases: (pending)
- Unmapped: (pending)

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-08 after v1.1 milestone initialization*
