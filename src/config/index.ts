export default interface Configurations {
    origin: string;
    jwtSecret: string;
    cookieSecret: string;
    frontendOrigin: string;
    twitch: {
        clientId: string;
        clientSecret: string;
        redirectUrl: string;
        defaultBotId: string;
    }
    twitchGql: {
        clientId: string;
        sha256Hash: string;
    }
    sightengine: {
        apiUser: string;
        apiSecret: string;
    }
}