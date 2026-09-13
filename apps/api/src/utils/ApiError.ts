class ApiError extends Error {
  public readonly statusCode: number
  public readonly message: string
  public readonly errors: string[]
  public readonly data: null
  public readonly success: boolean

  constructor(
    statusCode: number,
    message: string,
    errors: string[] = [],
    stack: string = ''
  ) {
    super(message)
    this.statusCode = statusCode
    this.message = message
    this.errors = errors
    this.data = null
    this.success = false

    if (stack) {
      this.stack = stack
    } else {
      Error.captureStackTrace?.(this, this.constructor)
    }
  }
}

export default ApiError
