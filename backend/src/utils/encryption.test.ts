import { describe, it, expect, beforeAll } from 'vitest';
import {
  encryptPassword,
  decryptPassword,
  getEncryptionKey,
  testEncryptionRoundTrip,
  EncryptedData,
} from './encryption';

describe('Encryption Utilities', () => {
  let validKey: Buffer;

  beforeAll(() => {
    // Set up test encryption key (32 bytes base64 encoded)
    process.env.ENCRYPTION_KEY = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64');
    validKey = Buffer.from('0123456789abcdef0123456789abcdef');
  });

  describe('getEncryptionKey', () => {
    it('should load and validate key from ENCRYPTION_KEY env var', () => {
      const key = getEncryptionKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('should throw error when ENCRYPTION_KEY is not set', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => getEncryptionKey()).toThrow('ENCRYPTION_KEY environment variable not set');

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should throw error when ENCRYPTION_KEY is not valid base64', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'not-valid-base64!!!';

      expect(() => getEncryptionKey()).toThrow('ENCRYPTION_KEY must be valid base64');

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should throw error when ENCRYPTION_KEY has wrong length', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      // 16 bytes instead of 32
      process.env.ENCRYPTION_KEY = Buffer.from('0123456789abcdef').toString('base64');

      expect(() => getEncryptionKey()).toThrow('ENCRYPTION_KEY must be 32 bytes');

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('encryptPassword', () => {
    it('should encrypt plaintext and return EncryptedData with all fields', () => {
      const plaintext = 'password123';
      const result = encryptPassword(plaintext, validKey);

      expect(result).toHaveProperty('encrypted');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(typeof result.encrypted).toBe('string');
      expect(typeof result.iv).toBe('string');
      expect(typeof result.authTag).toBe('string');
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'password123';
      const result1 = encryptPassword(plaintext, validKey);
      const result2 = encryptPassword(plaintext, validKey);

      // IV should be different
      expect(result1.iv).not.toBe(result2.iv);
      // Encrypted data should be different
      expect(result1.encrypted).not.toBe(result2.encrypted);
      // Auth tags will also differ due to different IVs
      expect(result1.authTag).not.toBe(result2.authTag);
    });

    it('should throw error for empty plaintext', () => {
      expect(() => encryptPassword('', validKey)).toThrow('Plaintext cannot be empty');
    });

    it('should throw error for invalid key length', () => {
      const wrongKey = Buffer.from('tooshort');
      expect(() => encryptPassword('password123', wrongKey)).toThrow('Key must be 32 bytes');
    });
  });

  describe('decryptPassword', () => {
    it('should decrypt EncryptedData back to original plaintext', () => {
      const plaintext = 'password123';
      const encrypted = encryptPassword(plaintext, validKey);
      const decrypted = decryptPassword(encrypted, validKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should work with UTF-8 strings', () => {
      const plaintext = 'pāsswörd123™';
      const encrypted = encryptPassword(plaintext, validKey);
      const decrypted = decryptPassword(encrypted, validKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error when encrypted field is modified (tampering)', () => {
      const plaintext = 'password123';
      const encrypted = encryptPassword(plaintext, validKey);

      // Tamper with encrypted data
      const tampered: EncryptedData = {
        ...encrypted,
        encrypted: encrypted.encrypted.slice(0, -1) + 'X',
      };

      expect(() => decryptPassword(tampered, validKey)).toThrow();
    });

    it('should throw error when authTag is modified', () => {
      const plaintext = 'password123';
      const encrypted = encryptPassword(plaintext, validKey);

      // Tamper with auth tag - flip a byte in the decoded buffer
      const authTagBuffer = Buffer.from(encrypted.authTag, 'base64');
      authTagBuffer[0] = authTagBuffer[0] ^ 0xFF; // Flip all bits in first byte

      const tampered: EncryptedData = {
        ...encrypted,
        authTag: authTagBuffer.toString('base64'),
      };

      expect(() => decryptPassword(tampered, validKey)).toThrow();
    });

    it('should throw error with wrong decryption key', () => {
      const plaintext = 'password123';
      const encrypted = encryptPassword(plaintext, validKey);

      const wrongKey = Buffer.from('fedcba9876543210fedcba9876543210');

      expect(() => decryptPassword(encrypted, wrongKey)).toThrow();
    });

    it('should throw error for invalid EncryptedData structure', () => {
      const invalid = {
        encrypted: 'somedata',
        iv: 'someiv',
        // missing authTag
      } as EncryptedData;

      expect(() => decryptPassword(invalid, validKey)).toThrow('Invalid encrypted data structure');
    });

    it('should throw error for missing encrypted field', () => {
      const invalid = {
        encrypted: '',
        iv: 'someiv',
        authTag: 'sometag',
      };

      expect(() => decryptPassword(invalid, validKey)).toThrow('Invalid encrypted data structure');
    });
  });

  describe('testEncryptionRoundTrip', () => {
    it('should return true for valid key', () => {
      const result = testEncryptionRoundTrip(validKey);
      expect(result).toBe(true);
    });

    it('should throw for invalid key', () => {
      const invalidKey = Buffer.from('tooshort');
      expect(() => testEncryptionRoundTrip(invalidKey)).toThrow();
    });
  });

  describe('Round-trip integration', () => {
    it('should encrypt and decrypt multiple different passwords', () => {
      const passwords = [
        'simple',
        'complex-P@ssw0rd!',
        'with spaces and symbols #$%',
        '日本語パスワード',
        '🔒🔐🗝️',
      ];

      passwords.forEach((password) => {
        const encrypted = encryptPassword(password, validKey);
        const decrypted = decryptPassword(encrypted, validKey);
        expect(decrypted).toBe(password);
      });
    });
  });
});
