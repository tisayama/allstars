/**
 * CollectionPrefixGenerator - Generate unique prefixes for test data isolation
 * Feature: 008-e2e-playwright-tests
 *
 * Enables parallel test execution by providing unique collection prefixes
 * Format: test_${timestamp}_${uuid}_
 */

import { randomUUID } from 'crypto';

export interface CollectionPrefixMetadata {
  timestamp: number;
  uuid: string;
  isValid: boolean;
}

export class CollectionPrefixGenerator {
  /**
   * Generate a unique collection prefix for this test run
   * Format: `test_${timestamp}_${uuid}_`
   * @returns Unique prefix string ending with underscore
   */
  generate(): string {
    const timestamp = Date.now();
    const uuid = randomUUID().slice(0, 8); // First 8 chars of UUID
    return `test_${timestamp}_${uuid}_`;
  }

  /**
   * Parse a collection prefix to extract metadata
   * @param prefix - Collection prefix to parse
   * @returns Metadata object with timestamp and UUID
   */
  parse(prefix: string): CollectionPrefixMetadata {
    const pattern = /^test_(\d+)_([a-f0-9]{8})_$/;
    const match = prefix.match(pattern);

    if (!match) {
      return {
        timestamp: 0,
        uuid: '',
        isValid: false,
      };
    }

    return {
      timestamp: parseInt(match[1], 10),
      uuid: match[2],
      isValid: true,
    };
  }

  /**
   * Apply prefix to a collection name
   * @param prefix - Collection prefix
   * @param collectionName - Base collection name (e.g., "guests")
   * @returns Prefixed collection name (e.g., "test_1704369600_a1b2_guests")
   */
  apply(prefix: string, collectionName: string): string {
    return `${prefix}${collectionName}`;
  }
}
