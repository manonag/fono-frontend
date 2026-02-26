'use client'

import { useState } from 'react'
import StepIndicator from '@/components/signup/StepIndicator'
import RestaurantForm from '@/components/signup/RestaurantForm'
import ContactForm from '@/components/signup/ContactForm'
import ForwardingGuide from '@/components/signup/ForwardingGuide'
import SuccessScreen from '@/components/signup/SuccessScreen'

interface SignupData {
  restaurant: { name: string; phone: string; cuisine: string; city: string }
  contact: { ownerName: string; ownerPhone: string; ownerEmail: string }
}

export default function SignupPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<SignupData>({
    restaurant: { name: '', phone: '', cuisine: '', city: 'Bay Area' },
    contact: { ownerName: '', ownerPhone: '', ownerEmail: '' },
  })

  const handleRestaurantNext = (restaurant: SignupData['restaurant']) => {
    setData((prev) => ({ ...prev, restaurant }))
    setStep(2)
  }

  const handleContactNext = (contact: SignupData['contact']) => {
    setData((prev) => ({ ...prev, contact }))
    setStep(3)
  }

  const handleComplete = () => {
    // Save to localStorage for now
    localStorage.setItem('fono_signup', JSON.stringify(data))
    setStep(4)
  }

  if (step === 4) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <SuccessScreen />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-terra-dark text-white px-4 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold tracking-tight">Fono</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        <StepIndicator currentStep={step} totalSteps={3} />

        {step === 1 && <RestaurantForm data={data.restaurant} onNext={handleRestaurantNext} />}
        {step === 2 && (
          <ContactForm data={data.contact} onNext={handleContactNext} onBack={() => setStep(1)} />
        )}
        {step === 3 && <ForwardingGuide onComplete={handleComplete} onBack={() => setStep(2)} />}
      </main>
    </div>
  )
}
