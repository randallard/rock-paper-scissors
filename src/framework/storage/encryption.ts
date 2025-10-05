/**
 * @fileoverview Simplified encryption utilities for game state
 * @module framework/storage/encryption
 */

import CryptoJS from 'crypto-js';
import LZString from 'lz-string';
import { GAME_SECRET } from '../../shared/utils/constants';

/**
 * Encrypts game state for URL sharing
 */
export function encryptGameState(gameState: unknown): string {
  try {
    const json = JSON.stringify(gameState);
    const compressed = LZString.compressToEncodedURIComponent(json);
    const encrypted = CryptoJS.AES.encrypt(compressed, GAME_SECRET).toString();
    const encoded = btoa(encrypted);
    return encoded;
  } catch (error) {
    throw new Error('Failed to encrypt game state');
  }
}

/**
 * Decrypts game state from URL parameter
 */
export function decryptGameState(encoded: string): unknown {
  try {
    const encrypted = atob(encoded);
    const decrypted = CryptoJS.AES.decrypt(encrypted, GAME_SECRET).toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new Error('Decryption produced empty result');
    }

    const json = LZString.decompressFromEncodedURIComponent(decrypted);

    if (!json) {
      throw new Error('Decompression produced empty result');
    }

    return JSON.parse(json);
  } catch (error) {
    throw new Error('Failed to decrypt game state');
  }
}
