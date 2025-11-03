/**
 * Zod validation schema for Guest entity
 */

import { z } from 'zod';

export const guestStatusSchema = z.enum(['active', 'dropped']);

export const authMethodSchema = z.enum(['google', 'anonymous']);

export const guestSchema = z.object({
  id: z.string().min(1, 'Guest ID is required'),
  name: z.string().min(1, 'Guest name is required'),
  status: guestStatusSchema,
  attributes: z.array(z.string()),
  authMethod: authMethodSchema,
});

export type GuestInput = z.infer<typeof guestSchema>;
