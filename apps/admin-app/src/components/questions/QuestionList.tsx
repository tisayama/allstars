/**
 * QuestionList component (T051)
 * Displays list of questions with edit/delete actions
 */

import type { Question } from '@allstars/types';

interface QuestionListProps {
  questions: Question[];
  onEdit: (question: Question) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export function QuestionList({ questions, onEdit, onDelete, loading }: QuestionListProps) {
  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading questions...
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-600 mb-4">No questions yet</p>
        <p className="text-sm text-gray-500">
          Click "Add Question" to create your first quiz question
        </p>
      </div>
    );
  }

  // Group questions by period
  const groupedQuestions = questions.reduce((acc, question) => {
    if (!acc[question.period]) {
      acc[question.period] = [];
    }
    acc[question.period].push(question);
    return acc;
  }, {} as Record<string, Question[]>);

  return (
    <div className="space-y-6" data-testid="question-list">
      {Object.entries(groupedQuestions).map(([period, periodQuestions]) => (
        <div key={period} className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 capitalize">
              {period.replace('-', ' ')}
            </h3>
            <p className="text-sm text-gray-600">
              {periodQuestions.length} question{periodQuestions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {periodQuestions
              .sort((a, b) => a.questionNumber - b.questionNumber)
              .map((question) => (
                <QuestionItem
                  key={question.id}
                  question={question}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface QuestionItemProps {
  question: Question;
  onEdit: (question: Question) => void;
  onDelete: (id: string) => void;
}

function QuestionItem({ question, onEdit, onDelete }: QuestionItemProps) {
  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete question ${question.questionNumber}?`)) {
      onDelete(question.id);
    }
  };

  return (
    <div className="px-6 py-4 hover:bg-gray-50" data-testid="question-list-row">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              {question.questionNumber}
            </span>
            <h4 className="text-base font-medium text-gray-900">{question.text}</h4>
          </div>
          <div className="ml-11 space-y-2">
            <div className="flex flex-wrap gap-2">
              {question.choices.map((choice, index) => {
                const isCorrect = choice === question.correctAnswer;
                const choiceLabel = ['A', 'B', 'C', 'D', 'E', 'F'][index];
                return (
                  <span
                    key={index}
                    className={`px-3 py-1 rounded-full text-sm ${
                      isCorrect
                        ? 'bg-green-100 text-green-800 font-medium'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    {...(isCorrect && { 'data-testid': `question-${question.questionNumber}-correct-answer` })}
                  >
                    {choice}
                    {isCorrect && ` ✓ (${choiceLabel})`}
                  </span>
                );
              })}
            </div>
            {question.skipAttributes.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Skip for:</span>
                {question.skipAttributes.map((attr) => (
                  <span key={attr} className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                    {attr}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => onEdit(question)}
            data-testid={`edit-question-${question.questionNumber}-btn`}
            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            data-testid={`delete-question-${question.questionNumber}-btn`}
            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
