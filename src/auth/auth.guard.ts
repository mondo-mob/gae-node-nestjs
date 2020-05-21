import { CanActivate, ExecutionContext, Inject, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { createLogger, Logger } from '../logging';
import { isContext, IUser } from '../datastore/context';
import { Configuration, CONFIGURATION } from '../configuration';
import { getRequestFromExecutionContext } from '../util';

const logger = createLogger('auth-guard');

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const AllowAnonymous = () => SetMetadata('allowAnonymous', true);
export const Task = () => SetMetadata('secure-header', 'x-appengine-taskname');
export const Cron = () => SetMetadata('secure-header', 'x-appengine-cron');
export const System = () => SetMetadata('system', true);

const reflectValue = <T>(reflector: Reflector, key: string, context: ExecutionContext, defaultValue: T) => {
  const methodValue = reflector.get<T>(key, context.getHandler());

  if (methodValue !== undefined) {
    return methodValue;
  }

  const classValue = reflector.get<T>(key, context.getClass());

  if (classValue !== undefined) {
    return classValue;
  }

  return defaultValue;
};

function isAllowAnonymous(reflector: Reflector, context: ExecutionContext): boolean {
  return reflectValue(reflector, 'allowAnonymous', context, false);
}

function isUserAllowedAccess(reflector: Reflector, context: ExecutionContext, user?: IUser): boolean {
  if (!user) {
    return false;
  }

  const roles = reflectValue(reflector, 'roles', context, []);
  if (!roles.length) {
    return true;
  }

  const { roles: userRoles = [] } = user;
  const allowed = roles.some((role) => userRoles.includes(role));
  if (!allowed) {
    logger.warn('User does not have the required role');
  }

  return allowed;
}

function isSystemCall(reflector: Reflector, context: ExecutionContext): boolean {
  return reflectValue(reflector, 'system', context, false);
}

async function isAuthorizedSystemCall(reflector: Reflector, context: ExecutionContext, secret: Buffer) {
  const { verify } = await import('jsonwebtoken');

  const { headers } = getRequestFromExecutionContext(context);

  if (!headers.authorization) {
    return false;
  }

  const token = headers.authorization.substr(4);

  return new Promise<boolean>((resolve) =>
    verify(
      token,
      secret,
      {
        maxAge: '5 min',
        algorithms: ['HS256'],
      },
      (err) => {
        if (err) {
          logger.error('Error decoding system token', err);
          resolve(false);
        } else {
          resolve(true);
        }
      },
    ),
  );
}

function hasSecureHeader(reflector: Reflector, context: ExecutionContext): boolean {
  const { headers } = getRequestFromExecutionContext(context);

  if (!headers) {
    return false;
  }

  const secureHeader = reflectValue<string | undefined>(reflector, 'secure-header', context, undefined);

  if (secureHeader) {
    return !!headers[secureHeader];
  }

  return false;
}

function getUser(context: ExecutionContext): IUser | undefined {
  const request = getRequestFromExecutionContext(context);

  if (request.context && request.context.user) {
    return request.context.user;
  } else {
    const args = context.getArgs();

    if (args.length > 2) {
      const ctxt = args[2];

      if (isContext(ctxt)) {
        return ctxt.user;
      }
    }
  }

  return undefined;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private logger: Logger;

  constructor(
    private readonly reflector: Reflector,
    @Inject(CONFIGURATION) private readonly configurationProvider: Configuration,
  ) {
    this.logger = createLogger('auth-guard');
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    if (isAllowAnonymous(this.reflector, context)) {
      return true;
    }

    if (isSystemCall(this.reflector, context)) {
      return isAuthorizedSystemCall(this.reflector, context, this.configurationProvider.systemSecret);
    }

    if (hasSecureHeader(this.reflector, context)) {
      return true;
    }

    const user = getUser(context);

    return isUserAllowedAccess(this.reflector, context, user);
  }
}
