export enum VideoUTypes {
  Little = 0,
  Big = 1,
}

export interface BClient {
  clientName: string;
  clientId: string;
  clientSecret: string;
  authBackUrl: string;
}

export interface AccessToken {
  access_token: string; // '<access_token>';
  expires_in: number; // 1630220614;
  refresh_token: string; // '<refresh_token>';
  scopes: string[]; // ['USER_INFO', 'ATC_DATA', 'ATC_BASE'];
}
