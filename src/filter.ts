import { ArgumentsHost, Catch, ExceptionFilter, HttpException, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import * as path from 'path';
import { createLogger, Logger } from './logging';

// Manually save session to ensure it's fully saved before returning index page
// Otherwise browser can start sending new requests before session is saved causing
// multiple sessions to be created and sid/csrf token to become out of sync.
const saveSessionAndSendIndexPage = (request: Request, response: Response, logger: Logger) => {
  if (request.session && request.session.save) {
    return request.session.save(() => {
      logger.debug(`Session saved ${request.session!.id}`);
      sendIndexPage(response);
    });
  }
  return sendIndexPage(response);
};

const sendIndexPage = (response: Response) =>
  response.status(200).sendFile(path.join(process.cwd(), 'public', 'index.html'));

@Catch(NotFoundException)
export class NotFoundFilter implements ExceptionFilter {
  private readonly logger = createLogger('not-found-filter');

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (request.headers.accept && request.headers.accept.includes('text/html')) {
      return saveSessionAndSendIndexPage(request, response, this.logger);
    }

    response.status(404).json({
      statusCode: exception.getStatus(),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
