import { useState, useCallback, useRef, useEffect } from 'react'
import ChecklistStep from './ChecklistStep'
import OrgProfileForm from './OrgProfileForm'
import EntityDocumentUpload from './EntityDocumentUpload'
import PaymentSetupPrompt from './PaymentSetupPrompt'
import InviteMemberPrompt from './InviteMemberPrompt'

export default function OnboardingChecklist({ checklist, onRefresh, onBrowseCandidates, firstName }) {
  // Find the first active/non-locked step to auto-expand
  const findActiveStep = useCallback((steps) => {
    if (!steps) return null
    const activeIdx = steps.findIndex(s => s.status === 'active' || s.status === 'in_progress')
    return activeIdx >= 0 ? activeIdx : null
  }, [])

  const [expandedIndex, setExpandedIndex] = useState(() => findActiveStep(checklist?.steps))
  const [justCompletedIndex, setJustCompletedIndex] = useState(null)
  const prevStepsRef = useRef(checklist?.steps)

  // Detect step completion and auto-advance
  useEffect(() => {
    const prevSteps = prevStepsRef.current
    const currSteps = checklist?.steps
    if (!prevSteps || !currSteps) {
      prevStepsRef.current = currSteps
      return
    }

    // Find which step just became completed
    let newlyCompleted = null
    for (let i = 0; i < currSteps.length; i++) {
      if (currSteps[i].status === 'completed' && prevSteps[i]?.status !== 'completed') {
        newlyCompleted = i
        break
      }
    }

    if (newlyCompleted !== null) {
      // Show success flash on the completed step
      setJustCompletedIndex(newlyCompleted)

      // After a brief delay, advance to the next step
      const timer = setTimeout(() => {
        setJustCompletedIndex(null)
        // Find next non-locked step
        const nextIdx = currSteps.findIndex((s, i) => i > newlyCompleted && s.status !== 'locked' && s.status !== 'completed')
        setExpandedIndex(nextIdx >= 0 ? nextIdx : null)
      }, 800)

      prevStepsRef.current = currSteps
      return () => clearTimeout(timer)
    }

    // Also handle when a step changes from locked to active (e.g. after refresh)
    if (expandedIndex === null) {
      const activeIdx = findActiveStep(currSteps)
      if (activeIdx !== null) {
        setExpandedIndex(activeIdx)
      }
    }

    prevStepsRef.current = currSteps
  }, [checklist?.steps, expandedIndex, findActiveStep])

  if (!checklist || !checklist.steps) return null

  const { steps } = checklist
  const completedCount = steps.filter(s => s.status === 'completed').length
  const progressPercent = Math.round((completedCount / steps.length) * 100)

  const handleToggle = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  const handleStepComplete = async () => {
    await onRefresh()
  }

  // Navigate to next available step
  const handleNext = (currentIndex) => {
    const nextIdx = steps.findIndex((s, i) => i > currentIndex && s.status !== 'locked')
    if (nextIdx >= 0) {
      setExpandedIndex(nextIdx)
    }
  }

  return (
    <div className="mb-8 bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-icons-outlined text-primary text-xl">rocket_launch</span>
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">Setup Your Account</span>
        </div>
        <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
          Welcome{firstName ? `, ${firstName}` : ''}! Let's get started.
        </h2>
        <p className="text-sm text-subtext-light dark:text-subtext-dark mt-1">
          Complete these steps in order to start managing your team.
        </p>

        {/* Progress Bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-subtext-light dark:text-subtext-dark whitespace-nowrap">
            {completedCount}/{steps.length} complete
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="px-6 pb-6 space-y-3">
        {steps.map((step, index) => (
          <ChecklistStep
            key={step.key}
            stepNumber={index + 1}
            title={step.title}
            subtitle={step.subtitle}
            status={step.status}
            expanded={expandedIndex === index}
            onToggle={() => handleToggle(index)}
            justCompleted={justCompletedIndex === index}
          >
            {step.key === 'org_profile' && (
              <OrgProfileForm stepData={step.data} onComplete={handleStepComplete} />
            )}
            {step.key === 'entity_verification' && (
              <EntityDocumentUpload stepData={step.data} onComplete={handleStepComplete} />
            )}
            {step.key === 'payment_setup' && (
              <PaymentSetupPrompt />
            )}
            {step.key === 'invite_team' && (
              <InviteMemberPrompt
                stepData={step.data}
                onComplete={handleStepComplete}
                onBrowseCandidates={onBrowseCandidates}
              />
            )}

            {/* Next button for completed/pending_review steps */}
            {(step.status === 'completed' || step.status === 'pending_review') && index < steps.length - 1 && (
              <div className="mt-4 pt-3 border-t border-border-light dark:border-border-dark">
                <button
                  onClick={() => handleNext(index)}
                  disabled={steps[index + 1]?.status === 'locked'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary hover:text-primary-hover transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next Step
                  <span className="material-icons-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            )}
          </ChecklistStep>
        ))}
      </div>
    </div>
  )
}
