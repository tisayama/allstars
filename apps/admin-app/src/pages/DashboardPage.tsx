/**
 * DashboardPage component (T040)
 * Displays statistics and navigation for quiz and guest management
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface DashboardStats {
  questionCount: number;
  guestCount: number;
  periodCount: number;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch statistics from API
      const [questionsRes, guestsRes] = await Promise.all([
        api.get<{ count: number; periods?: string[] }>('/admin/quizzes/stats').catch(() => ({ count: 0, periods: [] })),
        api.get<{ count: number }>('/admin/guests/stats').catch(() => ({ count: 0 })),
      ]);

      setStats({
        questionCount: questionsRes.count || 0,
        guestCount: guestsRes.count || 0,
        periodCount: questionsRes.periods?.length || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={loadStats}
          className="mt-2 text-sm text-red-700 underline hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Questions"
          value={stats?.questionCount || 0}
          subtitle={`in ${stats?.periodCount || 0} periods`}
          icon="❓"
          color="blue"
        />
        <StatCard
          title="Guests Registered"
          value={stats?.guestCount || 0}
          subtitle="pre-registered attendees"
          icon="👥"
          color="green"
        />
        <StatCard
          title="QR Codes"
          value={stats?.guestCount || 0}
          subtitle="ready to print"
          icon="📱"
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ActionLink
            to="/quizzes"
            title="Manage Questions"
            description="Create and edit quiz questions"
            icon="❓"
          />
          <ActionLink
            to="/guests"
            title="Manage Guests"
            description="Add guests and upload CSV"
            icon="👥"
          />
          <ActionLink
            to="/guests/print"
            title="Print QR Codes"
            description="Generate QR codes for all guests"
            icon="🖨️"
          />
          <ActionLink
            to="/settings"
            title="Game Settings"
            description="Configure game rules"
            icon="⚙️"
          />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
  color: 'blue' | 'green' | 'purple';
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <span className={`text-2xl ${colorClasses[color]} p-2 rounded-lg`}>
          {icon}
        </span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

interface ActionLinkProps {
  to: string;
  title: string;
  description: string;
  icon: string;
}

function ActionLink({ to, title, description, icon }: ActionLinkProps) {
  return (
    <Link
      to={to}
      className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </Link>
  );
}
