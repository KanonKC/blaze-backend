import fastify from "fastify";
import UserService from "./services/user/user.service";
import UserController from "./controllers/user/user.controller";
import UserRepository from "./repositories/user/user.repository";
import config from "./config";
import FirstWordRepository from "./repositories/firstWord/firstWord.repository";
import FirstWordService from "./services/firstWord/firstWord.service";
import FirstWordController from "./controllers/firstWord/firstWord.controller";
import TwitchChannelChatMessageEvent from "./events/twitch/channelChatMessage/channelChatMessage.event";

import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { FastifySSEPlugin } from "fastify-sse-v2";
import FirstWordEventController from "./controllers/firstWord/firstWord.event.controller";
import { authenticationRequired } from "./controllers/middleware";
import TwitchStreamOnlineEvent from "./events/twitch/streamOnline/streamOnline.event";
import SystemService from "./services/system/system.service";
import SystemController from "./controllers/system/system.controller";

const userRepository = new UserRepository();
const firstWordRepository = new FirstWordRepository();
const userService = new UserService(config, userRepository);
const firstWordService = new FirstWordService(config, firstWordRepository, userRepository);
const userController = new UserController(config, userService);
const firstWordEventController = new FirstWordEventController(firstWordService);
const firstWordController = new FirstWordController(firstWordService, firstWordEventController);
const twitchChannelChatMessageEvent = new TwitchChannelChatMessageEvent(firstWordService)
const twitchStreamOnlineEvent = new TwitchStreamOnlineEvent(firstWordService);

const systemService = new SystemService();
const systemController = new SystemController(systemService);

const server = fastify();

server.register(cors, {
    origin: [config.frontendOrigin],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
})

server.register(multipart)

server.register(cookie, {
    secret: config.cookieSecret,
    parseOptions: {}
});


server.get("/health", systemController.health.bind(systemController))

server.get("/api/v1/login", userController.login.bind(userController))
server.get("/api/v1/user/me", userController.me.bind(userController))
server.post("/api/v1/logout", userController.logout.bind(userController))
server.post("/api/v1/refresh-token", userController.refresh.bind(userController))

server.post("/api/v1/first-word", firstWordController.create.bind(firstWordController));
server.get("/api/v1/first-word", firstWordController.get.bind(firstWordController));
server.put("/api/v1/first-word", firstWordController.update.bind(firstWordController));
server.post("/api/v1/first-word/audio", firstWordController.uploadAudio.bind(firstWordController));
server.post("/api/v1/first-word/refresh-key", firstWordController.refreshKey.bind(firstWordController));
server.delete("/api/v1/first-word", firstWordController.delete.bind(firstWordController));

server.register(FastifySSEPlugin);
server.get("/api/v1/events/first-word/:userId", firstWordEventController.sse.bind(firstWordEventController));

server.post("/webhook/v1/twitch/event-sub/channel-chat-message", twitchChannelChatMessageEvent.handle.bind(twitchChannelChatMessageEvent))
server.post("/webhook/v1/twitch/event-sub/stream-online", twitchStreamOnlineEvent.handle.bind(twitchStreamOnlineEvent))

export default server;
