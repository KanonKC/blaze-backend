import { createClient, SetOptions } from "redis";

const TTL: { [time: string]: SetOptions } = {
    TWO_HOURS: { expiration: { type: "EX", value: 60 * 60 * 2 } }
}

const redis = createClient({
    url: process.env.REDIS_URL
})

redis.connect()

export { TTL }
export default redis
