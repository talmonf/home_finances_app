import { decryptSecret as decryptWithKey, encryptSecret as encryptWithKey } from "@/lib/crypto/secret";

const GOOGLE_KEY_ENV = "GOOGLE_TOKEN_ENCRYPTION_KEY";

export function encryptSecret(plainText: string): string {
  return encryptWithKey(plainText, GOOGLE_KEY_ENV);
}

export function decryptSecret(cipherText: string): string {
  return decryptWithKey(cipherText, GOOGLE_KEY_ENV);
}
