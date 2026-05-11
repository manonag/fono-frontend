import type { Metadata } from 'next'
import {
  Plus_Jakarta_Sans,
  Nunito,
  Noto_Sans_Devanagari,
  Noto_Sans_Telugu,
  Noto_Sans_Gurmukhi,
} from 'next/font/google'
import { Providers } from './providers'
import { ImpersonationProvider } from '@/lib/impersonation'
import { RestaurantProvider } from '@/lib/restaurant-context'
import { ImpersonationBanner } from '@/components/impersonation-banner'
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

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '600'],
  variable: '--font-noto-devanagari',
  display: 'swap',
})

const notoTelugu = Noto_Sans_Telugu({
  subsets: ['telugu'],
  weight: ['400', '600'],
  variable: '--font-noto-telugu',
  display: 'swap',
})

const notoGurmukhi = Noto_Sans_Gurmukhi({
  subsets: ['gurmukhi'],
  weight: ['400', '600'],
  variable: '--font-noto-gurmukhi',
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
    <html
      lang="en"
      className={`${jakarta.variable} ${nunito.variable} ${notoDevanagari.variable} ${notoTelugu.variable} ${notoGurmukhi.variable}`}
    >
      <body className="font-sans bg-cream text-ink antialiased">
        <Providers>
          <ImpersonationProvider>
            <RestaurantProvider>
              <ImpersonationBanner />
              {children}
            </RestaurantProvider>
          </ImpersonationProvider>
        </Providers>
      </body>
    </html>
  )
}
