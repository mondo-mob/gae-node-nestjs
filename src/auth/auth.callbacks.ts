import { Request } from 'express';

export const AUTH_CALLBACKS = 'AuthCallbacks';

export interface AuthCallbacks {
  // optional callbacks to process auth payload
  buildUserRolesList?(authType: string, profileData: any): string[];
  buildUserPropertiesObject?(authType: string, profileData: any): any;
  // optional callback to populate auth0 authentication options
  buildAuthenticationOptions?(authType: string, req: Request, defaultAuthenticateOptions: any): any;
}
