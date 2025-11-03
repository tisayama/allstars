/**
 * QuestionForm component (T050)
 * Form for creating and editing quiz questions with validation
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Question } from '@allstars/types';

// Form validation schema
const questionFormSchema = z.object({
  period: z.string().min(1, 'Period is required'),
  questionNumber: z.number().int().positive('Question number must be positive'),
  type: z.literal('multiple-choice'),
  text: z.string().min(1, 'Question text is required'),
  choices: z.array(z.string()).min(2, 'At least 2 choices required').max(6, 'Maximum 6 choices'),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  skipAttributes: z.array(z.string()),
  deadline: z.string().min(1, 'Deadline is required'),
});

type QuestionFormData = z.infer<typeof questionFormSchema>;

interface QuestionFormProps {
  question?: Question;
  onSubmit: (data: QuestionFormData) => Promise<void>;
  onCancel: () => void;
}

export function QuestionForm({ question, onSubmit, onCancel }: QuestionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: question
      ? {
          ...question,
          deadline: new Date().toISOString().slice(0, 16), // Default to current datetime
        }
      : {
          period: 'first-half',
          questionNumber: 1,
          type: 'multiple-choice',
          text: '',
          choices: ['', '', '', ''],
          correctAnswer: '',
          skipAttributes: [],
          deadline: new Date().toISOString().slice(0, 16),
        },
  });

  const choices = watch('choices');

  const addChoice = () => {
    if (choices.length < 6) {
      setValue('choices', [...choices, '']);
    }
  };

  const removeChoice = (index: number) => {
    if (choices.length > 2) {
      setValue(
        'choices',
        choices.filter((_, i) => i !== index)
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Period */}
      <div>
        <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-1">
          Period
        </label>
        <select
          id="period"
          {...register('period')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="first-half">First Half</option>
          <option value="second-half">Second Half</option>
          <option value="overtime">Overtime</option>
        </select>
        {errors.period && (
          <p className="mt-1 text-sm text-red-600">{errors.period.message}</p>
        )}
      </div>

      {/* Question Number */}
      <div>
        <label htmlFor="questionNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Question Number
        </label>
        <input
          id="questionNumber"
          type="number"
          {...register('questionNumber', { valueAsNumber: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.questionNumber && (
          <p className="mt-1 text-sm text-red-600">{errors.questionNumber.message}</p>
        )}
      </div>

      {/* Question Text */}
      <div>
        <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
          Question Text
        </label>
        <textarea
          id="text"
          rows={3}
          {...register('text')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your question..."
        />
        {errors.text && (
          <p className="mt-1 text-sm text-red-600">{errors.text.message}</p>
        )}
      </div>

      {/* Choices */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Answer Choices
        </label>
        <div className="space-y-2">
          {choices.map((_, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                {...register(`choices.${index}`)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Choice ${index + 1}`}
              />
              {choices.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeChoice(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        {errors.choices && (
          <p className="mt-1 text-sm text-red-600">
            {Array.isArray(errors.choices) ? 'All choices are required' : errors.choices.message}
          </p>
        )}
        {choices.length < 6 && (
          <button
            type="button"
            onClick={addChoice}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            + Add Choice
          </button>
        )}
      </div>

      {/* Correct Answer */}
      <div>
        <label htmlFor="correctAnswer" className="block text-sm font-medium text-gray-700 mb-1">
          Correct Answer
        </label>
        <select
          id="correctAnswer"
          {...register('correctAnswer')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select correct answer</option>
          {choices.map((choice, index) => (
            <option key={index} value={choice}>
              {choice || `Choice ${index + 1}`}
            </option>
          ))}
        </select>
        {errors.correctAnswer && (
          <p className="mt-1 text-sm text-red-600">{errors.correctAnswer.message}</p>
        )}
      </div>

      {/* Deadline */}
      <div>
        <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
          Answer Deadline
        </label>
        <input
          id="deadline"
          type="datetime-local"
          {...register('deadline')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.deadline && (
          <p className="mt-1 text-sm text-red-600">{errors.deadline.message}</p>
        )}
      </div>

      {/* Skip Attributes */}
      <div>
        <label htmlFor="skipAttributes" className="block text-sm font-medium text-gray-700 mb-1">
          Skip Attributes (comma-separated)
        </label>
        <input
          id="skipAttributes"
          type="text"
          onChange={(e) => {
            const value = e.target.value;
            setValue('skipAttributes', value ? value.split(',').map((s) => s.trim()) : []);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., age-under-20, gender-male"
        />
        <p className="mt-1 text-xs text-gray-500">
          Questions will be hidden from guests with these attributes
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : question ? 'Update Question' : 'Create Question'}
        </button>
      </div>
    </form>
  );
}
