import {
  NotFoundException,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  Catch,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as path from 'path';

@Catch(NotFoundException)
export class NotFoundFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (
      request.headers.accept &&
      request.headers.accept.includes('text/html')
    ) {
      return response
        .status(200)
        .sendFile(path.join(process.cwd(), 'public', 'index.html'));
    }

    response.status(404).json({
      statusCode: exception.getStatus(),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
