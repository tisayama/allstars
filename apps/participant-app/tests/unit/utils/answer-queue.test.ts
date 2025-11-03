import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock API client
vi.mock('@/lib/api-client', () => ({
  submitAnswer: vi.fn(),
}));

describe('Answer Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Clear queue before each test
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('queueAnswer', () => {
    it('should add answer to local queue', async () => {
      const { queueAnswer, getQueuedAnswers } = await import('@/utils/answer-queue');

      const answer = {
        guestId: 'guest-123',
        questionId: 'q-first-half-001',
        choiceIndex: 2,
        responseTimeMs: 3250,
      };

      queueAnswer(answer);

      const queued = getQueuedAnswers();
      expect(queued).toHaveLength(1);
      expect(queued[0]?.answer).toEqual(answer);
      expect(queued[0]?.status).toBe('pending');
      expect(queued[0]?.retryCount).toBe(0);
    });

    it('should persist queue to localStorage', async () => {
      const { queueAnswer } = await import('@/utils/answer-queue');

      const answer = {
        guestId: 'guest-123',
        questionId: 'q-first-half-001',
        choiceIndex: 2,
        responseTimeMs: 3250,
      };

      queueAnswer(answer);

      const stored = localStorage.getItem('allstars_answer_queue');
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].answer).toEqual(answer);
    });
  });

  describe('processQueue', () => {
    it('should submit all pending answers', async () => {
      const { submitAnswer } = await import('@/lib/api-client');
      const { queueAnswer, processQueue } = await import('@/utils/answer-queue');

      // Queue multiple answers
      queueAnswer({
        guestId: 'guest-123',
        questionId: 'q-001',
        choiceIndex: 0,
        responseTimeMs: 1000,
      });
      queueAnswer({
        guestId: 'guest-123',
        questionId: 'q-002',
        choiceIndex: 1,
        responseTimeMs: 2000,
      });

      vi.mocked(submitAnswer).mockResolvedValue({
        success: true,
        answerId: 'ans-123',
      });

      await processQueue();

      expect(submitAnswer).toHaveBeenCalledTimes(2);
    });

    it('should remove successfully submitted answers from queue', async () => {
      const { submitAnswer } = await import('@/lib/api-client');
      const { queueAnswer, processQueue, getQueuedAnswers } = await import(
        '@/utils/answer-queue'
      );

      queueAnswer({
        guestId: 'guest-123',
        questionId: 'q-001',
        choiceIndex: 0,
        responseTimeMs: 1000,
      });

      vi.mocked(submitAnswer).mockResolvedValue({
        success: true,
        answerId: 'ans-123',
      });

      await processQueue();

      const queued = getQueuedAnswers();
      expect(queued).toHaveLength(0);
    });

    it('should retry failed submissions with exponential backoff', async () => {
      const { submitAnswer } = await import('@/lib/api-client');
      const { queueAnswer, processQueue, getQueuedAnswers } = await import(
        '@/utils/answer-queue'
      );

      queueAnswer({
        guestId: 'guest-123',
        questionId: 'q-001',
        choiceIndex: 0,
        responseTimeMs: 1000,
      });

      // First attempt fails
      vi.mocked(submitAnswer).mockRejectedValueOnce(new Error('Network error'));

      await processQueue();

      const queued = getQueuedAnswers();
      expect(queued).toHaveLength(1);
      expect(queued[0]?.status).toBe('retrying');
      expect(queued[0]?.retryCount).toBe(1);

      // Wait for retry delay (200ms for first retry)
      vi.advanceTimersByTime(200);

      // Second attempt succeeds
      vi.mocked(submitAnswer).mockResolvedValueOnce({
        success: true,
        answerId: 'ans-123',
      });

      await processQueue();

      const queuedAfterRetry = getQueuedAnswers();
      expect(queuedAfterRetry).toHaveLength(0);
    });

    it('should use exponential backoff delays (200ms, 400ms, 800ms)', async () => {
      const { submitAnswer } = await import('@/lib/api-client');
      const { queueAnswer, processQueue, getQueuedAnswers } = await import(
        '@/utils/answer-queue'
      );

      queueAnswer({
        guestId: 'guest-123',
        questionId: 'q-001',
        choiceIndex: 0,
        responseTimeMs: 1000,
      });

      // Fail 3 times
      vi.mocked(submitAnswer).mockRejectedValue(new Error('Network error'));

      // First attempt
      await processQueue();
      let queued = getQueuedAnswers();
      expect(queued[0]?.retryCount).toBe(1);

      // Wait 200ms (first retry delay)
      vi.advanceTimersByTime(200);
      await processQueue();
      queued = getQueuedAnswers();
      expect(queued[0]?.retryCount).toBe(2);

      // Wait 400ms (second retry delay)
      vi.advanceTimersByTime(400);
      await processQueue();
      queued = getQueuedAnswers();
      expect(queued[0]?.retryCount).toBe(3);

      // Wait 800ms (third retry delay)
      vi.advanceTimersByTime(800);
      await processQueue();
      queued = getQueuedAnswers();
      expect(queued[0]?.retryCount).toBe(4);
    });

    it('should give up after 3 retries and mark as failed', async () => {
      const { submitAnswer } = await import('@/lib/api-client');
      const { queueAnswer, processQueue, getQueuedAnswers } = await import(
        '@/utils/answer-queue'
      );

      queueAnswer({
        guestId: 'guest-123',
        questionId: 'q-001',
        choiceIndex: 0,
        responseTimeMs: 1000,
      });

      vi.mocked(submitAnswer).mockRejectedValue(new Error('Network error'));

      // Attempt 4 times (initial + 3 retries)
      for (let i = 0; i < 4; i++) {
        await processQueue();
        vi.advanceTimersByTime(800); // Max retry delay
      }

      const queued = getQueuedAnswers();
      expect(queued).toHaveLength(1);
      expect(queued[0]?.status).toBe('failed');
      expect(queued[0]?.retryCount).toBe(4);
    });
  });

  describe('clearQueue', () => {
    it('should remove all answers from queue', async () => {
      const { queueAnswer, clearQueue, getQueuedAnswers } = await import(
        '@/utils/answer-queue'
      );

      queueAnswer({
        guestId: 'guest-123',
        questionId: 'q-001',
        choiceIndex: 0,
        responseTimeMs: 1000,
      });
      queueAnswer({
        guestId: 'guest-123',
        questionId: 'q-002',
        choiceIndex: 1,
        responseTimeMs: 2000,
      });

      clearQueue();

      const queued = getQueuedAnswers();
      expect(queued).toHaveLength(0);
    });

    it('should clear localStorage', async () => {
      const { queueAnswer, clearQueue } = await import('@/utils/answer-queue');

      queueAnswer({
        guestId: 'guest-123',
        questionId: 'q-001',
        choiceIndex: 0,
        responseTimeMs: 1000,
      });

      clearQueue();

      const stored = localStorage.getItem('allstars_answer_queue');
      expect(stored).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate answer error (409)', async () => {
      const { submitAnswer } = await import('@/lib/api-client');
      const { queueAnswer, processQueue, getQueuedAnswers } = await import(
        '@/utils/answer-queue'
      );

      queueAnswer({
        guestId: 'guest-123',
        questionId: 'q-001',
        choiceIndex: 0,
        responseTimeMs: 1000,
      });

      const duplicateError = new Error('Answer already submitted for this question');
      // @ts-expect-error - Adding status code to error
      duplicateError.code = 'DUPLICATE_ANSWER';

      vi.mocked(submitAnswer).mockRejectedValueOnce(duplicateError);

      await processQueue();

      // Should remove from queue (already submitted)
      const queued = getQueuedAnswers();
      expect(queued).toHaveLength(0);
    });

    it('should handle guest dropped error (403)', async () => {
      const { submitAnswer } = await import('@/lib/api-client');
      const { queueAnswer, processQueue, getQueuedAnswers } = await import(
        '@/utils/answer-queue'
      );

      queueAnswer({
        guestId: 'guest-123',
        questionId: 'q-001',
        choiceIndex: 0,
        responseTimeMs: 1000,
      });

      const droppedError = new Error('Guest is eliminated and cannot answer');
      // @ts-expect-error - Adding status code to error
      droppedError.code = 'GUEST_DROPPED';

      vi.mocked(submitAnswer).mockRejectedValueOnce(droppedError);

      await processQueue();

      // Should remove from queue (guest dropped out)
      const queued = getQueuedAnswers();
      expect(queued).toHaveLength(0);
    });
  });

  describe('Persistence', () => {
    it('should load queue from localStorage on initialization', async () => {
      // Pre-populate localStorage
      const existingQueue = [
        {
          id: 'answer-1',
          answer: {
            guestId: 'guest-123',
            questionId: 'q-001',
            choiceIndex: 0,
            responseTimeMs: 1000,
          },
          status: 'pending',
          retryCount: 0,
          timestamp: Date.now(),
        },
      ];

      localStorage.setItem('allstars_answer_queue', JSON.stringify(existingQueue));

      const { getQueuedAnswers } = await import('@/utils/answer-queue');

      const queued = getQueuedAnswers();
      expect(queued).toHaveLength(1);
      expect(queued[0]?.answer.questionId).toBe('q-001');
    });
  });
});
