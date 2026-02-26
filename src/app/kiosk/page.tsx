import { Header } from '@/components/header'
import { FonoLogo } from '@/components/logo'

export default function KioskPage() {
  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <Header variant="kiosk" restaurantName="Spice Garden" />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <FonoLogo size={48} textColor="#FDF0E8" circleColor="#E0602A" pulseColor="#E0602A" />
          <p className="text-cream/60 text-lg">Kiosk mode coming in Sprint 2</p>
        </div>
      </main>
    </div>
  )
}
