'use client'

import { useState } from 'react'

interface RestaurantFormProps {
  data: { name: string; phone: string; cuisine: string; city: string }
  onNext: (data: { name: string; phone: string; cuisine: string; city: string }) => void
}

export default function RestaurantForm({ data, onNext }: RestaurantFormProps) {
  const [form, setForm] = useState(data)

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  const isValid = form.name.trim() && form.phone.replace(/\D/g, '').length === 10 && form.cuisine

  return (
    <div className="space-y-5 animate-fade-in">
      <h2 className="text-2xl font-bold text-ink">Restaurant Info</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-secondary mb-1.5">Restaurant Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Spice Garden"
            className="w-full px-4 py-3 rounded-xl border border-warm-border bg-white text-ink placeholder:text-brown-light/50 focus:outline-none focus:ring-2 focus:ring-terra/30 focus:border-terra transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-secondary mb-1.5">Restaurant Phone Number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
            placeholder="(408) 555-1234"
            className="w-full px-4 py-3 rounded-xl border border-warm-border bg-white text-ink placeholder:text-brown-light/50 focus:outline-none focus:ring-2 focus:ring-terra/30 focus:border-terra transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-secondary mb-1.5">Cuisine Type</label>
          <select
            value={form.cuisine}
            onChange={(e) => setForm({ ...form, cuisine: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-warm-border bg-white text-ink focus:outline-none focus:ring-2 focus:ring-terra/30 focus:border-terra transition-all"
          >
            <option value="">Select cuisine...</option>
            <option value="South Indian">South Indian</option>
            <option value="North Indian">North Indian</option>
            <option value="Indo-Chinese">Indo-Chinese</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-secondary mb-1.5">City</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Bay Area"
            className="w-full px-4 py-3 rounded-xl border border-warm-border bg-white text-ink placeholder:text-brown-light/50 focus:outline-none focus:ring-2 focus:ring-terra/30 focus:border-terra transition-all"
          />
        </div>
      </div>

      <button
        onClick={() => isValid && onNext(form)}
        disabled={!isValid}
        className="w-full py-3.5 rounded-xl bg-terra text-white font-semibold text-base hover:bg-terra-dark active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  )
}
