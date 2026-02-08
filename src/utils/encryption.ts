import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits - recommended for GCM
const KEY_LENGTH = 32; // 256 bits

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt plaintext using AES-256-GCM
 * Generates unique IV for each encryption (CRITICAL for security)
 */
export function encryptPassword(plaintext: string, key: Buffer): EncryptedData {
  if (!plaintext) {
    throw new Error('Plaintext cannot be empty');
  }
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes`);
  }

  // Generate unique IV for THIS encryption (CRITICAL: never reuse IV)
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Get authentication tag for integrity verification
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * Verifies authentication tag to detect tampering
 */
export function decryptPassword(data: EncryptedData, key: Buffer): string {
  if (!data.encrypted || !data.iv || !data.authTag) {
    throw new Error('Invalid encrypted data structure');
  }
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes`);
  }

  const iv = Buffer.from(data.iv, 'base64');
  const authTag = Buffer.from(data.authTag, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(data.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Load encryption key from environment variable
 * Key should be 32-byte (256-bit) value encoded as base64
 * Generate with: openssl rand -base64 32
 */
export function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable not set. ' +
      'Generate with: openssl rand -base64 32'
    );
  }

  // Validate base64 format before decoding
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(key)) {
    throw new Error('ENCRYPTION_KEY must be valid base64');
  }

  const keyBuffer = Buffer.from(key, 'base64');

  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (base64 encoded). ` +
      `Got ${keyBuffer.length} bytes. ` +
      'Generate with: openssl rand -base64 32'
    );
  }

  return keyBuffer;
}

/**
 * Test encryption/decryption round-trip
 * Use in integration tests or startup validation
 */
export function testEncryptionRoundTrip(key: Buffer): boolean {
  const testData = 'test-password-' + Date.now();
  const encrypted = encryptPassword(testData, key);
  const decrypted = decryptPassword(encrypted, key);
  return decrypted === testData;
}
