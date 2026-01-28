import { createClient, SetOptions } from "redis";

const TTL: { [time: string]: SetOptions } = {
    TWO_HOURS: { expiration: { type: "EX", value: 60 * 60 * 2 } }
}

const redis = createClient({
    url: process.env.REDIS_URL
})

const publisher = redis.duplicate()
const subscriber = redis.duplicate()

Promise.all([
    redis.connect(),
    publisher.connect(),
    subscriber.connect()
])

export { TTL, publisher, subscriber }
export default redis
