export interface ImageMatureContentDetection {
    status: "success";
    request: {
        id: string;
        timestamp: number;
    };
    nudity: {
        sexual_activity: number;
        none: number;
    }
    gore: {
        prob: number;
    }
    media: {
        id: string;
        uri: string;
    }
}