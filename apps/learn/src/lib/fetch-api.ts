import { cookies } from 'next/headers'

const LMS_API_URL = process.env.LMS_API_URL!
const LMS_SECRET_API_KEY = process.env.LMS_SECRET_API_KEY!

export class APIError extends Error {
  status: number
  payload?: unknown

  constructor(message: string, status: number, payload?: unknown) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.payload = payload
  }
}

interface FetchOptions extends RequestInit {
  requireAuth?: boolean
  retries?: number
  authToken?: string
}

export async function fetchAPI<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { requireAuth = false, retries = 1, authToken, ...fetchOptions } = options
  
  const url = `${LMS_API_URL}${endpoint}`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': LMS_SECRET_API_KEY,
    ...((fetchOptions.headers as Record<string, string>) || {}),
  }
  
  if (requireAuth) {
    const tokenFromCookie = authToken
      ? authToken
      : (await cookies()).get('auth_token')?.value
    if (tokenFromCookie) {
      headers['Authorization'] = `Bearer ${tokenFromCookie}`
    }
  }
  
  const config: RequestInit = {
    ...fetchOptions,
    headers,
  }
  
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMessage =
          typeof errorData === 'object' &&
          errorData !== null &&
          'message' in errorData &&
          typeof errorData.message === 'string'
            ? errorData.message
            : `HTTP error! status: ${response.status}`

        throw new APIError(errorMessage, response.status, errorData)
      }
      
      return await response.json()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
        continue
      }
      
      throw lastError
    }
  }
  
  throw lastError || new Error('Unknown error')
}
