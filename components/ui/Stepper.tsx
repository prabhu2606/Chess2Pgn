'use client'

interface StepperProps {
  steps: { label: string; number: number }[]
  activeStep: number
}

export default function Stepper({ steps, activeStep }: StepperProps) {
  return (
    <div className="flex items-center justify-center gap-0 max-w-[800px] w-full mx-auto py-8">
      {steps.map((step, index) => {
        const isActive = index === activeStep
        const isCompleted = index < activeStep
        const isLast = index === steps.length - 1

        return (
          <div key={index} className="flex flex-col items-center flex-1 relative z-10">
            {!isLast && (
              <div
                className={`absolute top-6 left-[calc(50%+24px)] w-[calc(100%-48px)] h-0.5 z-0 transition-colors duration-300 ${
                  isCompleted ? 'bg-primary' : 'bg-accent2'
                }`}
              />
            )}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center relative z-20 transition-all duration-300 ${
                isActive || isCompleted
                  ? 'bg-primary border-primary shadow-[0_4px_12px_rgba(129,182,76,0.3)]'
                  : 'bg-accent1 border-accent2 border-[3px]'
              }`}
            >
              <span
                className={`font-semibold text-lg transition-colors duration-300 ${
                  isActive || isCompleted ? 'text-white' : 'text-contrast'
                }`}
              >
                {step.number}
              </span>
            </div>
            <div
              className={`mt-3 font-medium text-[0.95rem] transition-colors duration-300 ${
                isActive
                  ? 'text-primary font-semibold'
                  : isCompleted
                  ? 'text-contrast'
                  : 'text-contrast/60'
              }`}
            >
              {step.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

