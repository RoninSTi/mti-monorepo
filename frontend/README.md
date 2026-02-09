# MTI WiFi Monitor - Frontend

React + TypeScript application for managing factory and gateway configurations.

## Prerequisites

- Node.js 20+ (check: `node --version`)
- npm 10+ (check: `npm --version`)
- Backend API running at http://localhost:3000 (Vite proxy forwards /api requests)
- PostgreSQL database (required by backend)

## Quick Start

1. Navigate to frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Open http://localhost:5173

Note: The Vite dev server proxies `/api` requests to `http://localhost:3000`. No `.env` configuration needed for local development.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR at http://localhost:5173 |
| `npm run build` | TypeScript check + production build (outputs to `dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on all TypeScript files |
| `npm run type-check` | Run TypeScript compiler check (no emit) |

## Project Structure

```
src/
├── components/         # UI components
│   ├── forms/         # Form components with Zod validation
│   ├── layout/        # App shell (AppLayout, Sidebar)
│   └── ui/            # shadcn/ui primitives (Button, Input, Dialog, etc.)
├── hooks/             # React Query hooks for API integration
├── lib/               # Utilities (API client, cn helper, query client)
├── pages/             # Route page components
├── types/             # TypeScript type definitions (mirrors backend schemas)
├── main.tsx           # App entry with routing, React Query, and toast setup
└── index.css          # Tailwind CSS imports and theme variables
```

## Key Patterns

- **Data Fetching**: React Query hooks in `src/hooks/` (e.g., `useFactories()`, `useGateways()`). 5-minute stale time, single retry, no refetch on window focus.
- **Forms**: React Hook Form + Zod validation in `src/components/forms/`. Each form exports its Zod schema and inferred TypeScript type. Error messages display below each field.
- **State Management**: React Query for all server state. React useState only for UI state (dialog open/close, selected items).
- **Notifications**: Sonner toast for success/error feedback on all CRUD operations.
- **Styling**: Tailwind CSS v4 with mobile-first responsive design. CSS variables defined in `index.css`. shadcn/ui components for consistent design.
- **Routing**: React Router v7 with createBrowserRouter. AppLayout wraps all routes. Root `/` redirects to `/factories`.
- **API Client**: Custom fetch wrapper in `src/lib/api.ts`. Handles JSON parsing, error extraction, 204 No Content responses.

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2 | UI framework |
| TypeScript | 5.9 | Type safety (strict mode) |
| Vite | 7.2 | Build tool and dev server |
| Tailwind CSS | 4.1 | Utility-first CSS |
| React Query | 5.90 | Server state management |
| React Hook Form | 7.71 | Form handling |
| Zod | 4.3 | Schema validation |
| shadcn/ui | - | Component primitives |
| React Router | 7.13 | Client-side routing |
| Sonner | 2.0 | Toast notifications |

## Development Workflow

1. Start the backend API server (required for development)
2. Run `npm run dev` to start the frontend with hot module replacement
3. Make changes to components, hooks, or pages
4. Save files - Vite automatically reloads the browser
5. Before committing, run `npm run type-check` and `npm run lint`

## Troubleshooting

- **Port 5173 in use**: `npm run dev -- --port 5174`
- **API connection errors**: Verify backend running at http://localhost:3000. Check Vite proxy config in `vite.config.ts`.
- **TypeScript errors**: Run `npm run type-check` to see all errors with file locations.
- **ESLint errors**: Run `npm run lint` to check code quality.
- **Form validation not working**: Ensure Zod schema matches form structure. Check browser console for validation errors.
- **React Query not updating**: Check query keys match between hooks. Use React Query DevTools to inspect cache state.
