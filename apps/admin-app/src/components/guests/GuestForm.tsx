/**
 * GuestForm component (T070)
 * Form for creating and editing guests with validation
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Guest } from '@allstars/types';

// Form validation schema
const guestFormSchema = z.object({
  name: z.string().min(1, 'Guest name is required'),
  tableNumber: z.number().int().positive('Table number must be positive'),
  attributes: z.string(), // Comma-separated string, will be split
});

type GuestFormData = z.infer<typeof guestFormSchema>;

interface GuestFormProps {
  guest?: Guest;
  onSubmit: (data: { name: string; tableNumber: number; attributes: string[] }) => Promise<void>;
  onCancel: () => void;
}

export function GuestForm({ guest, onSubmit, onCancel }: GuestFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: guest
      ? {
          name: guest.name,
          tableNumber: 0, // Guest interface doesn't have tableNumber, will need to adjust
          attributes: guest.attributes.join(', '),
        }
      : {
          name: '',
          tableNumber: 1,
          attributes: '',
        },
  });

  const handleFormSubmit = async (data: GuestFormData) => {
    await onSubmit({
      name: data.name,
      tableNumber: data.tableNumber,
      attributes: data.attributes
        ? data.attributes.split(',').map((s) => s.trim()).filter((s) => s !== '')
        : [],
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Guest Name
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter guest name..."
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Table Number */}
      <div>
        <label htmlFor="tableNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Table Number
        </label>
        <input
          id="tableNumber"
          type="number"
          {...register('tableNumber', { valueAsNumber: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.tableNumber && (
          <p className="mt-1 text-sm text-red-600">{errors.tableNumber.message}</p>
        )}
      </div>

      {/* Attributes */}
      <div>
        <label htmlFor="attributes" className="block text-sm font-medium text-gray-700 mb-1">
          Attributes (comma-separated)
        </label>
        <input
          id="attributes"
          type="text"
          {...register('attributes')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., groom_friend, speech_guest"
        />
        <p className="mt-1 text-xs text-gray-500">
          Used to filter which questions the guest sees
        </p>
        {errors.attributes && (
          <p className="mt-1 text-sm text-red-600">{errors.attributes.message}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : guest ? 'Update Guest' : 'Add Guest'}
        </button>
      </div>
    </form>
  );
}
