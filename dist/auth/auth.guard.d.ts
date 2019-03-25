import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Configuration } from '../index';
export declare const Roles: (...roles: string[]) => (target: object, key?: any, descriptor?: any) => any;
export declare const AllowAnonymous: () => (target: object, key?: any, descriptor?: any) => any;
export declare const Task: () => (target: object, key?: any, descriptor?: any) => any;
export declare const Cron: () => (target: object, key?: any, descriptor?: any) => any;
export declare const System: () => (target: object, key?: any, descriptor?: any) => any;
export declare class AuthGuard implements CanActivate {
    private readonly reflector;
    private readonly configurationProvider;
    private logger;
    constructor(reflector: Reflector, configurationProvider: Configuration);
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean>;
}
