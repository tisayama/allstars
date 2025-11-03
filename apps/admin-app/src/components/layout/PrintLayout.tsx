/**
 * PrintLayout component (T085)
 * Print-optimized layout without header/sidebar
 */

import { ReactNode } from 'react';

interface PrintLayoutProps {
  children: ReactNode;
}

export function PrintLayout({ children }: PrintLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header - only visible on screen */}
      <header className="print:hidden bg-gray-50 border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">
            Print Preview
          </h1>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Print QR Codes
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="p-8 print:p-0">
        {children}
      </main>
    </div>
  );
}
