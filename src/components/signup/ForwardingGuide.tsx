'use client'

interface ForwardingGuideProps {
  onComplete: () => void
  onBack: () => void
}

const steps = [
  { emoji: '\uD83D\uDCF1', text: 'Open your phone app' },
  { emoji: '\u2699\uFE0F', text: 'Go to Settings > Call Forwarding' },
  { emoji: '\uD83D\uDCDE', text: 'Enter: +1 (855) 789-3783' },
  { emoji: '\u2705', text: 'Enable call forwarding' },
]

export default function ForwardingGuide({ onComplete, onBack }: ForwardingGuideProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-ink">Set Up Call Forwarding</h2>
      <p className="text-sm text-brown-light">Forward your restaurant phone to Fono so we can track your calls.</p>

      <div className="bg-white rounded-xl border border-warm-border p-5">
        <p className="text-sm font-semibold text-ink-secondary mb-1">Your Fono Number</p>
        <p className="text-2xl font-bold text-terra tracking-wide">+1 (855) 789-3783</p>
      </div>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-warm-border">
            <span className="text-2xl flex-shrink-0">{step.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-ink">Step {i + 1}</p>
              <p className="text-sm text-brown">{step.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl bg-white text-brown border border-warm-border font-semibold text-base hover:bg-cream-secondary active:scale-[0.98] transition-all"
        >
          Back
        </button>
        <button
          onClick={onComplete}
          className="flex-1 py-3.5 rounded-xl bg-terra text-white font-semibold text-base hover:bg-terra-dark active:scale-[0.98] transition-all"
        >
          I&apos;ve Set Up Forwarding
        </button>
      </div>
    </div>
  )
}
