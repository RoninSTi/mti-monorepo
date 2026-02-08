import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <p className="text-xl text-muted-foreground">Page Not Found</p>
        <Button asChild>
          <Link to="/factories">Back to Factories</Link>
        </Button>
      </div>
    </div>
  )
}
