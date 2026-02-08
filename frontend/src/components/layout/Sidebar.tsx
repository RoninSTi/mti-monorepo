import { NavLink } from 'react-router-dom'
import { Factory, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-background">
      <div className="flex flex-col h-full">
        {/* App branding */}
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-foreground">MTI WiFi</h1>
          <p className="text-sm text-muted-foreground">Monitor</p>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 p-4">
          <NavLink
            to="/factories"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
              )
            }
          >
            <Factory className="h-5 w-5" />
            <span>Factories</span>
          </NavLink>
          <NavLink
            to="/gateways"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
              )
            }
          >
            <Radio className="h-5 w-5" />
            <span>Gateways</span>
          </NavLink>
        </nav>
      </div>
    </aside>
  )
}
