import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { CommandClient } from './command-client';
import type { SendCommand, ResponseMessage, ReturnErrorResponse } from '../types/messages';

describe('CommandClient', () => {
  let sendFn: ReturnType<typeof vi.fn>;
  let client: CommandClient;

  beforeEach(() => {
    sendFn = vi.fn((message: string) => true);
    client = new CommandClient(sendFn as any, 1000); // 1s timeout for tests
  });

  afterEach(() => {
    client.cleanup();
  });

  describe('sendCommand', () => {
    it('should resolve when handleResponse called with matching CorrelationId', async () => {
      const command: SendCommand = {
        Type: 'POST_LOGIN',
        From: 'UI',
        To: 'SERV',
        Data: {
          Email: 'test@example.com',
          Password: 'password123',
        },
      };

      // Start the command
      const promise = client.sendCommand(command);

      // Verify sendFn was called
      expect(sendFn).toHaveBeenCalledTimes(1);
      const sentMessage = sendFn.mock.calls[0]?.[0];
      const sentCommand = JSON.parse(sentMessage);

      // Verify command was sent (no CorrelationId in message - gateway doesn't support it)
      expect(sentCommand.Type).toBe('POST_LOGIN');
      expect(sentCommand.Data.Email).toBe('test@example.com');

      // Verify command client is tracking this request
      expect(client.getPendingCount()).toBe(1);

      // Simulate response - use FIFO matching (no CorrelationId in response either)
      const response: ResponseMessage = {
        Type: 'RTN_DYN',
        From: 'SERV',
        Target: 'UI',
        CorrelationId: undefined as any, // Gateway doesn't return CorrelationId
        Data: { success: true, token: 'abc123' },
      };

      client.handleResponse(response);

      // Should resolve with response data
      const result = await promise;
      expect(result).toEqual({ success: true, token: 'abc123' });
    });

    it('should reject with timeout error when no response arrives', async () => {
      const command: SendCommand = {
        Type: 'GET_DYN_CONNECTED',
        From: 'UI',
        To: 'SERV',
        Data: {},
      };

      const promise = client.sendCommand(command, 100); // 100ms timeout

      // Wait for timeout
      await expect(promise).rejects.toThrow(/timeout/i);

      // Verify no pending requests remain (cleanup)
      expect(client.getPendingCount()).toBe(0);
    });

    it('should reject with RTN_ERR details when error response received', async () => {
      const command: SendCommand = {
        Type: 'POST_LOGIN',
        From: 'UI',
        To: 'SERV',
        Data: {
          Email: 'bad@example.com',
          Password: 'wrong',
        },
      };

      const promise = client.sendCommand(command);

      // Verify command sent
      expect(sendFn).toHaveBeenCalledTimes(1);
      expect(client.getPendingCount()).toBe(1);

      // Simulate error response - FIFO matching (no CorrelationId)
      const errorResponse: ReturnErrorResponse = {
        Type: 'RTN_ERR',
        From: 'SERV',
        Target: 'UI',
        CorrelationId: undefined as any, // Gateway doesn't return CorrelationId
        Data: {
          Attempt: 'POST_LOGIN',
          Error: 'Invalid credentials',
        },
      };

      client.handleResponse(errorResponse);

      // Should reject with error containing Attempt and Error fields
      await expect(promise).rejects.toThrow(/Invalid credentials/);
      await expect(promise).rejects.toThrow(/POST_LOGIN/);
    });

    it('should reject immediately when sendFn returns false', async () => {
      const failingSendFn = vi.fn((message: string) => false);
      const failingClient = new CommandClient(failingSendFn as any, 1000);

      const command: SendCommand = {
        Type: 'POST_LOGIN',
        From: 'UI',
        To: 'SERV',
        Data: {
          Email: 'test@example.com',
          Password: 'password123',
        },
      };

      await expect(failingClient.sendCommand(command)).rejects.toThrow(/Connection not available/i);

      failingClient.cleanup();
    });
  });

  describe('handleResponse', () => {
    it('should log warning and not throw when CorrelationId not found', () => {
      const unknownResponse: ResponseMessage = {
        Type: 'RTN_DYN',
        From: 'SERV',
        Target: 'UI',
        CorrelationId: '00000000-0000-0000-0000-000000000000',
        Data: { unknown: true },
      };

      // Should not throw
      expect(() => {
        client.handleResponse(unknownResponse);
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should reject all pending requests with shutdown error', async () => {
      const command1: SendCommand = {
        Type: 'POST_LOGIN',
        From: 'UI',
        To: 'SERV',
        Data: { Email: 'test1@example.com', Password: 'pass1' },
      };

      const command2: SendCommand = {
        Type: 'GET_DYN_CONNECTED',
        From: 'UI',
        To: 'SERV',
        Data: {},
      };

      const promise1 = client.sendCommand(command1);
      const promise2 = client.sendCommand(command2);

      // Verify 2 pending requests
      expect(client.getPendingCount()).toBe(2);

      // Cleanup
      client.cleanup();

      // Both should reject
      await expect(promise1).rejects.toThrow(/shutting down/i);
      await expect(promise2).rejects.toThrow(/shutting down/i);

      // No pending requests remain
      expect(client.getPendingCount()).toBe(0);
    });
  });

  describe('race condition handling', () => {
    it('should handle timeout firing before response arrives', async () => {
      const command: SendCommand = {
        Type: 'GET_DYN_CONNECTED',
        From: 'UI',
        To: 'SERV',
        Data: {},
      };

      const promise = client.sendCommand(command, 100); // 100ms timeout

      // Verify command sent
      expect(sendFn).toHaveBeenCalledTimes(1);

      // Wait for timeout to fire
      await expect(promise).rejects.toThrow(/timeout/i);

      // Now try to handle response (arrives late, after timeout)
      const lateResponse: ResponseMessage = {
        Type: 'RTN_DYN',
        From: 'SERV',
        Target: 'UI',
        CorrelationId: undefined as any, // Gateway doesn't return CorrelationId
        Data: { sensors: [] },
      };

      // Should log warning and not crash (no pending entry found)
      expect(() => {
        client.handleResponse(lateResponse);
      }).not.toThrow();
    });
  });
});
