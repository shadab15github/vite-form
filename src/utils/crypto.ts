const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const STORAGE_KEY = 'notes_crypto_key';

let cryptoKey: CryptoKey | null = null;

const generateKey = async (): Promise<CryptoKey> => {
  return await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // Make key extractable so we can store it
    ['encrypt', 'decrypt']
  );
};

const generateAndStoreKey = async (): Promise<CryptoKey> => {
  const key = await generateKey();
  try {
    const exportedKey = await crypto.subtle.exportKey('jwk', key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exportedKey));
  } catch (error) {
    console.warn('Failed to store key:', error);
  }
  return key;
};

const getKey = async (): Promise<CryptoKey> => {
  if (!cryptoKey) {
    // Try to load existing key from localStorage
    const storedKey = localStorage.getItem(STORAGE_KEY);
    if (storedKey) {
      try {
        const keyData = JSON.parse(storedKey);
        cryptoKey = await crypto.subtle.importKey(
          'jwk',
          keyData,
          { name: ALGORITHM },
          true,
          ['encrypt', 'decrypt']
        );
      } catch (error) {
        console.warn('Failed to load stored key, generating new one:', error);
        cryptoKey = await generateAndStoreKey();
      }
    } else {
      cryptoKey = await generateAndStoreKey();
    }
  }
  return cryptoKey;
};

export const encrypt = async (data: string): Promise<string> => {
  try {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encodedData = new TextEncoder().encode(data);

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
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
};

export const decrypt = async (data: string): Promise<string> => {
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
    const key = await getKey();
    const combined = new Uint8Array(
      atob(data)
        .split('')
        .map(char => char.charCodeAt(0))
    );

    // Check if the decoded data has the expected minimum length
    if (combined.length < IV_LENGTH) {
      return data; // Return as plain text if too short
    }

    const iv = combined.slice(0, IV_LENGTH);
    const encryptedData = combined.slice(IV_LENGTH);

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
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
};