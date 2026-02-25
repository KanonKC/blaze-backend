import Configurations from "@/config/index";
import axios, { AxiosInstance } from "axios";
import { ImageMatureContentDetection } from "./response";

export default class Sightengine {
    private readonly cfg: Configurations;
    constructor(cfg: Configurations) {
        this.cfg = cfg;
    }

    async detectMatureContent(imageUrl: string): Promise<ImageMatureContentDetection> {
        const res = await axios.get<ImageMatureContentDetection>('https://api.sightengine.com/1.0/check.json', {
            params: {
                url: imageUrl,
                models: 'nudity-2.1,gore-2.0',
                api_user: this.cfg.sightengine.apiUser,
                api_secret: this.cfg.sightengine.apiSecret,
            }
        });
        return res.data;
    }
}