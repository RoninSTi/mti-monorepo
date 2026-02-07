import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CommandClient } from './command-client';
import type { SendCommand, ResponseMessage, ReturnErrorResponse } from '../types/messages';

describe('CommandClient', () => {
  let sendFn: ReturnType<typeof mock.fn>;
  let client: CommandClient;

  beforeEach(() => {
    sendFn = mock.fn((message: string) => true);
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
      assert.equal(sendFn.mock.calls.length, 1);
      const sentMessage = sendFn.mock.calls[0].arguments[0];
      const sentCommand = JSON.parse(sentMessage);

      // Verify correlation ID was injected
      assert.ok(sentCommand.CorrelationId);
      assert.match(sentCommand.CorrelationId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

      // Simulate response
      const response: ResponseMessage = {
        Type: 'RTN_DYN',
        From: 'SERV',
        Target: 'UI',
        CorrelationId: sentCommand.CorrelationId,
        Data: { success: true, token: 'abc123' },
      };

      client.handleResponse(response);

      // Should resolve with response data
      const result = await promise;
      assert.deepEqual(result, { success: true, token: 'abc123' });
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
      await assert.rejects(
        promise,
        (error: Error) => {
          assert.match(error.message, /timeout/i);
          return true;
        }
      );

      // Verify no pending requests remain (cleanup)
      assert.equal(client.getPendingCount(), 0);
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

      // Get the correlation ID
      const sentMessage = sendFn.mock.calls[0].arguments[0];
      const sentCommand = JSON.parse(sentMessage);

      // Simulate error response
      const errorResponse: ReturnErrorResponse = {
        Type: 'RTN_ERR',
        From: 'SERV',
        Target: 'UI',
        CorrelationId: sentCommand.CorrelationId,
        Data: {
          Attempt: 'POST_LOGIN',
          Error: 'Invalid credentials',
        },
      };

      client.handleResponse(errorResponse);

      // Should reject with error containing Attempt and Error fields
      await assert.rejects(
        promise,
        (error: Error) => {
          assert.match(error.message, /Invalid credentials/);
          assert.match(error.message, /POST_LOGIN/);
          return true;
        }
      );
    });

    it('should reject immediately when sendFn returns false', async () => {
      const failingSendFn = mock.fn((message: string) => false);
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

      await assert.rejects(
        failingClient.sendCommand(command),
        (error: Error) => {
          assert.match(error.message, /Connection not available/i);
          return true;
        }
      );

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
      assert.doesNotThrow(() => {
        client.handleResponse(unknownResponse);
      });
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
      assert.equal(client.getPendingCount(), 2);

      // Cleanup
      client.cleanup();

      // Both should reject
      await assert.rejects(
        promise1,
        (error: Error) => {
          assert.match(error.message, /shutting down/i);
          return true;
        }
      );

      await assert.rejects(
        promise2,
        (error: Error) => {
          assert.match(error.message, /shutting down/i);
          return true;
        }
      );

      // No pending requests remain
      assert.equal(client.getPendingCount(), 0);
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

      // Get correlation ID
      const sentMessage = sendFn.mock.calls[0].arguments[0];
      const sentCommand = JSON.parse(sentMessage);

      // Wait for timeout to fire
      await assert.rejects(promise, /timeout/i);

      // Now try to handle response (arrives late)
      const lateResponse: ResponseMessage = {
        Type: 'RTN_DYN',
        From: 'SERV',
        Target: 'UI',
        CorrelationId: sentCommand.CorrelationId,
        Data: { sensors: [] },
      };

      // Should log warning and not crash (no pending entry found)
      assert.doesNotThrow(() => {
        client.handleResponse(lateResponse);
      });
    });
  });
});
