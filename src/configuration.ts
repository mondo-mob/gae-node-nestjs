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
  serviceTasksOnThisVersion?: boolean;

  requestScope?: {
    enabled?: boolean;
    logBundlingEnabled?: boolean;
  };

  auth: {
    fake?: {
      enabled?: boolean;
      secret?: string;
    };
    local?: {
      enabled?: boolean;
      activationExpiryInMinutes?: number;
      activationExpiryEmailCopy?: string;
      invitationEmailCopy?: string;
    };
    google?: {
      enabled?: boolean;
      clientId: string;
      secret: string;
      signUpEnabled: boolean;
      signUpDomains?: string[];
      signUpRoles?: string[];
      failureRedirect?: string;
    };
    saml?: {
      enabled?: boolean;
      cert: string;
      identityProviderUrl: string;
      failureRedirect?: string;
    };
    auth0?: {
      enabled?: boolean;
      domain: string;
      clientId: string;
      secret: string;
      namespace: string;
      failureRedirect?: string;
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
      replaceAuth?: boolean;
      failureRedirect?: string;
    };
    smtp?: {
      enabled: boolean;
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
      from: {
        name: string;
        address: string;
      };
    };
  };
  devHooks?: {
    disableLocalMailLogger?: boolean;
    divertEmailTo?: string[];
    emailWhitelist?: string[];
    emailSubjectPrefix?: string;
  };
}

export const CONFIGURATION = 'Configuration';
