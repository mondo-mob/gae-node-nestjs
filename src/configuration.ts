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

  storage?: {
    /**
     * LOCAL DEVELOPMENT ONLY. Service account key (the contents of the JSON key file, as an object or a
     * JSON string) used to connect to Google Cloud Storage when `isDevelopment()` is true. When unset,
     * local development falls back to `./keyfile.json` (deprecated).
     *
     * Deployed environments ignore this (with a warning) and always use the runtime identity
     * (Application Default Credentials), so never rely on it outside local development.
     */
    credentials?: string | Record<string, unknown>;
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
