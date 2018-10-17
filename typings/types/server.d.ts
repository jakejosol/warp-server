export declare type ServerConfigType = {
    apiKey: string;
    masterKey: string;
    databaseURI: string;
    keepConnections?: boolean;
    charset?: string;
    timeout?: number;
    customResponse?: boolean;
    supportLegacy?: boolean;
};
