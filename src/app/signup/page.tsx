'use client'

import { useEffect } from 'react'

export default function SignupPage() {
  useEffect(() => {
    window.location.href = 'https://fono.services'
  }, [])

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#FDF0E8' }}
    >
      <p style={{ fontSize: 14, color: '#8B7355' }}>Redirecting to fono.services...</p>
    </div>
  )
}
