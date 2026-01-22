import fastify from "fastify";
import UserService from "./services/user/user.service";
import config from "./config";
import UserController from "./controllers/user/user.controller";
import UserRepository from "./repositories/user/user.repository";

const userRepository = new UserRepository();
const userService = new UserService(config, userRepository);
const userController = new UserController(userService);

const server = fastify();

server.get("/", (req, res) => {
  res.send("Hello World");
});

server.get("/api/v1/login", userController.login.bind(userController))

export default server;