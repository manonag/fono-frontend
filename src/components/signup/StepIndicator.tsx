interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-brown-light text-center">
        Step {currentStep} of {totalSteps}
      </p>
      <div className="flex gap-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < currentStep ? 'bg-terra' : 'bg-cream-secondary'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
