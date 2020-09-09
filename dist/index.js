"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pubsub = void 0;
require("reflect-metadata");
require("dotenv-safe/config");
const path_1 = __importDefault(require("path"));
const type_graphql_1 = require("type-graphql");
const http_1 = __importDefault(require("http"));
const apollo_server_express_1 = require("apollo-server-express");
const express_1 = __importDefault(require("express"));
const hello_1 = require("./resolvers/hello");
const message_1 = require("./resolvers/message");
const user_1 = require("./resolvers/user");
const typeorm_1 = require("typeorm");
const User_1 = require("./entities/User");
const Message_1 = require("./entities/Message");
const connect_redis_1 = __importDefault(require("connect-redis"));
const ioredis_1 = __importDefault(require("ioredis"));
const express_session_1 = __importDefault(require("express-session"));
const constants_1 = require("./constants");
const cors_1 = __importDefault(require("cors"));
const createUserLoader_1 = require("./utils/createUserLoader");
exports.pubsub = new apollo_server_express_1.PubSub();
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    yield typeorm_1.createConnection({
        type: "postgres",
        url: process.env.DATABASE_URL,
        logging: true,
        synchronize: true,
        migrations: [path_1.default.join(__dirname, "./migrations/*")],
        entities: [User_1.User, Message_1.Message],
    });
    const PORT = 4000;
    const app = express_1.default();
    const RedisStore = connect_redis_1.default(express_session_1.default);
    const redis = new ioredis_1.default(process.env.REDIS_URL);
    app.set("trust proxy", 1);
    app.use(cors_1.default({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    }));
    const mySession = express_session_1.default({
        name: constants_1.COOKIE_NAME,
        store: new RedisStore({
            client: redis,
            disableTouch: true,
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
            httpOnly: true,
            sameSite: "lax",
            secure: constants_1.__prod__,
            domain: constants_1.__prod__ ? ".codeponder.com" : undefined,
        },
        saveUninitialized: false,
        secret: process.env.SESSION_SECRET,
        resave: false,
    });
    app.use(mySession);
    const schema = yield type_graphql_1.buildSchema({
        resolvers: [hello_1.HelloResolver, message_1.MessageResolver, user_1.UserResolver],
        validate: false,
    });
    const apolloServer = new apollo_server_express_1.ApolloServer({
        schema,
        context: (args) => {
            var _a;
            return {
                req: args.req || ((_a = args.connection) === null || _a === void 0 ? void 0 : _a.context.request),
                res: args.res,
                redis,
                userLoader: createUserLoader_1.createUserLoader(),
            };
        },
        subscriptions: {
            onConnect: (_connectionParams, webSocket, context) => __awaiter(void 0, void 0, void 0, function* () {
                const wsSession = yield new Promise((resolve) => {
                    mySession(webSocket.upgradeReq, {}, () => {
                        if (webSocket.upgradeReq.session) {
                            resolve(webSocket.upgradeReq.session);
                        }
                        return false;
                    });
                });
                if (wsSession.userId) {
                    return Object.assign(Object.assign({}, context), { session: wsSession });
                }
                throw new Error(`Unauthorized`);
            }),
        },
    });
    apolloServer.applyMiddleware({
        app,
        cors: false,
    });
    const httpServer = http_1.default.createServer(app);
    apolloServer.installSubscriptionHandlers(httpServer);
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server ready at http://localhost:${PORT}${apolloServer.graphqlPath}`);
        console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}${apolloServer.subscriptionsPath}`);
    });
});
main().catch((err) => {
    console.error(err);
});
//# sourceMappingURL=index.js.map