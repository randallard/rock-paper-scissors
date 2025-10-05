/**
 * @fileoverview HMAC-SHA256 signature generation and verification for URLs
 * @module framework/storage/hmacManager
 *
 * Provides INTEGRITY protection for URL-encoded game state.
 *
 * CRITICAL SECURITY ARCHITECTURE:
 * - Encryption (AES-256) provides CONFIDENTIALITY (URLs are unreadable)
 * - HMAC (SHA-256) provides INTEGRITY (tampering is detected)
 * - BOTH are required - encryption alone does NOT prevent tampering
 *
 * Attack scenario without HMAC:
 * 1. User gets encrypted URL
 * 2. User modifies encrypted bytes (random changes)
 * 3. Decryption fails OR succeeds with corrupted data
 * 4. If decryption succeeds, Zod validation might catch some issues
 * 5. But subtle changes (like scores) might pass validation
 *
 * Defense with HMAC:
 * 1. URL = Encrypted Data + HMAC(Encrypted Data)
 * 2. Verify HMAC before decryption
 * 3. If HMAC invalid, reject immediately (no decryption attempt)
 * 4. Prevents all tampering attacks
 *
 * Pattern from PRD: "DeltaURLGenerator - URL Encoding with HMAC"
 */

import CryptoJS from 'crypto-js';
import { GAME_SECRET } from '../../shared/utils/constants';

/**
 * Error thrown when HMAC operations fail
 */
export class HMACError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'HMACError';
  }
}

/**
 * Container for data with HMAC signature
 */
export interface SignedData {
  /** The actual data (encrypted) */
  data: string;

  /** HMAC-SHA256 signature of the data */
  signature: string;
}

/**
 * Generates HMAC-SHA256 signature for data
 *
 * Uses crypto-js for consistency with existing encryption code.
 *
 * CRITICAL: Uses same secret as AES encryption (GAME_SECRET)
 * - Single secret for both encryption and MAC
 * - This is acceptable for this use case
 * - Production systems might use separate keys
 *
 * @param data - The data to sign (typically encrypted string)
 * @returns Hex-encoded HMAC signature
 *
 * @example
 * ```typescript
 * const encrypted = "a1b2c3d4...";
 * const signature = generateHMAC(encrypted);
 * // signature = "f7e8d9c0..."
 * ```
 */
export function generateHMAC(data: string): string {
  try {
    // Generate HMAC-SHA256
    const hmac = CryptoJS.HmacSHA256(data, GAME_SECRET);

    // Convert to hex string
    return hmac.toString(CryptoJS.enc.Hex);
  } catch (error) {
    throw new HMACError('Failed to generate HMAC signature', error);
  }
}

/**
 * Verifies HMAC signature using constant-time comparison
 *
 * CRITICAL: Constant-time comparison prevents timing attacks
 * - Regular === comparison leaks timing information
 * - Attacker could use timing to forge signatures
 * - Constant-time comparison always takes same time
 *
 * Pattern from encryption.ts comments (lines 8-17)
 *
 * @param data - The data that was signed
 * @param signature - The claimed signature
 * @returns True if signature is valid
 *
 * @example
 * ```typescript
 * const isValid = verifyHMAC(encrypted, signature);
 * if (!isValid) {
 *   throw new Error('Tampered data detected!');
 * }
 * ```
 */
export function verifyHMAC(data: string, signature: string): boolean {
  try {
    // Generate expected signature
    const expected = generateHMAC(data);

    // Constant-time comparison (NEVER use === for crypto)
    if (signature.length !== expected.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
    }

    return result === 0;
  } catch {
    // If HMAC generation fails, signature is invalid
    return false;
  }
}

/**
 * Signs data with HMAC
 *
 * Wraps data with its signature for secure transmission.
 *
 * @param data - The data to sign (typically encrypted string)
 * @returns Signed data container
 *
 * @example
 * ```typescript
 * const encrypted = encryptGameState(gameState);
 * const signed = signData(encrypted);
 * const url = `?s=${signed.data}&sig=${signed.signature}`;
 * ```
 */
export function signData(data: string): SignedData {
  const signature = generateHMAC(data);
  return { data, signature };
}

/**
 * Verifies and extracts signed data
 *
 * CRITICAL: Always call this before decryption
 *
 * @param signed - The signed data container
 * @returns Original data if signature is valid
 * @throws {HMACError} If signature verification fails
 *
 * @example
 * ```typescript
 * try {
 *   const encrypted = verifySignedData({ data, signature });
 *   const gameState = decryptGameState(encrypted);
 * } catch (error) {
 *   if (error instanceof HMACError) {
 *     // Handle tampered URL
 *   }
 * }
 * ```
 */
export function verifySignedData(signed: SignedData): string {
  if (!verifyHMAC(signed.data, signed.signature)) {
    throw new HMACError('HMAC signature verification failed - data may have been tampered with');
  }
  return signed.data;
}

/**
 * Encodes signed data as URL-safe string
 *
 * Format: data.signature (both base64-encoded)
 *
 * @param signed - The signed data
 * @returns URL-safe encoded string
 */
export function encodeSignedData(signed: SignedData): string {
  return `${signed.data}.${signed.signature}`;
}

/**
 * Decodes and verifies URL-encoded signed data
 *
 * @param encoded - URL-safe encoded string
 * @returns Verified data
 * @throws {HMACError} If format is invalid or signature verification fails
 *
 * @example
 * ```typescript
 * const urlParam = new URLSearchParams(window.location.search).get('s');
 * if (urlParam) {
 *   const encrypted = decodeSignedData(urlParam);
 *   const gameState = decryptGameState(encrypted);
 * }
 * ```
 */
export function decodeSignedData(encoded: string): string {
  // Split on last '.' to handle base64 padding
  const lastDotIndex = encoded.lastIndexOf('.');

  if (lastDotIndex === -1) {
    throw new HMACError('Invalid signed data format - missing signature separator');
  }

  const data = encoded.substring(0, lastDotIndex);
  const signature = encoded.substring(lastDotIndex + 1);

  if (!data || !signature) {
    throw new HMACError('Invalid signed data format - empty data or signature');
  }

  return verifySignedData({ data, signature });
}
