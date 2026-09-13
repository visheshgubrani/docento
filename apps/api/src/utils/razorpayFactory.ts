import Razorpay from 'razorpay'
import { decrypt } from '../utils/encryption'
import ApiError from '../utils/ApiError'

export const getRazorpayForProject = (
  keyId: string | null,
  encryptedSecret: string | null
) => {
  if (!keyId || !encryptedSecret) {
    throw new ApiError(
      400,
      'Payment gateway not configured. Please contact the course creator.'
    )
  }

  try {
    // Decrypt at runtime
    const originalSecret = decrypt(encryptedSecret)

    return new Razorpay({
      key_id: keyId,
      key_secret: originalSecret,
    })
  } catch (error) {
    console.error('Decryption failed for project keys', error)
    throw new ApiError(500, 'Payment configuration error')
  }
}
