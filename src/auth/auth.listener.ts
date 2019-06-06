import { Request } from 'express';

export const AUTH_LISTENER = 'AuthListener';

export interface AuthListener {
    onLogin(req: Request): void;
}
