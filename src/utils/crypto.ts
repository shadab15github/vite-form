export class CryptoUtils {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly STORAGE_KEY = 'notes_crypto_key';
  private static key: CryptoKey | null = null;

  private static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true, // Make key extractable so we can store it
      ['encrypt', 'decrypt']
    );
  }

  private static async getKey(): Promise<CryptoKey> {
    if (!this.key) {
      // Try to load existing key from localStorage
      const storedKey = localStorage.getItem(this.STORAGE_KEY);
      if (storedKey) {
        try {
          const keyData = JSON.parse(storedKey);
          this.key = await crypto.subtle.importKey(
            'jwk',
            keyData,
            { name: this.ALGORITHM },
            true,
            ['encrypt', 'decrypt']
          );
        } catch (error) {
          console.warn('Failed to load stored key, generating new one:', error);
          this.key = await this.generateAndStoreKey();
        }
      } else {
        this.key = await this.generateAndStoreKey();
      }
    }
    return this.key;
  }

  private static async generateAndStoreKey(): Promise<CryptoKey> {
    const key = await this.generateKey();
    try {
      const exportedKey = await crypto.subtle.exportKey('jwk', key);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(exportedKey));
    } catch (error) {
      console.warn('Failed to store key:', error);
    }
    return key;
  }

  static async encrypt(data: string): Promise<string> {
    try {
      const key = await this.getKey();
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      const encodedData = new TextEncoder().encode(data);

      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        encodedData
      );

      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);

      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  static async decrypt(data: string): Promise<string> {
    // Quick check for obviously non-encrypted data (contains spaces or special chars that aren't base64)
    if (data.includes(' ') || data.includes('\n') || data.includes('\t')) {
      return data;
    }

    // Check if data looks like base64 encoded encrypted data
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    
    // If it doesn't look like base64 or is too short to be encrypted, return as-is (plain text)
    if (!base64Regex.test(data) || data.length < 20) {
      return data;
    }

    try {
      const key = await this.getKey();
      const combined = new Uint8Array(
        atob(data)
          .split('')
          .map(char => char.charCodeAt(0))
      );

      // Check if the decoded data has the expected minimum length
      if (combined.length < this.IV_LENGTH) {
        return data; // Return as plain text if too short
      }

      const iv = combined.slice(0, this.IV_LENGTH);
      const encryptedData = combined.slice(this.IV_LENGTH);

      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        encryptedData
      );

      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      console.error('Decryption failed, returning original data as plain text:', error);
      // If decryption fails, assume it's plain text and return as-is
      return data;
    }
  }
}