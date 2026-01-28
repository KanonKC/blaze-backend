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

const userRepository = new UserRepository();
const firstWordRepository = new FirstWordRepository();
const userService = new UserService(config, userRepository);
const userController = new UserController(userService);
const firstWordService = new FirstWordService(config, firstWordRepository, userRepository);
const firstWordController = new FirstWordController(firstWordService);
const chatMessageEvent = new TwitchChannelChatMessageEvent(firstWordService)

const server = fastify();

server.register(cors, {
    origin: ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
})

server.register(multipart)

server.register(cookie, {
    secret: "some-secret-key-that-should-be-in-env", // TODO: Move to env
    parseOptions: {}
});


server.get("/api/v1/login", userController.login.bind(userController))
server.get("/api/v1/user/me", userController.me.bind(userController))
server.post("/api/v1/logout", userController.logout.bind(userController))

server.post("/api/v1/first-word", firstWordController.create.bind(firstWordController));
server.get("/api/v1/first-word", firstWordController.get.bind(firstWordController));
server.put("/api/v1/first-word", firstWordController.update.bind(firstWordController));
server.post("/api/v1/first-word/audio", firstWordController.uploadAudio.bind(firstWordController));

server.post("/webhook/v1/twitch/event-sub/chat-message-events", chatMessageEvent.handle.bind(chatMessageEvent))

export default server;