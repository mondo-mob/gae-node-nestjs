export const AUTH_CALLBACKS = 'AuthCallbacks';

export interface AuthCallbacks {
  // optional callbacks to process auth payload
  buildUserRolesList?(profileData: any): string[];
  buildUserPropertiesObject?(profileData: any): any;
}
