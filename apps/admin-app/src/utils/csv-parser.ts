/**
 * CSV parser utility (T069)
 * Parses and validates guest CSV files using PapaParse
 */

import Papa from 'papaparse';

export interface GuestCSVRow {
  Name: string;
  TableNumber: string;
  Attributes: string;
}

export interface ParsedGuest {
  name: string;
  tableNumber: number;
  attributes: string[];
}

export interface CSVError {
  row: number;
  column: string;
  message: string;
}

export interface CSVParseResult {
  guests: ParsedGuest[];
  errors: CSVError[];
  valid: boolean;
}

/**
 * Parse CSV file and validate guest data
 */
export function parseGuestCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    const errors: CSVError[] = [];
    const guests: ParsedGuest[] = [];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<GuestCSVRow>) => {
        // Validate required columns
        const requiredColumns = ['Name', 'TableNumber', 'Attributes'];
        const headers = results.meta.fields || [];
        const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

        if (missingColumns.length > 0) {
          errors.push({
            row: 0,
            column: missingColumns.join(', '),
            message: `Missing required columns: ${missingColumns.join(', ')}. Please check guest-template.csv for correct format.`,
          });
          resolve({ guests: [], errors, valid: false });
          return;
        }

        // Parse and validate each row
        results.data.forEach((row, index) => {
          const rowNumber = index + 2; // +2 for header row and 0-indexing

          // Validate name
          if (!row.Name || row.Name.trim() === '') {
            errors.push({
              row: rowNumber,
              column: 'Name',
              message: 'Name is required. Please check guest-template.csv for correct format.',
            });
          }

          // Validate table number
          const tableNumber = parseInt(row.TableNumber, 10);
          if (isNaN(tableNumber) || tableNumber <= 0) {
            errors.push({
              row: rowNumber,
              column: 'TableNumber',
              message: 'TableNumber must be a positive integer. Please check guest-template.csv for correct format.',
            });
          }

          // Parse attributes
          const attributes = row.Attributes
            ? row.Attributes.split(',').map((attr) => attr.trim()).filter((attr) => attr !== '')
            : [];

          // Only add guest if no errors for this row
          const rowHasErrors = errors.some((e) => e.row === rowNumber);
          if (!rowHasErrors && row.Name && !isNaN(tableNumber)) {
            guests.push({
              name: row.Name.trim(),
              tableNumber,
              attributes,
            });
          }
        });

        resolve({
          guests,
          errors,
          valid: errors.length === 0,
        });
      },
      error: (error) => {
        errors.push({
          row: 0,
          column: '',
          message: `CSV parsing error: ${error.message}`,
        });
        resolve({ guests: [], errors, valid: false });
      },
    });
  });
}

/**
 * Format CSV errors for display
 */
export function formatCSVErrors(errors: CSVError[]): string {
  return errors
    .map((error) => {
      if (error.row === 0) {
        return error.message;
      }
      return `Row ${error.row}, Column '${error.column}': ${error.message}`;
    })
    .join('\n');
}
