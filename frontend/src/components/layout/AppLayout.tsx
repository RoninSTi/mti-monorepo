import { Outlet, NavLink } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { cn } from '@/lib/utils'

export function AppLayout() {
  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Mobile header - visible below md breakpoint */}
      <div className="md:hidden flex items-center justify-between border-b px-4 h-14">
        <h1 className="text-lg font-bold">MTI WiFi</h1>
        <nav className="flex items-center gap-4">
          <NavLink
            to="/factories"
            className={({ isActive }) =>
              cn(
                'text-sm',
                isActive
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground'
              )
            }
          >
            Factories
          </NavLink>
          <NavLink
            to="/gateways"
            className={({ isActive }) =>
              cn(
                'text-sm',
                isActive
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground'
              )
            }
          >
            Gateways
          </NavLink>
        </nav>
      </div>

      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
