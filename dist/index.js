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
const cors_1 = __importDefault(require("cors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("./utils/auth");
const createUserLoader_1 = require("./utils/createUserLoader");
const SECRET = process.env.SECRET;
const SECRET2 = process.env.SECRET2;
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
    const PORT = process.env.PORT || 4000;
    const app = express_1.default();
    app.set("trust proxy", 1);
    app.use(cors_1.default({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    }));
    const addUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const token = req.headers["x-token"];
        if (token) {
            try {
                const { user } = jsonwebtoken_1.default.verify(token, SECRET);
                req.user = user;
            }
            catch (err) {
                const refreshToken = req.headers["x-refresh-token"];
                const newTokens = yield auth_1.refreshTokens(token, refreshToken, SECRET, SECRET2);
                if (newTokens.token && newTokens.refreshToken) {
                    res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
                    res.set("x-token", newTokens.token);
                    res.set("x-refresh-token", newTokens.refreshToken);
                }
                req.user = newTokens.user;
            }
        }
        next();
    });
    app.use(addUser);
    const schema = yield type_graphql_1.buildSchema({
        resolvers: [hello_1.HelloResolver, message_1.MessageResolver, user_1.UserResolver],
        validate: false,
    });
    const apolloServer = new apollo_server_express_1.ApolloServer({
        playground: true,
        schema,
        context: (args) => {
            var _a;
            return {
                req: args.req || ((_a = args.connection) === null || _a === void 0 ? void 0 : _a.context.req),
                res: args.res,
                userLoader: createUserLoader_1.createUserLoader(),
                SECRET,
                SECRET2,
            };
        },
        subscriptions: {
            onConnect: ({ token, refreshToken }) => __awaiter(void 0, void 0, void 0, function* () {
                if (token && refreshToken) {
                    try {
                        const { user } = jsonwebtoken_1.default.verify(token, SECRET);
                        return {
                            req: {
                                user,
                            },
                        };
                    }
                    catch (err) {
                        const newTokens = yield auth_1.refreshTokens(token, refreshToken, SECRET, SECRET2);
                        return { req: { user: newTokens.user } };
                    }
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