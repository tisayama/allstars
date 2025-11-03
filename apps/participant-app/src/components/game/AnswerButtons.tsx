interface Choice {
  index: number;
  text: string;
}

interface AnswerButtonsProps {
  choices: Choice[];
  selectedChoice: number | null;
  correctChoice: number | null;
  locked: boolean;
  onSelectAnswer: (choiceIndex: number) => void;
  showResults?: boolean;
}

/**
 * Answer buttons component
 *
 * Features:
 * - 2-6 answer choices
 * - Tap feedback (vibration handled by parent)
 * - Lock after selection
 * - Visual feedback for correct/incorrect (when revealed)
 * - Mobile-optimized 44px touch targets
 */
export function AnswerButtons({
  choices,
  selectedChoice,
  correctChoice,
  locked,
  onSelectAnswer,
  showResults = false,
}: AnswerButtonsProps) {
  /**
   * Get button styling based on state
   */
  const getButtonStyle = (choice: Choice) => {
    const isSelected = selectedChoice === choice.index;
    const isCorrect = correctChoice === choice.index;

    // Show results (reveal phase)
    if (showResults) {
      if (isCorrect) {
        return 'bg-success text-white border-success';
      }
      if (isSelected && !isCorrect) {
        return 'bg-error text-white border-error';
      }
      return 'bg-gray-100 text-gray-500 border-gray-300';
    }

    // Answering phase
    if (isSelected) {
      return 'bg-primary text-white border-primary ring-2 ring-primary ring-offset-2';
    }

    if (locked) {
      return 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed';
    }

    return 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50 hover:border-primary active:bg-gray-100';
  };

  return (
    <div className="space-y-3">
      {choices.map((choice) => (
        <button
          key={choice.index}
          onClick={() => onSelectAnswer(choice.index)}
          disabled={locked}
          className={`
            w-full text-left px-6 py-4 rounded-lg border-2 font-semibold
            transition-all duration-200
            ${getButtonStyle(choice)}
          `}
          style={{ minHeight: '44px', fontSize: '16px' }}
        >
          <div className="flex items-center">
            {/* Choice letter/number */}
            <span
              className={`
                inline-flex items-center justify-center w-8 h-8 rounded-full mr-3 font-bold text-sm
                ${
                  selectedChoice === choice.index && !showResults
                    ? 'bg-white text-primary'
                    : showResults && correctChoice === choice.index
                      ? 'bg-white text-success'
                      : showResults &&
                          selectedChoice === choice.index &&
                          correctChoice !== choice.index
                        ? 'bg-white text-error'
                        : 'bg-gray-200 text-gray-700'
                }
              `}
            >
              {String.fromCharCode(65 + choice.index)}
            </span>

            {/* Choice text */}
            <span className="flex-1">{choice.text}</span>

            {/* Result indicator */}
            {showResults && (
              <span className="ml-2 text-xl">
                {correctChoice === choice.index ? '✓' : selectedChoice === choice.index ? '✗' : ''}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
