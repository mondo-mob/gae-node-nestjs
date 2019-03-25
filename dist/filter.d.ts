import { ExceptionFilter, ArgumentsHost, HttpException } from '@nestjs/common';
export declare class NotFoundFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost): void;
}
