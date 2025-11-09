/**
 * QuizzesPage component (T052)
 * Main page for quiz management with create/edit/delete functionality
 */

import { useEffect, useState, useMemo } from 'react';
import type { Question } from '@allstars/types';
import { useQuestions } from '@/hooks/useQuestions';
import { QuestionList } from '@/components/questions/QuestionList';
import { QuestionForm } from '@/components/questions/QuestionForm';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export function QuizzesPage() {
  const { questions, loading, error, fetchQuestions, createQuestion, updateQuestion, deleteQuestion } =
    useQuestions();
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Filter and search questions (T103)
  const filteredQuestions = useMemo(() => {
    let filtered = questions;

    // Filter by period
    if (filterPeriod !== 'all') {
      filtered = filtered.filter((q) => q.period === filterPeriod);
    }

    // Search by text
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((q) =>
        q.text.toLowerCase().includes(searchLower) ||
        q.choices.some((c) => c.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [questions, filterPeriod, searchTerm]);

  // Get unique periods for filter
  const periods = useMemo(() => {
    const uniquePeriods = Array.from(new Set(questions.map((q) => q.period)));
    return uniquePeriods.sort();
  }, [questions]);

  const handleCreate = () => {
    setEditingQuestion(null);
    setFormError(null);
    setShowForm(true);
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormError(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingQuestion(null);
    setFormError(null);
  };

  const handleSubmit = async (data: any) => {
    try {
      setFormError(null);

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, data);
      } else {
        await createQuestion(data);
      }

      setShowForm(false);
      setEditingQuestion(null);
      await fetchQuestions();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save question');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQuestion(id);
      await fetchQuestions();
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  if (loading && questions.length === 0) {
    return <LoadingSpinner text="Loading questions..." />;
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Quiz Management</h2>
            <p className="text-gray-600 mt-1">
              Create and manage quiz questions for your event
            </p>
          </div>
          {!showForm && (
            <button
              onClick={handleCreate}
              data-testid="add-question-btn"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Question
            </button>
          )}
        </div>

        {/* Search and Filter (T103) */}
        {!showForm && questions.length > 0 && (
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Periods</option>
              {periods.map((period) => (
                <option key={period} value={period}>
                  {period.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">Error: {error}</p>
          <button
            onClick={fetchQuestions}
            className="mt-2 text-sm text-red-700 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {showForm ? (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingQuestion ? 'Edit Question' : 'Create New Question'}
          </h3>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{formError}</p>
            </div>
          )}
          <QuestionForm
            question={editingQuestion || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      ) : (
        <>
          {searchTerm || filterPeriod !== 'all' ? (
            <div className="mb-4 text-sm text-gray-600">
              Showing {filteredQuestions.length} of {questions.length} questions
            </div>
          ) : null}
          <QuestionList
            questions={filteredQuestions}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
