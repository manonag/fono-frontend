import { Header } from '@/components/header'
import { FonoLogo } from '@/components/logo'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header variant="signup" />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <FonoLogo size={48} textColor="#E0602A" circleColor="#E0602A" pulseColor="#E0602A" />
          <p className="text-brown text-lg">Login coming in Sprint 3</p>
        </div>
      </main>
    </div>
  )
}
