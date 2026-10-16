import "server-only"

import crypto from "node:crypto"

function getEncryptionKey() {
  const encoded =
    process.env.BUSINESS_DATA_ENCRYPTION_KEY

  if (!encoded) {
    throw new Error(
      "BUSINESS_DATA_ENCRYPTION_KEY is missing",
    )
  }

  let key: Buffer

  try {
    key = Buffer.from(
      encoded,
      "base64",
    )
  } catch {
    throw new Error(
      "BUSINESS_DATA_ENCRYPTION_KEY is invalid",
    )
  }

  if (key.length !== 32) {
    throw new Error(
      "BUSINESS_DATA_ENCRYPTION_KEY must decode to exactly 32 bytes",
    )
  }

  return key
}

/**
 * AES-256-GCM authenticated encryption.
 *
 * Stored format:
 *
 * v1:<iv>:<authTag>:<ciphertext>
 *
 * All binary components are Base64 encoded.
 */
export function encryptSensitiveValue(
  plaintext: string,
) {
  if (
    typeof plaintext !== "string" ||
    plaintext.length === 0
  ) {
    throw new Error(
      "Cannot encrypt an empty value",
    )
  }

  const key =
    getEncryptionKey()

  const iv =
    crypto.randomBytes(12)

  const cipher =
    crypto.createCipheriv(
      "aes-256-gcm",
      key,
      iv,
    )

  const encrypted =
    Buffer.concat([
      cipher.update(
        plaintext,
        "utf8",
      ),
      cipher.final(),
    ])

  const authTag =
    cipher.getAuthTag()

  return [
    "v1",
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":")
}

/**
 * Decrypt a value produced by
 * encryptSensitiveValue().
 */
export function decryptSensitiveValue(
  value: string,
) {
  if (
    typeof value !== "string" ||
    value.length === 0
  ) {
    throw new Error(
      "Cannot decrypt an empty value",
    )
  }

  const parts =
    value.split(":")

  if (
    parts.length !== 4 ||
    parts[0] !== "v1"
  ) {
    throw new Error(
      "Unsupported encrypted value format",
    )
  }

  const [
    ,
    ivEncoded,
    authTagEncoded,
    ciphertextEncoded,
  ] = parts

  try {
    const key =
      getEncryptionKey()

    const iv =
      Buffer.from(
        ivEncoded,
        "base64",
      )

    const authTag =
      Buffer.from(
        authTagEncoded,
        "base64",
      )

    const ciphertext =
      Buffer.from(
        ciphertextEncoded,
        "base64",
      )

    if (iv.length !== 12) {
      throw new Error(
        "Invalid initialization vector",
      )
    }

    if (authTag.length !== 16) {
      throw new Error(
        "Invalid authentication tag",
      )
    }

    const decipher =
      crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        iv,
      )

    decipher.setAuthTag(
      authTag,
    )

    const decrypted =
      Buffer.concat([
        decipher.update(
          ciphertext,
        ),
        decipher.final(),
      ])

    return decrypted.toString(
      "utf8",
    )
  } catch {
    /*
     * Don't expose crypto implementation details
     * or sensitive information to callers/logs.
     */
    throw new Error(
      "Unable to decrypt sensitive value",
    )
  }
}

/**
 * Allows server startup/routes to verify that the
 * business encryption configuration is valid
 * without encrypting actual business data.
 */
export function validateBusinessEncryption() {
  getEncryptionKey()
}
