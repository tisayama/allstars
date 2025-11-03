/**
 * GuestQRCode component (T084)
 * Renders QR code with guest information for printing
 */

import { QRCodeSVG } from 'qrcode.react';
import { generateGuestQRCodeUrl } from '@/utils/qr-generator';

interface GuestQRCodeProps {
  guestId: string;
  guestName: string;
  tableNumber?: number;
  authToken?: string;
}

export function GuestQRCode({ guestId, guestName, tableNumber, authToken }: GuestQRCodeProps) {
  // Use guestId as token if authToken is not provided (for testing/demo)
  const token = authToken || guestId;
  const qrCodeUrl = generateGuestQRCodeUrl(token);

  return (
    <div className="qr-card flex flex-col items-center p-6 bg-white border-2 border-gray-300 rounded-lg">
      {/* QR Code */}
      <div className="qr-code-container mb-4">
        <QRCodeSVG
          value={qrCodeUrl}
          size={200}
          level="H"
          includeMargin={true}
          data-testid="qr-code"
        />
      </div>

      {/* Guest Information */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-1">{guestName}</h3>
        {tableNumber !== undefined && (
          <p className="text-lg text-gray-600">Table {tableNumber}</p>
        )}
      </div>

      {/* Instructions (hidden on print) */}
      <div className="mt-4 text-xs text-gray-500 text-center print:hidden">
        <p>Scan to join the quiz</p>
      </div>
    </div>
  );
}
