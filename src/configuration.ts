export interface Configuration {
  isDevelopment(): boolean;
  bucket: string;
  environment: string;
  projectId: string;
  location: string;
  host: string;
  searchServiceEndpoint?: string;
  apiEndpoint?: string;
  gmailUser: string;
  passwordTokenExpiry?: number;

  systemSecret: Buffer;

  auth: {
    activationExpiryInMinutes?: number;
    activationExpiryEmailCopy?: string;
    local?: {
      enabled?: boolean;
    };
    google?: {
      enabled?: boolean;
      clientId: string;
      secret: string;
      signUpEnabled: boolean;
      signUpDomains?: string[];
      signUpRoles?: string[];
    };
    saml?: {
      enabled?: boolean;
      cert: string;
      identityProviderUrl: string;
    };
    auth0?: {
      enabled?: boolean;
      domain: string;
      clientId: string;
      secret: string;
      namespace: string;
    };
  };
  devHooks?: {
    disableLocalMailLogger?: boolean;
    divertEmailTo?: string[];
    emailSubjectPrefix?: string;
  };
}

export const CONFIGURATION = 'Configuration';
