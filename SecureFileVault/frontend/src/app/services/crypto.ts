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

  // Derive keys from passphrase
  // Returns: [AuthToken (sent to server), EncryptionKey (kept local)]
  async deriveKeys(password: string): Promise<{ authToken: string, encKey: CryptoKey }> {
    const material = await this.getMaterial(password);
    
    // Use a fixed salt for auth token derivation
    const authSalt = new TextEncoder().encode("SecureFileVaultAuthSalt");
    
    const authTokenBits = await window.crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: authSalt,
        iterations: 100000,
        hash: "SHA-256"
      },
      material,
      256
    );

    const authToken = this.buf2hex(authTokenBits);

    // Dynamic salt for encryption key is better, but since it's password based we use a different fixed salt for the encryption key,
    // OR we derive a master encryption key, and then random salt per file. We will use a random salt per file.
    const masterEncKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: new TextEncoder().encode("SecureFileVaultEncSalt"),
        iterations: 100000,
        hash: "SHA-256"
      },
      material,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    return { authToken, encKey: masterEncKey };
  }

  async encryptFile(file: File, key: CryptoKey): Promise<{ ciphertext: ArrayBuffer, iv: string, salt: string }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    // In AES-GCM, salt is often conceptually the IV, but we just use IV. We'll generate a dummy salt string just for the API contract if needed, or just return iv.
    const saltStr = window.crypto.randomUUID(); 

    const fileBuffer = await file.arrayBuffer();
    
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      fileBuffer
    );

    return {
      ciphertext,
      iv: this.buf2hex(iv),
      salt: saltStr
    };
  }

  async decryptFile(ciphertextBase64: string, ivHex: string, key: CryptoKey): Promise<ArrayBuffer> {
    const ciphertext = this.base64ToArrayBuffer(ciphertextBase64);
    const iv = this.hex2buf(ivHex);

    const plaintext = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as any
      },
      key,
      ciphertext
    );

    return plaintext;
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
