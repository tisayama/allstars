/**
 * QRCodePrintPage component (T086)
 * Print page displaying all guest QR codes
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuests } from '@/hooks/useGuests';
import { GuestQRCode } from '@/components/guests/GuestQRCode';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { validateParticipantAppUrl } from '@/utils/qr-generator';

interface GuestWithTable {
  id: string;
  name: string;
  tableNumber?: number;
  authToken?: string;
  attributes: string[];
}

export function QRCodePrintPage() {
  const { guests, loading, error, fetchGuests } = useGuests();
  const navigate = useNavigate();
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    // Validate participant app URL is configured
    try {
      validateParticipantAppUrl();
      fetchGuests();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Configuration error');
    }
  }, [fetchGuests]);

  if (validationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-600 mb-4">Configuration Error</h2>
          <p className="text-gray-700 mb-4">{validationError}</p>
          <button
            onClick={() => navigate('/guests')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Guests
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading guest QR codes..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error Loading Guests</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => navigate('/guests')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Guests
          </button>
        </div>
      </div>
    );
  }

  if (guests.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">No Guests Found</h2>
          <p className="text-gray-700 mb-4">
            Please add guests before generating QR codes.
          </p>
          <button
            onClick={() => navigate('/guests')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Guest Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - only visible on screen */}
      <header className="print:hidden bg-gray-50 border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">QR Code Print Preview</h1>
            <p className="text-sm text-gray-600 mt-1">
              {guests.length} QR code{guests.length !== 1 ? 's' : ''} ready to print
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/guests')}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back to Guests
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Print QR Codes
            </button>
          </div>
        </div>
      </header>

      {/* QR Code Grid */}
      <div className="p-8 print:p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
          {(guests as GuestWithTable[]).map((guest) => (
            <GuestQRCode
              key={guest.id}
              guestId={guest.id}
              guestName={guest.name}
              tableNumber={guest.tableNumber}
              authToken={guest.authToken}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
