import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Nunito } from 'next/font/google'
import { Providers } from './providers'
import { RestaurantProvider } from '@/lib/restaurant-context'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fono — Never Miss a Call',
  description: 'AI voice assistant for restaurant phone calls. Never miss a reservation again.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${nunito.variable}`}>
      <body className="font-sans bg-cream text-ink antialiased">
        <Providers>
          <RestaurantProvider>{children}</RestaurantProvider>
        </Providers>
      </body>
    </html>
  )
}
