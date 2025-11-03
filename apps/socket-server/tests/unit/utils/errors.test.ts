import { AuthenticationError, ValidationError, ListenerError } from '../../../src/utils/errors';

describe('Custom Error Classes', () => {
  describe('AuthenticationError', () => {
    it('should create an AuthenticationError with default status code 401', () => {
      const error = new AuthenticationError('Invalid token');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe('Invalid token');
      expect(error.name).toBe('AuthenticationError');
      expect(error.statusCode).toBe(401);
    });

    it('should create an AuthenticationError with custom status code', () => {
      const error = new AuthenticationError('Token expired', 403);
      expect(error.statusCode).toBe(403);
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError without details', () => {
      const error = new ValidationError('Invalid payload');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid payload');
      expect(error.name).toBe('ValidationError');
      expect(error.details).toBeUndefined();
    });

    it('should create a ValidationError with details', () => {
      const details = { field: 'currentPhase', expected: 'string', received: 'number' };
      const error = new ValidationError('Invalid field type', details);
      expect(error.details).toEqual(details);
    });
  });

  describe('ListenerError', () => {
    it('should create a ListenerError without cause', () => {
      const error = new ListenerError('Connection failed');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ListenerError);
      expect(error.message).toBe('Connection failed');
      expect(error.name).toBe('ListenerError');
      expect(error.cause).toBeUndefined();
    });

    it('should create a ListenerError with cause', () => {
      const cause = new Error('Network timeout');
      const error = new ListenerError('Firestore listener disconnected', cause);
      expect(error.cause).toBe(cause);
      expect(error.cause?.message).toBe('Network timeout');
    });
  });
});
