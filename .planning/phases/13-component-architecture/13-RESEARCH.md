# Phase 13: Component Architecture - Research

**Researched:** 2026-02-08
**Domain:** React component architecture, UI libraries, navigation patterns
**Confidence:** HIGH

## Summary

Phase 13 establishes a reusable component library and navigation layout using shadcn/ui, React Router v6, and React Hook Form. The research confirms that the project's prior decisions (shadcn/ui, React Hook Form, React Router) align with 2026 best practices and provide a solid foundation for building type-safe, accessible, and maintainable UI components.

shadcn/ui's copy-paste model gives full control over components while maintaining consistency through Radix UI primitives and CVA for variant management. React Router v6's nested routes with Outlet enable persistent layouts across pages. React Hook Form provides TypeScript-first form handling with minimal re-renders.

The key insight is that component architecture should follow feature-based organization (ui/, forms/, layout/) with clear separation between raw shadcn components, lightly modified primitives, and product-level compositions. This structure keeps upgrades safe and prevents the codebase from becoming a maintenance burden.

**Primary recommendation:** Organize components into ui/ (shadcn components), forms/ (reusable form components), and layout/ (navigation and page layouts). Use CVA for variant-based styling, maintain TypeScript strict mode for all components, and document component APIs in a central location since shadcn components become your responsibility once copied.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui | Latest (2026) | UI component library | Copy-paste model, full control, Radix UI primitives, AI-friendly code, TypeScript-first |
| React Router | v6.x | Client-side routing | Industry standard, nested routes, Outlet pattern, excellent TypeScript support |
| React Hook Form | v7.x | Form state management | TypeScript-first, minimal re-renders, excellent validation, pairs well with shadcn forms |
| CVA (Class Variance Authority) | v0.7.1+ | Variant-based styling | Type-safe variants, reduces bundle size, essential for reusable components |
| Radix UI | v1.x | Accessible primitives | WAI-ARIA compliant, keyboard navigation, focus management (shadcn foundation) |
| Tailwind CSS | v4.x | Utility-first CSS | Already in project (Phase 12), v4 with Vite plugin, CSS variables for theming |
| clsx + tailwind-merge | Latest | Class management | Conditional classes + merge Tailwind conflicts, standard shadcn utilities |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | Latest | Icon library | Included with shadcn, tree-shakeable, consistent with component library |
| Zod | v3.x | Schema validation | Integrate with React Hook Form for type-safe form validation |
| @tanstack/react-query | v5.x | Already in project (Phase 12) for data fetching, pairs well with forms |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Router v6 | TanStack Router | TanStack Router offers superior type safety and state-first routing, but React Router v6 is battle-tested, simpler for SPAs, and sufficient for this project's needs. v7 closes the gap further but is framework-mode focused. |
| shadcn/ui | MUI, Ant Design, Chakra UI | Traditional libraries have automatic updates but less customization. shadcn gives full control but YOU own maintenance. For this project, control > convenience. |
| React Hook Form | Formik, Final Form | React Hook Form has better TypeScript support, fewer re-renders, and better DX in 2026. Formik is older but stable. |

**Installation:**

Frontend dependencies already installed (Phase 12):
```bash
# Already installed:
# react-hook-form, class-variance-authority, clsx, tailwind-merge
# @radix-ui/react-slot, radix-ui, lucide-react

# For navigation (if not already installed):
npm install react-router-dom

# For form validation integration:
npm install zod @hookform/resolvers
```

shadcn components are added via CLI (not npm):
```bash
# In frontend directory:
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add table
npx shadcn@latest add dialog  # Modal component
npx shadcn@latest add form     # Form components with React Hook Form integration
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── components/
│   ├── ui/              # Raw shadcn components (button, input, card, table, dialog)
│   ├── forms/           # Reusable form components (FactoryForm, GatewayForm)
│   └── layout/          # Navigation and page layout (AppLayout, Sidebar, Header)
├── pages/               # Page components (FactoriesPage, GatewaysPage)
├── hooks/               # Custom React hooks (if reusable across features)
├── lib/                 # Utilities (utils.ts, api.ts, query-client.ts)
└── types/               # TypeScript types (api.ts)
```

