import _sodium from "libsodium-wrappers";

// This file implements simple API for XChaCha20-Poly1305 key generation,
// encryption and decryption using libsodium.js, and also data encoding/decoding.
// I'm struggling between using libsodium.js and Web Crypto API (possibly AES-256-GCM).
// CryptoKey has e.g. restrictions on secure contexts, which we do not have.
// Maybe it's better to use CryptoKey and other parts of Web Crypto API?
// Also, libsodium is an extra dependency, that increases the bundle size etc.

export type Binary = Uint8Array;
export type Base64 = string;

export async function toBase64(
  binaryOrUnicode: Binary | string,
): Promise<Base64> {
  await _sodium.ready;
  const sodium = _sodium;

  return sodium.to_base64(
    binaryOrUnicode,
    sodium.base64_variants.URLSAFE_NO_PADDING,
  );
}

export async function toBinaryFromBase64(base64: Base64): Promise<Binary> {
  await _sodium.ready;
  const sodium = _sodium;

  return sodium.from_base64(base64, sodium.base64_variants.URLSAFE_NO_PADDING);
}

export async function toBinaryFromUnicode(unicode: string): Promise<Binary> {
  await _sodium.ready;
  const sodium = _sodium;

  return sodium.from_string(unicode);
}

export async function toUnicode(
  binaryOrBase64: Binary | Base64,
): Promise<string> {
  await _sodium.ready;
  const sodium = _sodium;

  const binary =
    typeof binaryOrBase64 === "string"
      ? sodium.from_base64(
          binaryOrBase64,
          sodium.base64_variants.URLSAFE_NO_PADDING,
        )
      : binaryOrBase64;

  return sodium.to_string(binary);
}

export async function generateKey(): Promise<Base64> {
  await _sodium.ready;
  const sodium = _sodium;

  const keyBinary = sodium.crypto_secretstream_xchacha20poly1305_keygen();
  const keyBase64 = sodium.to_base64(
    keyBinary,
    sodium.base64_variants.URLSAFE_NO_PADDING,
  );
  return keyBase64;
}

// TODO: encryption and decryption should not block the main thread,
// e.g. by using Web Workers and chunking data. Do it.

export async function encryptData(data: Binary, key: Binary): Promise<Binary> {
  await _sodium.ready;
  const sodium = _sodium;

  const { state, header } =
    sodium.crypto_secretstream_xchacha20poly1305_init_push(key);

  const ciphertext = sodium.crypto_secretstream_xchacha20poly1305_push(
    state,
    data,
    null,
    sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL,
  );

  var encryptedData = new Uint8Array(header.length + ciphertext.length);
  encryptedData.set(header);
  encryptedData.set(ciphertext, header.length);

  return encryptedData;
}

export async function decryptData(data: Binary, key: Binary): Promise<Binary> {
  await _sodium.ready;
  const sodium = _sodium;

  const header = data.subarray(
    0,
    sodium.crypto_secretstream_xchacha20poly1305_HEADERBYTES,
  );
  const ciphertext = data.subarray(
    sodium.crypto_secretstream_xchacha20poly1305_HEADERBYTES,
  );

  const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(
    header,
    key,
  );

  // TODO: should we do something with this tag?
  const { message, tag } = sodium.crypto_secretstream_xchacha20poly1305_pull(
    state,
    ciphertext,
  );

  return message;
}

const api = {
  toBase64,
  toBinaryFromBase64,
  toBinaryFromUnicode,
  toUnicode,
  generateKey,
  encryptData,
  decryptData,
};

export default api;
