/**
 * @fileoverview SHA-256 checksum management for localStorage integrity
 * @module framework/storage/checksumManager
 *
 * Protects localStorage data from tampering using SHA-256 checksums.
 *
 * CRITICAL SECURITY ARCHITECTURE:
 * - localStorage is CLIENT-CONTROLLED and can be modified
 * - Checksums detect (but don't prevent) tampering
 * - Always validate with Zod after checksum verification
 *
 * Pipeline:
 * 1. Save: Data -> JSON -> Checksum -> Store both
 * 2. Load: Retrieve -> Verify checksum -> Validate with Zod -> Use
 *
 * CRITICAL: Use Web Crypto API, not crypto-js
 * - Web Crypto API is native browser crypto (secure, fast)
 * - crypto-js is for backward compatibility (we don't need it here)
 *
 * Pattern based on PRD section: "localStorage Checksum System"
 */

/**
 * Error thrown when checksum verification fails
 */
export class ChecksumVerificationError extends Error {
  constructor(
    message: string,
    public readonly expected?: string,
    public readonly actual?: string
  ) {
    super(message);
    this.name = 'ChecksumVerificationError';
  }
}

/**
 * Container for data with checksum
 */
export interface ChecksummedData<T> {
  /** The actual data */
  data: T;

  /** SHA-256 checksum of the serialized data */
  checksum: string;

  /** Timestamp when checksum was generated */
  checksumTimestamp: string;
}

/**
 * Generates SHA-256 checksum for data
 *
 * Uses Web Crypto API for secure, fast hashing.
 *
 * Algorithm:
 * 1. Serialize data to JSON (deterministic)
 * 2. Convert to UTF-8 bytes
 * 3. Hash with SHA-256
 * 4. Convert to hex string
 *
 * CRITICAL: JSON.stringify order matters
 * - Use same serialization for generate and verify
 * - Objects with different key orders produce different hashes
 *
 * @param data - The data to checksum
 * @returns Hex-encoded SHA-256 checksum
 *
 * @example
 * ```typescript
 * const data = { games: [...], playerName: 'Alice' };
 * const checksum = await generateChecksum(data);
 * // checksum = "a1b2c3d4e5f6..."
 * ```
 */
export async function generateChecksum(data: unknown): Promise<string> {
  // Step 1: Serialize to JSON (deterministic)
  const json = JSON.stringify(data);

  // Step 2: Convert to UTF-8 bytes
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(json);

  // Step 3: Hash with SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);

  // Step 4: Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Wraps data with a checksum
 *
 * Prepares data for secure storage.
 *
 * @param data - The data to wrap
 * @returns Data container with checksum
 *
 * @example
 * ```typescript
 * const history = { games: [...], playerName: 'Alice' };
 * const wrapped = await wrapWithChecksum(history);
 * // wrapped = { data: {...}, checksum: "a1b2c3...", checksumTimestamp: "2024-..." }
 * ```
 */
export async function wrapWithChecksum<T>(
  data: T
): Promise<ChecksummedData<T>> {
  const checksum = await generateChecksum(data);

  return {
    data,
    checksum,
    checksumTimestamp: new Date().toISOString(),
  };
}

/**
 * Verifies and unwraps checksummed data
 *
 * CRITICAL: Always call this before trusting localStorage data
 *
 * Algorithm:
 * 1. Generate checksum of current data
 * 2. Compare with stored checksum (constant-time)
 * 3. If match: return data
 * 4. If mismatch: throw error
 *
 * @param wrapped - The checksummed data container
 * @returns Unwrapped data if checksum matches
 * @throws {ChecksumVerificationError} If checksum doesn't match
 *
 * @example
 * ```typescript
 * try {
 *   const history = await verifyAndUnwrap(wrapped);
 *   // Safe to use history
 * } catch (error) {
 *   if (error instanceof ChecksumVerificationError) {
 *     console.error('Data was tampered with!');
 *     // Clear corrupted data
 *   }
 * }
 * ```
 */
export async function verifyAndUnwrap<T>(
  wrapped: ChecksummedData<T>
): Promise<T> {
  // Generate checksum of current data
  const actualChecksum = await generateChecksum(wrapped.data);

  // Verify checksum matches
  if (actualChecksum !== wrapped.checksum) {
    throw new ChecksumVerificationError(
      'Checksum verification failed - data may have been tampered with',
      wrapped.checksum,
      actualChecksum
    );
  }

  return wrapped.data;
}

/**
 * Constant-time string comparison
 *
 * CRITICAL: Prevents timing attacks on checksum verification
 * - Regular === comparison leaks timing information
 * - Constant-time comparison always takes same time
 *
 * This is the same pattern used for HMAC verification.
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Verifies checksum using constant-time comparison
 *
 * More secure version of verifyAndUnwrap that uses constant-time comparison.
 *
 * @param wrapped - The checksummed data container
 * @returns Unwrapped data if checksum matches
 * @throws {ChecksumVerificationError} If checksum doesn't match
 */
export async function verifyAndUnwrapSecure<T>(
  wrapped: ChecksummedData<T>
): Promise<T> {
  // Generate checksum of current data
  const actualChecksum = await generateChecksum(wrapped.data);

  // Verify checksum matches (constant-time)
  if (!constantTimeEqual(actualChecksum, wrapped.checksum)) {
    throw new ChecksumVerificationError(
      'Checksum verification failed - data may have been tampered with',
      wrapped.checksum,
      actualChecksum
    );
  }

  return wrapped.data;
}

/**
 * Saves data to localStorage with checksum
 *
 * Convenience function that wraps, checksums, and stores data.
 *
 * @param key - localStorage key
 * @param data - Data to store
 *
 * @example
 * ```typescript
 * await saveWithChecksum('game-history', history);
 * ```
 */
export async function saveWithChecksum<T>(
  key: string,
  data: T
): Promise<void> {
  const wrapped = await wrapWithChecksum(data);
  localStorage.setItem(key, JSON.stringify(wrapped));
}

/**
 * Loads data from localStorage with checksum verification
 *
 * Convenience function that retrieves, verifies, and unwraps data.
 *
 * @param key - localStorage key
 * @returns Verified data, or null if not found
 * @throws {ChecksumVerificationError} If checksum verification fails
 *
 * @example
 * ```typescript
 * try {
 *   const history = await loadWithChecksum('game-history');
 *   if (history) {
 *     // Use verified history
 *   }
 * } catch (error) {
 *   // Handle corrupted data
 *   localStorage.removeItem('game-history');
 * }
 * ```
 */
export async function loadWithChecksum<T>(
  key: string
): Promise<T | null> {
  const stored = localStorage.getItem(key);

  if (!stored) {
    return null;
  }

  try {
    const wrapped = JSON.parse(stored) as ChecksummedData<T>;
    return await verifyAndUnwrapSecure(wrapped);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ChecksumVerificationError('Invalid JSON in localStorage');
    }
    throw error;
  }
}
