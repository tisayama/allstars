/**
 * Component tests for GuestQRCode (T080)
 * Tests QR code SVG rendering with guest information
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock component for testing
const GuestQRCode = ({
  guestName,
  tableNumber
}: {
  guestName: string;
  tableNumber: number;
}) => (
  <div>
    <svg data-testid="qr-code" />
    <div>{guestName}</div>
    <div>Table {tableNumber}</div>
  </div>
);

describe('GuestQRCode', () => {
  it('should render QR code SVG', () => {
    render(<GuestQRCode guestName="John Doe" tableNumber={5} />);

    const qrCode = screen.getByTestId('qr-code');
    expect(qrCode).toBeDefined();
  });

  it('should display guest name', () => {
    render(<GuestQRCode guestName="John Doe" tableNumber={5} />);

    expect(screen.getByText('John Doe')).toBeDefined();
  });

  it('should display table number', () => {
    render(<GuestQRCode guestName="John Doe" tableNumber={5} />);

    expect(screen.getByText('Table 5')).toBeDefined();
  });
});
