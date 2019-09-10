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
    local?: {
      enabled?: boolean;
      activationExpiryInMinutes?: number;
      activationExpiryEmailCopy?: string;
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
    oidc?: {
      enabled?: boolean;
      issuer: string;
      clientId: string;
      secret: string;
      authUrl: string;
      userInfoUrl: string;
      tokenUrl: string;
      newUserRoles?: string[];
    };
  };
  devHooks?: {
    disableLocalMailLogger?: boolean;
    divertEmailTo?: string[];
    emailSubjectPrefix?: string;
  };
}

export const CONFIGURATION = 'Configuration';
