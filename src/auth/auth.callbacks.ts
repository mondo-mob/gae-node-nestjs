export const AUTH_CALLBACKS = 'AuthCallbacks';

export interface AuthCallbacks {
  // optional callbacks to process auth payload
  buildUserRolesList?(authType: string, profileData: any): string[];
  buildUserPropertiesObject?(authType: string, profileData: any): any;
}