**Rationale:**
- **ui/**: Contains unmodified or lightly modified shadcn components. Keeps upgrades safe.
- **forms/**: Feature-specific form components that compose ui/ components with React Hook Form.
- **layout/**: Navigation and page structure components that use React Router Outlet.
- **pages/**: Top-level route components that compose layout + content.
- **Separation principle**: Files that change together stay close together (colocation).

### Pattern 1: Nested Routes with Persistent Layout
**What:** Use React Router's nested routes to render a persistent layout (sidebar, header) while changing page content.

**When to use:** Any multi-page app with shared navigation (this project: Factories and Gateways pages).

**Example:**
```typescript
// Source: https://reactrouter.com/en/main/start/overview
import { createBrowserRouter, Outlet } from 'react-router-dom';

// Root layout with persistent sidebar
function AppLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1">
        <Outlet /> {/* Child routes render here */}
      </main>
    </div>
  );
}

// Router configuration
const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: 'factories', element: <FactoriesPage /> },
      { path: 'gateways', element: <GatewaysPage /> },
    ]
  }
]);
```

### Pattern 2: Variant-Based Component Styling with CVA
**What:** Define component variants (size, color, state) using CVA for type-safe, consistent styling.

**When to use:** Any reusable component with multiple visual states (buttons, inputs, cards).

**Example:**
```typescript
// Source: https://cva.style/docs
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
```

### Pattern 3: TypeScript-First Form Components with React Hook Form
**What:** Create typed form components that integrate React Hook Form with shadcn UI components.

**When to use:** All forms (FactoryForm, GatewayForm).

**Example:**
```typescript
// Source: https://react-hook-form.com/get-started
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define schema with Zod
const factorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.string().min(1, 'Location is required'),
});

type FactoryFormData = z.infer<typeof factorySchema>;

function FactoryForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FactoryFormData>({
    resolver: zodResolver(factorySchema),
  });

  const onSubmit = (data: FactoryFormData) => {
    // API call here
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

### Pattern 4: Active Navigation Links
**What:** Use NavLink from React Router to highlight the current page in navigation.

**When to use:** Side navigation component (Sidebar).

**Example:**
```typescript
// Source: https://reactrouter.com/en/main/start/overview
import { NavLink } from 'react-router-dom';

function Sidebar() {
  return (
    <nav>
      <NavLink
        to="/factories"
        className={({ isActive }) =>
          isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
        }
      >
        Factories
      </NavLink>
      <NavLink
        to="/gateways"
        className={({ isActive }) =>
          isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
        }
      >
        Gateways
      </NavLink>
    </nav>
  );
}
```

### Anti-Patterns to Avoid

- **Modifying shadcn components in place**: Create a primitives/ folder for modified versions to preserve upgrade path.
- **Hardcoding Tailwind values everywhere**: Use CSS variables (--primary, --background) for theming.
- **Forgetting Outlet in parent routes**: Child routes won't render without `<Outlet />`.
- **Removing asChild from Radix components**: Breaks composition and accessibility.
- **Wrapping interactive elements inside buttons**: Causes keyboard navigation issues.
- **Overriding focus styles without testing**: Always re-test keyboard and screen reader behavior.
- **Nesting Routes inside RouterProvider**: Use a single BrowserRouter at the root.
- **Missing catch-all route**: Add `{ path: '*', element: <NotFound /> }` for 404s.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | React Hook Form + Zod | Handles edge cases: nested objects, arrays, async validation, field dependencies |
| Component variants | Manual className switching | CVA (Class Variance Authority) | Type-safe variants, automatic merging, compound variants |
| Class merging | Custom className concatenation | clsx + tailwind-merge | Handles Tailwind conflicts (e.g., `px-4` overrides `px-2`) |
| Accessible UI components | Custom modals, dropdowns | Radix UI (via shadcn) | WAI-ARIA compliant, keyboard navigation, focus management, screen reader tested |
| Active link styling | Custom location checking | React Router NavLink | Automatic isActive prop, handles nested routes |
| Form field registration | Manual state + onChange | React Hook Form register | Minimal re-renders, automatic validation, TypeScript inference |

**Key insight:** UI accessibility is complex. Radix UI (shadcn foundation) handles ARIA attributes, focus trapping, keyboard navigation, and screen reader compatibility. Custom implementations almost always miss edge cases.

## Common Pitfalls

### Pitfall 1: Component Ownership Confusion
**What goes wrong:** After copying a shadcn component, developers forget they now OWN that code. Bugs won't be fixed with `npm update`.

**Why it happens:** Traditional component libraries auto-update. shadcn's copy-paste model requires manual maintenance.

**How to avoid:**
- Organize components into ui/ (raw shadcn), primitives/ (modified), blocks/ (composed).
- Document modifications in comments or a COMPONENTS.md file.
- Track shadcn releases manually if you want upstream fixes.

**Warning signs:** Component has a bug, developer expects `npm update` to fix it.

### Pitfall 2: Missing Outlet in Layout
**What goes wrong:** Nested routes don't render. Page stays blank when clicking navigation links.

**Why it happens:** Developers forget `<Outlet />` is where child routes render in React Router v6.

**How to avoid:**
- Always include `<Outlet />` in parent route components (e.g., AppLayout).
- Test navigation immediately after adding layout.

**Warning signs:** URL changes but page content doesn't.

### Pitfall 3: Hardcoded Tailwind Classes Without Theming
**What goes wrong:** Color changes require find-and-replace across 50+ files.

**Why it happens:** Developers hardcode `bg-blue-500` instead of `bg-primary`.

**How to avoid:**
- Use CSS variables (--primary, --background, --foreground) from shadcn theme.
- Define design tokens once in index.css or tailwind.config.
- Use semantic class names (bg-primary, not bg-blue-500).

**Warning signs:** Multiple hardcoded color values scattered across components.

### Pitfall 4: Breaking Accessibility by Removing asChild
**What goes wrong:** Keyboard navigation breaks, screen readers announce incorrect semantics.

**Why it happens:** Developers remove `asChild` from Radix components to simplify code without understanding its purpose.

**How to avoid:**
- Keep `asChild` when composing Radix primitives (e.g., Button as Link).
- Re-test keyboard and screen reader after any component modification.

**Warning signs:** Tab key doesn't focus elements, screen reader announces wrong role.

### Pitfall 5: Form Re-Render Performance
**What goes wrong:** Form input becomes laggy, entire form re-renders on every keystroke.

**Why it happens:** Developers use controlled components (value + onChange) instead of React Hook Form's register.

**How to avoid:**
- Use `register` for most inputs (uncontrolled, minimal re-renders).
- Use `Controller` only for external UI libraries that require controlled components.
- Avoid `watch()` unless necessary (causes re-renders).

**Warning signs:** Input feels slow, React DevTools shows many re-renders per keystroke.

### Pitfall 6: Catch-All Route Interference
**What goes wrong:** 404 route catches all routes, preventing nested routes from working.

**Why it happens:** Catch-all route (`{ path: '*' }`) placed before other routes.

**How to avoid:**
- Place catch-all route LAST in route configuration.
- Use React Router's route ranking (more specific routes win automatically).

**Warning signs:** All routes show 404 page.

## Code Examples

Verified patterns from official sources:

### Sidebar Navigation with Active States
```typescript
// Source: https://reactrouter.com/en/main/start/overview
// frontend/src/components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-background">
      <nav className="flex flex-col gap-2 p-4">
        <NavLink
          to="/factories"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50'
            )
          }
        >
          Factories
        </NavLink>
        <NavLink
          to="/gateways"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50'
            )
          }
        >
          Gateways
        </NavLink>
      </nav>
    </aside>
  );
}
```

### App Layout with Outlet
```typescript
// Source: https://reactrouter.com/en/main/start/overview
// frontend/src/components/layout/AppLayout.tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container p-6">
          <Outlet /> {/* Child routes render here */}
        </div>
      </main>
    </div>
  );
}
```

### Router Configuration
```typescript
// Source: https://reactrouter.com/en/main/start/overview
// frontend/src/main.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { FactoriesPage } from '@/pages/FactoriesPage';
import { GatewaysPage } from '@/pages/GatewaysPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/factories" replace /> },
      { path: 'factories', element: <FactoriesPage /> },
      { path: 'gateways', element: <GatewaysPage /> },
      { path: '*', element: <NotFoundPage /> }, // Catch-all LAST
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}
```

### TypeScript Form with React Hook Form + Zod
```typescript
// Source: https://react-hook-form.com/get-started + shadcn form docs
// frontend/src/components/forms/FactoryForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const factorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.string().min(1, 'Location is required'),
});

type FactoryFormData = z.infer<typeof factorySchema>;

interface FactoryFormProps {
  defaultValues?: Partial<FactoryFormData>;
  onSubmit: (data: FactoryFormData) => Promise<void>;
}

export function FactoryForm({ defaultValues, onSubmit }: FactoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FactoryFormData>({
    resolver: zodResolver(factorySchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <Input id="name" {...register('name')} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="location" className="text-sm font-medium">
          Location
        </label>
        <Input id="location" {...register('location')} />
        {errors.location && (
          <p className="text-sm text-destructive">{errors.location.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
```

### CVA Button Component
```typescript
// Source: https://cva.style/docs
// frontend/src/components/ui/button.tsx (shadcn default)
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Component libraries as npm packages (MUI, Ant Design) | Copy-paste components (shadcn/ui) | 2022-2023 | Full control, no version conflicts, but YOU own maintenance |
| React Router v5 (Switch, component prop) | React Router v6 (Routes, element prop, nested routes) | 2021 | Simpler API, nested routes, data loading (v6.4+) |
| Formik for forms | React Hook Form | 2020-2021 | Better TypeScript support, fewer re-renders, better DX |
| Styled Components, Emotion | Tailwind CSS with CVA | 2020-2023 | Utility-first CSS, smaller bundles, no runtime CSS-in-JS |
| CSS Modules for component variants | CVA (Class Variance Authority) | 2022-2023 | Type-safe variants, better DX, works with Tailwind |
| Manual accessibility | Radix UI primitives | 2021-2022 | WAI-ARIA compliant out of the box, keyboard navigation, focus management |
| React Router v6 library mode | React Router v7 framework mode | 2024-2025 | Enhanced type safety in framework mode, but library mode (SPA) still solid for simple apps |

**Deprecated/outdated:**
- React Router v5 syntax (Switch, component prop): Use v6 Routes, element prop.
- CSS-in-JS libraries without zero-runtime (Styled Components, Emotion): Tailwind + CVA is the 2026 standard.
- Formik: React Hook Form has better TypeScript and performance.
- Hand-rolled modal/dropdown components: Use Radix UI (via shadcn) for accessibility.

## Open Questions

Things that couldn't be fully resolved:

1. **React Router v7 vs v6 for this project**
   - What we know: v7 offers better type safety in framework mode but is less relevant for SPAs in library mode.
   - What's unclear: Whether v7 provides significant advantages for this project's simple SPA use case.
   - Recommendation: Stick with v6 for now. It's battle-tested, sufficient for this project, and widely documented. Upgrade to v7 later if needed.

2. **Component documentation strategy**
   - What we know: shadcn components become YOUR responsibility once copied. Documentation is mandatory.
   - What's unclear: Best format for documenting component APIs (Storybook, README, JSDoc comments).
   - Recommendation: Start with JSDoc comments in component files. Add Storybook later if component library grows significantly.

3. **Form validation error display patterns**
   - What we know: React Hook Form provides errors object. shadcn Form component has built-in error display.
   - What's unclear: Consistent pattern for showing form-level vs field-level errors.
   - Recommendation: Use shadcn Form component (includes FormField, FormItem, FormLabel, FormMessage) for consistency. Test with backend API errors to ensure they display correctly.

## Sources

### Primary (HIGH confidence)
- shadcn/ui docs: https://ui.shadcn.com/docs (official setup, component patterns)
- React Router v6 docs: https://reactrouter.com/en/main/start/overview (nested routes, Outlet, navigation)
- React Hook Form docs: https://react-hook-form.com/get-started (TypeScript setup, validation)
- CVA docs: https://cva.style/docs (variant patterns, TypeScript)
- Radix UI accessibility docs: https://www.radix-ui.com/primitives/docs/overview/accessibility (WAI-ARIA compliance)

### Secondary (MEDIUM confidence)
- Medium: [Shadcn UI Best Practices for 2026](https://medium.com/write-a-catalyst/shadcn-ui-best-practices-for-2026-444efd204f44) (component organization, design tokens)
- Leonardo Montini: [What I DON'T like about shadcn/ui](https://leonardomontini.dev/shadcn-ui-use-with-caution/) (maintenance pitfalls)
- FrontendTools: [Tailwind CSS Best Practices 2025-2026](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns) (design tokens, organization)
- Medium: [React Router Common mistakes](https://medium.com/@rowsana/react-router-common-mistakes-and-how-to-avoid-them-bc110a6dedfe) (Outlet issues, catch-all routes)
- Robin Wieruch: [React Folder Structure in 5 Steps](https://www.robinwieruch.de/react-folder-structure/) (feature-based organization)

### Tertiary (LOW confidence)
- WebSearch results: TanStack Router vs React Router (2026 comparison, validated TanStack Router has better type safety but React Router v6 is sufficient for this project)
- WebSearch results: CVA usage patterns (validated with official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified with official docs and Context7, widely used in 2026
- Architecture: HIGH - Patterns verified with official React Router and shadcn docs, proven in production
- Pitfalls: HIGH - Cross-referenced multiple sources (official docs, community articles, GitHub issues)
- Code examples: HIGH - All examples sourced from official documentation

**Research date:** 2026-02-08
**Valid until:** 2026-04-08 (60 days - stable ecosystem, slow-moving changes for React Router, shadcn, React Hook Form)
