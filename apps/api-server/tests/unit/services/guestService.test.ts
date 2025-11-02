/**
 * Unit tests for guest service
 * Tests guest status management with active/dropped values
 */

import { db } from '../../../src/utils/firestore';
import {
  listGuests,
  getGuestById,
  reviveAllGuests,
  createGuest,
} from '../../../src/services/guestService';

// Mock Firestore
jest.mock('../../../src/utils/firestore', () => ({
  db: {
    collection: jest.fn(),
    batch: jest.fn(),
  },
  admin: {
    firestore: {
      FieldValue: {
        serverTimestamp: jest.fn(() => new Date()),
      },
    },
  },
}));

describe('Guest Service', () => {
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockGet: jest.Mock;
  let mockWhere: jest.Mock;
  let mockSet: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockBatch: jest.Mock;
  let mockBatchCommit: jest.Mock;
  let mockBatchUpdate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGet = jest.fn();
    mockSet = jest.fn();
    mockUpdate = jest.fn();
    mockWhere = jest.fn();
    mockDoc = jest.fn();
    mockCollection = jest.fn();
    mockBatchCommit = jest.fn();
    mockBatchUpdate = jest.fn();
    mockBatch = jest.fn(() => ({
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    }));

    mockWhere.mockReturnThis();
    mockWhere.mockReturnValue({
      get: mockGet,
      where: mockWhere,
    });

    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
    });

    mockCollection.mockReturnValue({
      where: mockWhere,
      doc: mockDoc,
      get: mockGet,
    });

    (db.collection as jest.Mock) = mockCollection;
    (db.batch as jest.Mock) = mockBatch;
  });

  describe('Status Field Values', () => {
    it('should expect active status for new guests', async () => {
      mockSet.mockResolvedValue(undefined);

      const guest = await createGuest({
        id: 'guest-1',
        name: 'Test Guest',
        attributes: ['age-under-20'],
        authMethod: 'anonymous',
      });

      // Verify guest is created with 'active' status
      expect(guest.status).toBe('active');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      );
    });

    it('should revive guests with dropped status to active', async () => {
      mockGet.mockResolvedValue({
        empty: false,
        size: 3,
        docs: [
          {
            id: 'guest-1',
            ref: { path: 'guests/guest-1' },
            data: () => ({
              name: 'Guest 1',
              status: 'dropped',
              attributes: [],
              authMethod: 'anonymous',
            }),
          },
          {
            id: 'guest-2',
            ref: { path: 'guests/guest-2' },
            data: () => ({
              name: 'Guest 2',
              status: 'dropped',
              attributes: [],
              authMethod: 'anonymous',
            }),
          },
          {
            id: 'guest-3',
            ref: { path: 'guests/guest-3' },
            data: () => ({
              name: 'Guest 3',
              status: 'dropped',
              attributes: [],
              authMethod: 'anonymous',
            }),
          },
        ],
      });

      mockBatchCommit.mockResolvedValue(undefined);

      const count = await reviveAllGuests();

      // Verify query uses 'dropped' status
      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'dropped');

      // Verify batch update sets status to 'active'
      expect(mockBatchUpdate).toHaveBeenCalledTimes(3);
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 'active' })
      );

      expect(count).toBe(3);
    });

    it('should return guests with active or dropped status', async () => {
      mockGet.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'guest-1',
            data: () => ({
              name: 'Active Guest',
              status: 'active',
              attributes: ['age-over-20'],
              authMethod: 'anonymous',
            }),
          },
          {
            id: 'guest-2',
            data: () => ({
              name: 'Dropped Guest',
              status: 'dropped',
              attributes: [],
              authMethod: 'anonymous',
            }),
          },
        ],
      });

      const guests = await listGuests();

      expect(guests).toHaveLength(2);
      expect(guests[0].status).toBe('active');
      expect(guests[1].status).toBe('dropped');
    });
  });
});
