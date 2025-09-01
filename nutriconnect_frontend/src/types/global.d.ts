// Global type declarations
declare global {
  interface Window {
    _env_?: {
      ESIGNET_UI_BASE_URL?: string;
      MOCK_RELYING_PARTY_SERVER_URL?: string;
      REDIRECT_URI_USER_PROFILE?: string;
      REDIRECT_URI_REGISTRATION?: string;
      REDIRECT_URI?: string;
      CLIENT_ID?: string;
      ACRS?: string;
      SCOPE_USER_PROFILE?: string;
      SCOPE_REGISTRATION?: string;
      CLAIMS_USER_PROFILE?: string;
      CLAIMS_REGISTRATION?: string;
      SIGN_IN_BUTTON_PLUGIN_URL?: string;
      DISPLAY?: string;
      PROMPT?: string;
      GRANT_TYPE?: string;
      MAX_AGE?: number;
      CLAIMS_LOCALES?: string;
      DEFAULT_LANG?: string;
      FALLBACK_LANG?: string;
    };
    SignInWithEsignetButton?: {
      init: (config: {
        oidcConfig: any;
        buttonConfig: any;
        signInElement: HTMLElement | null;
      }) => void;
    };
  }
}

export {};
