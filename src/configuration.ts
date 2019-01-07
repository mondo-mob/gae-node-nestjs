export interface Configuration {
  isDevelopment(): boolean;
  bucket: string;
  environment: string;
  projectId: string;
  location: string;
  host: string;
  apiEndpoint?: string;
  gmailUser: string;
  passwordTokenExpiry?: number;

  systemSecret: Buffer;

  auth: {
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
  };
}

export const CONFIGURATION = 'Configuration';
