'use client'

import Link from 'next/link'

export default function SuccessScreen() {
  return (
    <div className="text-center space-y-6 animate-fade-in py-8">
      <div className="text-6xl">&#127881;</div>
      <h2 className="text-2xl font-bold text-ink">Welcome to Fono!</h2>
      <p className="text-brown max-w-sm mx-auto">
        Your calls are now being tracked. Check your dashboard to see call activity in real time.
      </p>
      <Link
        href="/dashboard"
        className="inline-block px-8 py-3.5 rounded-xl bg-terra text-white font-semibold text-base hover:bg-terra-dark active:scale-[0.98] transition-all"
      >
        Go to Dashboard
      </Link>
    </div>
  )
}
