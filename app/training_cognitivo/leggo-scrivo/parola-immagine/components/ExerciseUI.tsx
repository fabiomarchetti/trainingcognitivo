/**
 * Componente UI principale per l'esercizio parola-immagine
 */
'use client'

import { useState } from 'react'

interface ExerciseUIProps {
  onComplete?: (result: ExerciseResult) => void
}

interface ExerciseResult {
  score: number
  totalQuestions: number
  timeSpent: number
  errors: number
}

export function ExerciseUI({ onComplete }: ExerciseUIProps) {
  const [isStarted, setIsStarted] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const handleStart = () => {
    setIsStarted(true)
  }

  const handleComplete = () => {
    if (onComplete) {
      onComplete({
        score: 0,
        totalQuestions: 0,
        timeSpent: 0,
        errors: 0
      })
    }
  }

  return (
    <div className="exercise-container">
      {!isStarted ? (
        <div className="text-center">
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg"
          >
            Inizia
          </button>
        </div>
      ) : (
        <div>
          {/* Implementa qui la logica dell'esercizio */}
          <p>Step: {currentStep}</p>
        </div>
      )}
    </div>
  )
}
