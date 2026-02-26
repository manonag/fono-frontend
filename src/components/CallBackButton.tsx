'use client'

import { useState } from 'react'
import { bridgeCall } from '@/lib/api'
import { config } from '@/lib/config'

interface CallBackButtonProps {
  phoneNumber: string
  variant?: 'small' | 'large'
}

export default function CallBackButton({ phoneNumber, variant = 'small' }: CallBackButtonProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleClick = async () => {
    setLoading(true)
    setStatus('idle')
    try {
      await bridgeCall(config.defaultTenantId, phoneNumber)
      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'large') {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className={`px-6 py-3 rounded-xl font-semibold text-base transition-all min-h-[48px] ${
          status === 'success'
            ? 'bg-green-600 text-white'
            : status === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-terra text-white hover:bg-terra-dark active:scale-95'
        } disabled:opacity-50`}
      >
        {loading ? 'Calling...' : status === 'success' ? 'Call Initiated!' : status === 'error' ? 'Failed' : 'CALL BACK'}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        status === 'success'
          ? 'bg-green-100 text-green-700'
          : status === 'error'
          ? 'bg-red-100 text-red-700'
          : 'bg-terra text-white hover:bg-terra-dark active:scale-95'
      } disabled:opacity-50`}
    >
      {loading ? '...' : status === 'success' ? 'Sent!' : status === 'error' ? 'Failed' : 'Call Back'}
    </button>
  )
}
