import axios, { AxiosInstance } from "axios";
import Configurations from "@/config/index";
import { TwitchClipResponse } from "./response";

export default class TwitchGql {
    private readonly endpoint: string = "https://gql.twitch.tv/gql";
    private readonly api: AxiosInstance;
    private readonly cfg: Configurations;
    constructor(cfg: Configurations) {
        this.cfg = cfg;
        this.api = axios.create({
            baseURL: this.endpoint,
            headers: {
                "Client-ID": this.cfg.twitchGql.clientId
            }
        })
    }

    async getClip(slug: string): Promise<TwitchClipResponse> {
        console.log('getClip', slug)
        const body = {
            "operationName": "VideoAccessToken_Clip",
            "variables": {
                "slug": slug
            },
            "extensions": {
                "persistedQuery": {
                    "version": 1,
                    "sha256Hash": this.cfg.twitchGql.sha256Hash
                }
            }
        }
        console.log('getClip Body', body)
        const response = await this.api.post("/", body);
        console.log('getClip Response', response.data)
        return response.data;
    }

    async getClipProductionUrl(slug: string): Promise<string> {
        const response = await this.getClip(slug)
        const clipData = response.data.clip;
        const playbackToken = clipData.playbackAccessToken;
        const videoQualities = clipData.videoQualities;

        const distinctQuality = videoQualities.find(q => q.quality === "1080") || videoQualities[0];

        if (distinctQuality) {
            const sourceUrl = distinctQuality.sourceURL;
            const signature = playbackToken.signature;
            const token = encodeURIComponent(playbackToken.value);

            const finalLink = `${sourceUrl}?sig=${signature}&token=${token}`;
            return finalLink;
        } else {
            throw new Error("No suitable video quality found.");
        }
    }
}