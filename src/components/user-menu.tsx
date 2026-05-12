'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'

export function UserMenu() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const user = session?.user
  const imageUrl = user?.image ?? undefined
  const fallbackSeed = (user?.name ?? user?.email ?? '?').trim()
  const fallbackInitial = (fallbackSeed.charAt(0) || '?').toUpperCase()

  const handleHelp = () => {
    setOpen(false)
    window.open('mailto:hello@fono.services', '_blank')
  }

  const handleSignOut = () => {
    setOpen(false)
    void signOut({ callbackUrl: '/login' })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="block w-9 h-9 rounded-full overflow-hidden flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span
            className="w-full h-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: '#E0602A', fontSize: 14 }}
          >
            {fallbackInitial}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black/5 py-1 z-50"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleHelp}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Help &amp; Support
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  )
}
