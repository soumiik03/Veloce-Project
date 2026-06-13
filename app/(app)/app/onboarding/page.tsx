"use client"

import { StepperWizard } from "@/components/features/onboarding/stepper-wizard"

export default function OnboardingPage() {
  const handleComplete = () => {
    window.location.href = "/app/mail"
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[80vh]">
      <div className="text-center mb-8 max-w-md">
        <h1 className="text-3xl font-light text-white tracking-tight uppercase font-sans mb-2">Workspace Setup</h1>
        <p className="text-xs text-zinc-500 font-light">Calibrate Veloce parameters to align with your workspace channels.</p>
      </div>

      <StepperWizard onComplete={handleComplete} />
    </div>
  )
}
