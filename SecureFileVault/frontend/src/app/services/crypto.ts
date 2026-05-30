import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {

  constructor() { }

  private async getMaterial(password: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    return window.crypto.subtle.importKey(
      "raw", 
      enc.encode(password), 
      { name: "PBKDF2" }, 
      false, 
      ["deriveBits", "deriveKey"]
    );
  }

  async deriveKeys(password: string): Promise<{ authToken: string, encKey: CryptoKey, hmacKey: CryptoKey }> {
    const argon2 = (window as any).argon2;
    // Auth Token via Argon2
    const authRes = await argon2.hash({
      pass: password,
      salt: 'SecureFileVaultAuthSalt123', // Must be at least 8 bytes
      time: 2,
      mem: 16384,
      hashLen: 32,
      type: argon2.ArgonType.Argon2id
    });
    const authToken = authRes.hashHex;

    // Master Encryption Key via Argon2
    const encRes = await argon2.hash({
      pass: password,
      salt: 'SecureFileVaultEncSalt456',
      time: 2,
      mem: 16384,
      hashLen: 32,
      type: argon2.ArgonType.Argon2id
    });
    
    // Import raw bytes into CryptoKey
    const masterEncKey = await window.crypto.subtle.importKey(
      "raw",
      encRes.hash,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const hmacKey = await window.crypto.subtle.importKey(
      "raw",
      encRes.hash,
      { name: "HMAC", hash: "SHA-256" },
      true,
      ["sign"]
    );

    return { authToken, encKey: masterEncKey, hmacKey };
  }

  async generateKekAndAuthToken(password: string): Promise<{ kek: CryptoKey, authToken: string }> {
    const argon2 = (window as any).argon2;
    // Auth Token via Argon2
    const authRes = await argon2.hash({
      pass: password,
      salt: 'SecureFileVaultAuthSalt123',
      time: 2,
      mem: 16384,
      hashLen: 32,
      type: argon2.ArgonType.Argon2id
    });
    const authToken = authRes.hashHex;

    // Key Encryption Key (KEK) via Argon2 with separate salt
    const kekRes = await argon2.hash({
      pass: password,
      salt: 'SecureFileVaultKekSalt789',
      time: 2,
      mem: 16384,
      hashLen: 32,
      type: argon2.ArgonType.Argon2id
    });

    const kek = await window.crypto.subtle.importKey(
      "raw",
      kekRes.hash,
      { name: "AES-GCM", length: 256 },
      false,
      ["wrapKey", "unwrapKey"]
    );

    return { kek, authToken };
  }

  async generateAndWrapMasterKey(kek: CryptoKey): Promise<{ encryptedMasterKey: string, masterKeyIV: string, masterEncKey: CryptoKey, hmacKey: CryptoKey }> {
    // 1. Generate truly random master key bytes
    const masterKeyBytes = window.crypto.getRandomValues(new Uint8Array(32));

    // 2. Import as AES-GCM key for file encryption
    const masterEncKey = await window.crypto.subtle.importKey(
      "raw",
      masterKeyBytes,
      { name: "AES-GCM", length: 256 },
      true, // must be extractable for wrapKey/exportKey
      ["encrypt", "decrypt"]
    );

    // 3. Import as HMAC key for blind indexing
    const hmacKey = await window.crypto.subtle.importKey(
      "raw",
      masterKeyBytes,
      { name: "HMAC", hash: "SHA-256" },
      true,
      ["sign"]
    );

    // 4. Generate random IV for key wrapping
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 5. Wrap the Master Key with the KEK
    const wrappedKeyBuffer = await window.crypto.subtle.wrapKey(
      "raw",
      masterEncKey,
      kek,
      { name: "AES-GCM", iv }
    );

    return {
      encryptedMasterKey: this.buf2hex(wrappedKeyBuffer),
      masterKeyIV: this.buf2hex(iv),
      masterEncKey,
      hmacKey
    };
  }

  async unwrapMasterKey(kek: CryptoKey, encryptedMasterKeyHex: string, masterKeyIVHex: string): Promise<{ masterEncKey: CryptoKey, hmacKey: CryptoKey }> {
    const wrappedKeyBuffer = this.hex2buf(encryptedMasterKeyHex) as any;
    const iv = this.hex2buf(masterKeyIVHex) as any;

    // 1. Unwrap the AES-GCM master key
    const masterEncKey = await window.crypto.subtle.unwrapKey(
      "raw",
      wrappedKeyBuffer,
      kek,
      { name: "AES-GCM", iv },
      { name: "AES-GCM", length: 256 },
      true, // must be extractable for HMAC import & sharing
      ["encrypt", "decrypt"]
    );

    // 2. Export raw bytes to derive HMAC key
    const rawMasterKey = await window.crypto.subtle.exportKey("raw", masterEncKey);

    // 3. Import as HMAC key
    const hmacKey = await window.crypto.subtle.importKey(
      "raw",
      rawMasterKey,
      { name: "HMAC", hash: "SHA-256" },
      true,
      ["sign"]
    );

    return { masterEncKey, hmacKey };
  }

  async generateBlindIndex(filename: string, key: CryptoKey): Promise<string> {
    const enc = new TextEncoder();
    const data = enc.encode(filename.toLowerCase());
    const signature = await window.crypto.subtle.sign("HMAC", key, data);
    return this.buf2hex(signature);
  }

  async encryptFile(file: File, key: CryptoKey): Promise<{ ciphertextBlob: Blob, iv: string, salt: string }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const saltStr = window.crypto.randomUUID(); 

    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const numChunks = Math.ceil(file.size / CHUNK_SIZE);
    const encryptedChunks: Blob[] = [];

    for (let i = 0; i < numChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBuffer = await file.slice(start, end).arrayBuffer();

        const chunkIv = new Uint8Array(iv);
        chunkIv[11] ^= i; // Simple increment for chunk IV

        const ciphertextChunk = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: chunkIv },
            key,
            chunkBuffer
        );
        encryptedChunks.push(new Blob([ciphertextChunk]));
    }

    return {
      ciphertextBlob: new Blob(encryptedChunks),
      iv: this.buf2hex(iv),
      salt: saltStr
    };
  }

  async decryptFile(ciphertextBlob: Blob, ivHex: string, key: CryptoKey): Promise<Blob> {
    const iv = this.hex2buf(ivHex);
    // AES-GCM adds a 16-byte auth tag to each encrypted chunk!
    // Original chunk: 5MB. Encrypted chunk: 5MB + 16 bytes.
    const ENCRYPTED_CHUNK_SIZE = (5 * 1024 * 1024) + 16; 
    const numChunks = Math.ceil(ciphertextBlob.size / ENCRYPTED_CHUNK_SIZE);
    const decryptedChunks: Blob[] = [];

    for (let i = 0; i < numChunks; i++) {
        const start = i * ENCRYPTED_CHUNK_SIZE;
        const end = Math.min(start + ENCRYPTED_CHUNK_SIZE, ciphertextBlob.size);
        const chunkBuffer = await ciphertextBlob.slice(start, end).arrayBuffer();

        const chunkIv = new Uint8Array(iv);
        chunkIv[11] ^= i;

        const plaintextChunk = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: chunkIv as any },
            key,
            chunkBuffer
        );
        decryptedChunks.push(new Blob([plaintextChunk]));
    }

    return new Blob(decryptedChunks);
  }

  private buf2hex(buffer: ArrayBuffer | Uint8Array): string {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
  }

  private hex2buf(hexString: string): Uint8Array {
    const result = [];
    for (let i = 0; i < hexString.length; i += 2) {
      result.push(parseInt(hexString.substr(i, 2), 16));
    }
    return new Uint8Array(result);
  }

  private base64ToArrayBuffer(base64: string) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
