import Razorpay from 'razorpay'

// These keys are for YOUR Razorpay account (to collect SaaS fees)
const key_id = process.env.RAZORPAY_KEY_ID
const key_secret = process.env.RAZORPAY_KEY_SECRET

if (!key_id || !key_secret) {
  throw new Error('Razorpay keys are missing in .env')
}

export const razorpay = new Razorpay({
  key_id,
  key_secret,
})
