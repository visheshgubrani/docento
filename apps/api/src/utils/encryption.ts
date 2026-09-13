import crypto from 'crypto'

// 1. Read the Hex String
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY || ''

// 2. Convert Hex to Buffer (32 Bytes)
const keyBuffer = Buffer.from(ENCRYPTION_KEY_HEX, 'hex')

// 3. Validation: Check if the BUFFER is 32 bytes (not the string length)
if (keyBuffer.length !== 32) {
  throw new Error(
    `Invalid ENCRYPTION_KEY. Expected 32 bytes (64 hex chars), got ${keyBuffer.length} bytes.`
  )
}

const IV_LENGTH = 16 // AES block size

export const encrypt = (text: string) => {
  const iv = crypto.randomBytes(IV_LENGTH)
  // Pass the Buffer (keyBuffer), not the string
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export const decrypt = (text: string) => {
  const textParts = text.split(':')
  const iv = Buffer.from(textParts.shift()!, 'hex')
  const encryptedText = Buffer.from(textParts.join(':'), 'hex')
  // Pass the Buffer (keyBuffer), not the string
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv)
  let decrypted = decipher.update(encryptedText)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}
