import { submitAnswer, AnswerSubmission } from '@/lib/api-client';

/**
 * Answer queue item status
 */
export type AnswerStatus = 'pending' | 'retrying' | 'failed' | 'submitted';

/**
 * Answer queue item
 */
export interface QueuedAnswer {
  id: string;
  answer: AnswerSubmission;
  status: AnswerStatus;
  retryCount: number;
  timestamp: number;
  lastAttempt?: number;
  error?: string;
}

const QUEUE_KEY = 'allstars_answer_queue';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [200, 400, 800]; // Exponential backoff: 200ms, 400ms, 800ms

/**
 * Load queue from localStorage
 */
function loadQueue(): QueuedAnswer[] {
  const stored = localStorage.getItem(QUEUE_KEY);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to parse answer queue from localStorage:', error);
    return [];
  }
}

/**
 * Save queue to localStorage
 */
function saveQueue(queue: QueuedAnswer[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to save answer queue to localStorage:', error);
  }
}

/**
 * Generate unique ID for queued answer
 */
function generateId(): string {
  return `answer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Queue answer for submission.
 * Answer will be persisted to localStorage and automatically retried on failure.
 *
 * @param answer - Answer submission data
 * @returns Queue item ID
 */
export function queueAnswer(answer: AnswerSubmission): string {
  const queue = loadQueue();

  const item: QueuedAnswer = {
    id: generateId(),
    answer,
    status: 'pending',
    retryCount: 0,
    timestamp: Date.now(),
  };

  queue.push(item);
  saveQueue(queue);

  return item.id;
}

/**
 * Get all queued answers
 */
export function getQueuedAnswers(): QueuedAnswer[] {
  return loadQueue();
}

/**
 * Check if answer should be retried based on delay
 */
function shouldRetry(item: QueuedAnswer): boolean {
  if (item.status !== 'retrying' || item.retryCount > MAX_RETRIES) {
    return false;
  }

  if (!item.lastAttempt) {
    return true;
  }

  const delayIndex = Math.min(item.retryCount - 1, RETRY_DELAYS.length - 1);
  const delay = RETRY_DELAYS[delayIndex] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1]!;
  const timeSinceLastAttempt = Date.now() - item.lastAttempt;

  return timeSinceLastAttempt >= delay;
}

/**
 * Check if error is non-retryable (duplicate answer, guest dropped)
 */
function isNonRetryableError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  return (
    errorMessage.includes('duplicate') ||
    errorMessage.includes('already submitted') ||
    errorMessage.includes('eliminated') ||
    errorMessage.includes('dropped')
  );
}

/**
 * Process answer queue and submit pending answers.
 * Implements exponential backoff retry logic (200ms, 400ms, 800ms).
 *
 * Non-retryable errors (duplicate answer, guest dropped) will remove item from queue.
 * After MAX_RETRIES attempts, answer is marked as failed but kept in queue.
 */
export async function processQueue(): Promise<void> {
  const queue = loadQueue();
  const itemsToRemove: string[] = [];
  let modified = false;

  // Process items without modifying array during iteration
  for (const item of queue) {
    // Skip if not ready to process
    if (item.status === 'submitted' || item.status === 'failed') {
      continue;
    }

    if (item.status === 'retrying' && !shouldRetry(item)) {
      continue;
    }

    try {
      // Attempt submission
      await submitAnswer(item.answer);

      // Success - mark for removal
      itemsToRemove.push(item.id);
      modified = true;
    } catch (error) {
      const errorObj = error as Error;

      // Check if error is non-retryable
      if (isNonRetryableError(errorObj)) {
        // Mark for removal (already submitted or guest dropped)
        itemsToRemove.push(item.id);
        modified = true;
        console.warn(`Answer removed from queue (non-retryable): ${errorObj.message}`);
        continue;
      }

      // Update retry info
      item.retryCount++;
      item.lastAttempt = Date.now();
      item.error = errorObj.message;

      if (item.retryCount > MAX_RETRIES) {
        // Give up after max retries
        item.status = 'failed';
        console.error(
          `Answer submission failed after ${MAX_RETRIES} retries:`,
          item.answer.questionId
        );
      } else {
        // Schedule retry
        item.status = 'retrying';
        const delayIndex = Math.min(item.retryCount - 1, RETRY_DELAYS.length - 1);
        const delay = RETRY_DELAYS[delayIndex] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1]!;
        console.warn(
          `Answer submission failed, retry ${item.retryCount}/${MAX_RETRIES} ` +
            `in ${delay}ms: ${errorObj.message}`
        );
      }

      modified = true;
    }
  }

  // Remove successfully submitted items
  if (itemsToRemove.length > 0) {
    const filteredQueue = queue.filter((item) => !itemsToRemove.includes(item.id));
    saveQueue(filteredQueue);
  } else if (modified) {
    saveQueue(queue);
  }
}

/**
 * Clear all answers from queue
 */
export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

/**
 * Remove specific answer from queue by ID
 */
export function removeAnswer(id: string): void {
  const queue = loadQueue();
  const index = queue.findIndex((item) => item.id === id);

  if (index !== -1) {
    queue.splice(index, 1);
    saveQueue(queue);
  }
}

/**
 * Get count of pending/retrying answers
 */
export function getPendingCount(): number {
  const queue = loadQueue();
  return queue.filter((item) => item.status === 'pending' || item.status === 'retrying').length;
}

/**
 * Get count of failed answers
 */
export function getFailedCount(): number {
  const queue = loadQueue();
  return queue.filter((item) => item.status === 'failed').length;
}
