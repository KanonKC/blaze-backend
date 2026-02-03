import { prisma } from "../../libs/prisma";
import redis from "../../libs/redis";
import s3 from "../../libs/awsS3";
import { twitchAppAPI } from "../../libs/twurple";
import config from "../../config";

export default class SystemService {
    async getHealth() {
        // Database Check
        let dbStatus = false;
        try {
            await prisma.$queryRaw`SELECT 1`;
            dbStatus = true;
        } catch (e) {
            console.error('Database check failed', e);
            dbStatus = false;
        }

        // Config Check
        const configDetails: Record<string, any> = {};
        const checkConfig = (obj: any, prefix = '') => {
            for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    checkConfig(obj[key], `${prefix}${key}.`);
                } else {
                    configDetails[`${prefix}${key}`] = !!obj[key];
                }
            }
        };
        checkConfig(config);

        // Libs Check
        const libsStatus: Record<string, boolean> = {
            prisma: dbStatus,
            redis: false,
            s3: false,
            twurple: false
        };

        // Redis
        try {
            await redis.ping();
            libsStatus.redis = true;
        } catch (e) {
            console.error('Redis check failed', e);
            libsStatus.redis = false;
        }

        // S3
        libsStatus.s3 = await s3.healthCheck();

        // Twurple
        try {
            // Just checking if we can get a token or if the object is valid. 
            // getTokenInfo might require a user access token, app access token is handled by authProvider.
            // checking if auth provider is initialized is usually enough since it lazy loads.
            // But to be sure, maybe just true if no error thrown so far? 
            // Let's try to get a token if possible, or assume true if env vars are checked.
            // Actually, we can check if the token provider works.
            const token = await twitchAppAPI.getTokenInfo(); // This should trigger the auth provider
            // checking if it returns valid token info or throws
            libsStatus.twurple = !!token;
        } catch (e) {
            // If getTokenInfo fails, it might be because of context or something, try getAccessToken just to trigger auth
            try {
                await twitchAppAPI.getTokenInfo();
                libsStatus.twurple = true;
            } catch (subError) {
                console.error('Twurple check failed', e);
                libsStatus.twurple = false;
            }
        }

        return {
            database: dbStatus,
            config: configDetails,
            libs: libsStatus
        };
    }
}
