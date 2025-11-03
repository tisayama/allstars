import { Question } from '@/hooks/useGameState';

interface QuestionDisplayProps {
  question: Question;
}

/**
 * Question display component
 *
 * Shows question text, number, and period.
 * Mobile-optimized with large, readable text.
 */
export function QuestionDisplay({ question }: QuestionDisplayProps) {
  // Format period for display
  const periodLabel = {
    'first-half': 'First Half',
    'second-half': 'Second Half',
    overtime: 'Overtime',
  }[question.period];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      {/* Question metadata */}
      <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
        <span className="font-semibold">{periodLabel}</span>
        <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-bold">
          Question {question.questionNumber}
        </span>
      </div>

      {/* Question text */}
      <div className="text-center">
        <p className="text-xl font-bold text-gray-900 leading-relaxed">{question.questionText}</p>
      </div>
    </div>
  );
}
