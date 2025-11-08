/**
 * GuestsPage component (T073)
 * Main page for guest management with CSV upload and CRUD operations
 */

import { useEffect, useState, useMemo } from 'react';
import type { Guest } from '@allstars/types';
import { useGuests } from '@/hooks/useGuests';
import { GuestList } from '@/components/guests/GuestList';
import { GuestForm } from '@/components/guests/GuestForm';
import { GuestCSVUpload } from '@/components/guests/GuestCSVUpload';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

type ModalType = 'form' | 'csv' | null;

export function GuestsPage() {
  const { guests, loading, error, fetchGuests, createGuest, updateGuest, deleteGuest, bulkImportGuests } =
    useGuests();
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  // Filter and search guests (T104)
  const filteredGuests = useMemo(() => {
    if (!searchTerm) return guests;

    const searchLower = searchTerm.toLowerCase();
    return guests.filter((guest) =>
      guest.name.toLowerCase().includes(searchLower) ||
      guest.attributes.some((attr) => attr.toLowerCase().includes(searchLower))
    );
  }, [guests, searchTerm]);

  const handleAddGuest = () => {
    setEditingGuest(null);
    setFormError(null);
    setModalType('form');
  };

  const handleUploadCSV = () => {
    setFormError(null);
    setModalType('csv');
  };

  const handleEdit = (guest: Guest) => {
    setEditingGuest(guest);
    setFormError(null);
    setModalType('form');
  };

  const handleCloseModal = () => {
    setModalType(null);
    setEditingGuest(null);
    setFormError(null);
  };

  const handleFormSubmit = async (data: { name: string; tableNumber: number; attributes: string[] }) => {
    try {
      setFormError(null);

      if (editingGuest) {
        await updateGuest(editingGuest.id, data);
      } else {
        await createGuest(data);
      }

      setModalType(null);
      setEditingGuest(null);
      await fetchGuests();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save guest');
    }
  };

  const handleCSVImport = async (guestsData: Array<{ name: string; tableNumber: number; attributes: string[] }>) => {
    try {
      setFormError(null);
      await bulkImportGuests(guestsData);
      setModalType(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to import guests');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGuest(id);
      await fetchGuests();
    } catch (err) {
      console.error('Failed to delete guest:', err);
    }
  };

  if (loading && guests.length === 0) {
    return <LoadingSpinner text="Loading guests..." />;
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Guest Management</h2>
            <p className="text-gray-600 mt-1">
              Manage event attendees and pre-register guests
            </p>
          </div>
          {!modalType && (
            <div className="flex gap-3">
              {guests.length > 0 && (
                <button
                  onClick={() => window.location.href = '/guests/print'}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  Print All QR Codes
                </button>
              )}
              <button
                onClick={handleUploadCSV}
                data-testid="import-csv-btn"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Upload CSV
              </button>
              <button
                onClick={handleAddGuest}
                data-testid="add-guest-btn"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Guest
              </button>
            </div>
          )}
        </div>

        {/* Search (T104) */}
        {!modalType && guests.length > 0 && (
          <div>
            <input
              type="text"
              placeholder="Search guests by name or attributes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">Error: {error}</p>
          <button
            onClick={fetchGuests}
            className="mt-2 text-sm text-red-700 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Modals */}
      {modalType === 'form' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingGuest ? 'Edit Guest' : 'Add New Guest'}
          </h3>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{formError}</p>
            </div>
          )}
          <GuestForm
            guest={editingGuest || undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleCloseModal}
          />
        </div>
      )}

      {modalType === 'csv' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Upload Guest CSV
          </h3>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{formError}</p>
            </div>
          )}
          <GuestCSVUpload
            onImport={handleCSVImport}
            onCancel={handleCloseModal}
          />
        </div>
      )}

      {/* Guest List */}
      {!modalType && (
        <>
          <div className="mb-4 text-sm text-gray-600">
            {searchTerm ? (
              <>Showing {filteredGuests.length} of {guests.length} guests</>
            ) : (
              <>{guests.length} guest{guests.length !== 1 ? 's' : ''} registered</>
            )}
          </div>
          <GuestList
            guests={filteredGuests}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
