import React from "react"

interface Step {
  id: number
  name: string
}

interface StepsNavigationProps {
  steps: Step[]
  currentStep: number
  setCurrentStep: (step: number) => void
}

export default function StepsNavigation({ steps, currentStep, setCurrentStep }: StepsNavigationProps) {
  return (
    <div className="mb-6">
      <h3 className="text-purple-600 mb-4">Step</h3>
      <div className="bg-white p-4 rounded-lg">
        <div className="flex justify-between items-center">
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col items-center">
              <button onClick={() => setCurrentStep(step.id)}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep === step.id ? "bg-purple-400 text-white" : "bg-purple-200 text-purple-600"} mb-2`}>
                {step.id}
              </button>
              <span className={`text-sm ${currentStep === step.id ? "text-purple-600 font-medium" : "text-purple-400"}`}>
                {step.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
