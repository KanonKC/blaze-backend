import fastify from "fastify";
import config from "./config";
import ClipShoutoutController from "./controllers/clipShoutout/clipShoutout.controller";
import FirstWordController from "./controllers/firstWord/firstWord.controller";
import RandomDbdPerkController from "./controllers/randomDbdPerk/randomDbdPerk.controller";
import UserController from "./controllers/user/user.controller";
import WidgetController from "./controllers/widget/widget.controller";
import TwitchChannelChatMessageEvent from "./events/twitch/channelChatMessage/channelChatMessage.event";
import TwitchChannelChatNotificationEvent from "./events/twitch/channelChatNotification/channelChatNotification.event";
import FirstWordRepository from "./repositories/firstWord/firstWord.repository";
import RandomDbdPerkRepository from "./repositories/randomDbdPerk/randomDbdPerk.repository";
import UserRepository from "./repositories/user/user.repository";
import WidgetRepository from "./repositories/widget/widget.repository";
import ClipShoutoutService from "./services/clipShoutout/clipShoutout.service";
import FirstWordService from "./services/firstWord/firstWord.service";
import RandomDbdPerkService from "./services/randomDbdPerk/randomDbdPerk.service";
import UserService from "./services/user/user.service";
import WidgetService from "./services/widget/widget.service";

import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { FastifySSEPlugin } from "fastify-sse-v2";
import ClipShoutoutEventController from "./controllers/clipShoutout/clipShoutout.event.controller";
import FirstWordEventController from "./controllers/firstWord/firstWord.event.controller";
import SystemController from "./controllers/system/system.controller";
import TwitchController from "./controllers/twitch/twitch.controller";
import TwitchChannelRedemptionAddEvent from "./events/twitch/channelRedemptionAdd/channelRedemptionAdd.event";
import TwitchStreamOnlineEvent from "./events/twitch/streamOnline/streamOnline.event";
import TwitchGql from "./providers/twitchGql";
import AuthRepository from "./repositories/auth/auth.repository";
import ClipShoutoutRepository from "./repositories/clipShoutout/clipShoutout.repository";
import AuthService from "./services/auth/auth.service";
import SystemService from "./services/system/system.service";
import TwitchService from "./services/twitch/twitch";

// Providers
const twitchGql = new TwitchGql(config);

// Repository Layer
const userRepository = new UserRepository();
const firstWordRepository = new FirstWordRepository();
const authRepository = new AuthRepository();

const clipShoutoutRepository = new ClipShoutoutRepository();

const randomDbdPerkRepository = new RandomDbdPerkRepository();
const widgetRepository = new WidgetRepository();

// Service Layer
const systemService = new SystemService();
const userService = new UserService(config, userRepository, authRepository);
const authService = new AuthService(config, authRepository, userRepository, userService);
const firstWordService = new FirstWordService(config, firstWordRepository, userRepository, authService);

const clipShoutoutService = new ClipShoutoutService(config, clipShoutoutRepository, userRepository, authService, twitchGql);

const randomDbdPerkService = new RandomDbdPerkService(randomDbdPerkRepository, userRepository);
const widgetService = new WidgetService(widgetRepository);
const twitchService = new TwitchService(authService);

// Controller Layer
const systemController = new SystemController(systemService);
const userController = new UserController(config, userService);
const firstWordEventController = new FirstWordEventController(firstWordService);
const firstWordController = new FirstWordController(firstWordService, firstWordEventController);
const clipShoutoutEventController = new ClipShoutoutEventController(clipShoutoutService);

const clipShoutoutController = new ClipShoutoutController(clipShoutoutService, clipShoutoutEventController);
const randomDbdPerkController = new RandomDbdPerkController(randomDbdPerkService);
const widgetController = new WidgetController(widgetService);
const twitchController = new TwitchController(twitchService);

// Event Layer
const twitchChannelChatMessageEvent = new TwitchChannelChatMessageEvent(firstWordService)
const twitchStreamOnlineEvent = new TwitchStreamOnlineEvent(firstWordService);
const twitchChannelChatNotificationEvent = new TwitchChannelChatNotificationEvent(clipShoutoutService);
const twitchChannelRedemptionAddEvent = new TwitchChannelRedemptionAddEvent(randomDbdPerkService);


const server = fastify();

server.register(cors, {
    origin: true, // Allow all origins (overlay SSE endpoints use key-based auth)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
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

server.post("/api/v1/clip-shoutout", clipShoutoutController.create.bind(clipShoutoutController));
server.get("/api/v1/clip-shoutout", clipShoutoutController.get.bind(clipShoutoutController));
server.put("/api/v1/clip-shoutout", clipShoutoutController.update.bind(clipShoutoutController));
server.post("/api/v1/clip-shoutout/refresh-key", clipShoutoutController.refreshKey.bind(clipShoutoutController));

server.delete("/api/v1/clip-shoutout", clipShoutoutController.delete.bind(clipShoutoutController));

server.post("/api/v1/random-dbd-perk", randomDbdPerkController.create.bind(randomDbdPerkController));
server.get("/api/v1/random-dbd-perk", randomDbdPerkController.get.bind(randomDbdPerkController));
server.put("/api/v1/random-dbd-perk", randomDbdPerkController.update.bind(randomDbdPerkController));
server.post("/api/v1/random-dbd-perk/refresh-key", randomDbdPerkController.refreshKey.bind(randomDbdPerkController));
server.delete("/api/v1/random-dbd-perk", randomDbdPerkController.delete.bind(randomDbdPerkController));

server.put("/api/v1/widgets/:id", widgetController.update.bind(widgetController));
server.delete("/api/v1/widgets/:id", widgetController.delete.bind(widgetController));

server.get("/api/v1/twitch/channel-rewards", twitchController.getChannelRewards.bind(twitchController));

server.register(FastifySSEPlugin);
server.get("/api/v1/events/first-word/:userId", firstWordEventController.sse.bind(firstWordEventController));
server.get("/api/v1/events/clip-shoutout/:userId", clipShoutoutEventController.sse.bind(clipShoutoutEventController));

server.post("/webhook/v1/twitch/event-sub/channel-chat-message", twitchChannelChatMessageEvent.handle.bind(twitchChannelChatMessageEvent))
server.post("/webhook/v1/twitch/event-sub/stream-online", twitchStreamOnlineEvent.handle.bind(twitchStreamOnlineEvent))
server.post("/webhook/v1/twitch/event-sub/channel-chat-notification", twitchChannelChatNotificationEvent.handle.bind(twitchChannelChatNotificationEvent))
server.post("/webhook/v1/twitch/event-sub/channel-redemption-add", twitchChannelRedemptionAddEvent.handle.bind(twitchChannelRedemptionAddEvent))

export default server;
