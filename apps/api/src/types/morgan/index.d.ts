declare module 'morgan' {
  import { Request, RequestHandler, Response } from 'express'

  interface StreamOptions {
    write: (message: string) => void
  }

  interface Options {
    immediate?: boolean
    skip?: (req: Request, res: Response) => boolean
    stream?: StreamOptions
  }

  type FormatFn = (
    tokens: unknown,
    req: Request,
    res: Response,
  ) => string | undefined

  function morgan(format: string | FormatFn, options?: Options): RequestHandler

  export default morgan
}
