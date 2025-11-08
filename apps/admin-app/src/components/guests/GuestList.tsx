/**
 * GuestList component (T071)
 * Displays list of guests with edit/delete actions
 */

import type { Guest } from '@allstars/types';

interface GuestWithTable extends Guest {
  tableNumber?: number;
}

interface GuestListProps {
  guests: GuestWithTable[];
  onEdit: (guest: GuestWithTable) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export function GuestList({ guests, onEdit, onDelete, loading }: GuestListProps) {
  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading guests...
      </div>
    );
  }

  if (guests.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-600 mb-4">No guests registered yet</p>
        <p className="text-sm text-gray-500">
          Add guests individually or upload a CSV file
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden" data-testid="guest-list">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Table
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Attributes
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {guests.map((guest) => (
            <tr key={guest.id} className="hover:bg-gray-50" data-testid="guest-list-row">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{guest.name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{guest.tableNumber || '-'}</div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {guest.attributes.length > 0 ? (
                    guest.attributes.map((attr) => (
                      <span
                        key={attr}
                        className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                      >
                        {attr}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">No attributes</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  onClick={() => onEdit(guest)}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${guest.name}?`)) {
                      onDelete(guest.id);
                    }
                  }}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
