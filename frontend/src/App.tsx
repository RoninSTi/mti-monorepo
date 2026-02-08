import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-foreground">
          MTI WiFi Monitor
        </h1>
        <p className="text-muted-foreground">
          Factory & Gateway Management
        </p>
        <div className="flex gap-3 justify-center">
          <Button>Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </div>
    </div>
  )
}

export default App
