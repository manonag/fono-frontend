'use client'

import { useState } from 'react'

interface ContactFormProps {
  data: { ownerName: string; ownerPhone: string; ownerEmail: string }
  onNext: (data: { ownerName: string; ownerPhone: string; ownerEmail: string }) => void
  onBack: () => void
}

export default function ContactForm({ data, onNext, onBack }: ContactFormProps) {
  const [form, setForm] = useState(data)

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  const isValid =
    form.ownerName.trim() &&
    form.ownerPhone.replace(/\D/g, '').length === 10 &&
    form.ownerEmail.includes('@')

  return (
    <div className="space-y-5 animate-fade-in">
      <h2 className="text-2xl font-bold text-ink">Contact Info</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-secondary mb-1.5">Owner Name</label>
          <input
            type="text"
            value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
            placeholder="Your full name"
            className="w-full px-4 py-3 rounded-xl border border-warm-border bg-white text-ink placeholder:text-brown-light/50 focus:outline-none focus:ring-2 focus:ring-terra/30 focus:border-terra transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-secondary mb-1.5">Owner Phone</label>
          <input
            type="tel"
            value={form.ownerPhone}
            onChange={(e) => setForm({ ...form, ownerPhone: formatPhone(e.target.value) })}
            placeholder="(408) 555-1234"
            className="w-full px-4 py-3 rounded-xl border border-warm-border bg-white text-ink placeholder:text-brown-light/50 focus:outline-none focus:ring-2 focus:ring-terra/30 focus:border-terra transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-secondary mb-1.5">Email Address</label>
          <input
            type="email"
            value={form.ownerEmail}
            onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border border-warm-border bg-white text-ink placeholder:text-brown-light/50 focus:outline-none focus:ring-2 focus:ring-terra/30 focus:border-terra transition-all"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl bg-white text-brown border border-warm-border font-semibold text-base hover:bg-cream-secondary active:scale-[0.98] transition-all"
        >
          Back
        </button>
        <button
          onClick={() => isValid && onNext(form)}
          disabled={!isValid}
          className="flex-1 py-3.5 rounded-xl bg-terra text-white font-semibold text-base hover:bg-terra-dark active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}
