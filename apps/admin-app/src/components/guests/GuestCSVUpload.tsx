/**
 * GuestCSVUpload component (T072)
 * Handles CSV file upload with validation and error display
 */

import { useState } from 'react';
import { parseGuestCSV, formatCSVErrors, type CSVParseResult } from '@/utils/csv-parser';

interface GuestCSVUploadProps {
  onImport: (guests: Array<{ name: string; tableNumber: number; attributes: string[] }>) => Promise<void>;
  onCancel: () => void;
}

export function GuestCSVUpload({ onImport, onCancel }: GuestCSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsing(true);
    setParseResult(null);

    try {
      const result = await parseGuestCSV(selectedFile);
      setParseResult(result);
    } catch (error) {
      console.error('Failed to parse CSV:', error);
      setParseResult({
        guests: [],
        errors: [{ row: 0, column: '', message: 'Failed to parse CSV file' }],
        valid: false,
      });
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult || !parseResult.valid) return;

    try {
      setImporting(true);
      await onImport(parseResult.guests);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Download Template */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          📄 CSV Template
        </h4>
        <p className="text-sm text-blue-700 mb-3">
          Download the template to see the required format with example data
        </p>
        <a
          href="/guest-template.csv"
          download="guest-template.csv"
          className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Download Template
        </a>
      </div>

      {/* File Upload */}
      <div>
        <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-2">
          Upload Guest CSV File
        </label>
        <input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-medium
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        {file && (
          <p className="mt-2 text-sm text-gray-600">
            Selected file: {file.name}
          </p>
        )}
      </div>

      {/* Parsing Status */}
      {parsing && (
        <div className="text-sm text-gray-600">
          Parsing CSV file...
        </div>
      )}

      {/* Parse Results */}
      {parseResult && !parsing && (
        <div>
          {parseResult.valid ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-green-900 mb-2">
                ✓ Valid CSV File
              </h4>
              <p className="text-sm text-green-700">
                Found {parseResult.guests.length} valid guest{parseResult.guests.length !== 1 ? 's' : ''}
              </p>
              <div className="mt-3 text-xs text-green-600 space-y-1">
                <p>Examples from your file:</p>
                {parseResult.guests.slice(0, 3).map((guest, i) => (
                  <p key={i} className="font-mono">
                    • {guest.name} (Table {guest.tableNumber})
                    {guest.attributes.length > 0 && ` - ${guest.attributes.join(', ')}`}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-red-900 mb-2">
                ✗ CSV Validation Errors
              </h4>
              <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono mt-2">
                {formatCSVErrors(parseResult.errors)}
              </pre>
              <p className="text-xs text-red-600 mt-3">
                Please fix the errors above and upload the file again.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={importing}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={!parseResult || !parseResult.valid || importing}
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? `Importing ${parseResult?.guests.length || 0} guests...` : 'Import Guests'}
        </button>
      </div>
    </div>
  );
}
