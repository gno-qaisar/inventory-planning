import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import * as crypto from 'crypto'
import type { Request, Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      crypto.randomUUID()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message: string | string[] = 'Internal server error'
    let error = 'Internal Server Error'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const res = exception.getResponse()
      if (typeof res === 'string') {
        message = res
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>
        message = (body.message as string | string[]) ?? message
        error = (body.error as string) ?? error
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `[${correlationId}] Unhandled error on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      )
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}

