import "reflect-metadata";
import "dotenv-safe/config";
import path from "path";
import { buildSchema } from "type-graphql";

import http from "http";
import { ApolloServer } from "apollo-server-express";
import express, { Request, Response, NextFunction } from "express";

import { HelloResolver } from "./resolvers/hello";
import { MessageResolver } from "./resolvers/message";
import { UserResolver } from "./resolvers/user";
import { createConnection } from "typeorm";
import { User } from "./entities/User";
import { Message } from "./entities/Message";

import cors from "cors";
import jwt from "jsonwebtoken";

import { refreshTokens } from "./utils/auth";
import { ConnectionParams } from "subscriptions-transport-ws";
import { createUserLoader } from "./utils/createUserLoader";

const SECRET = process.env.SECRET;
const SECRET2 = process.env.SECRET2;

const main = async () => {
  await createConnection({
    type: "postgres",
    url: process.env.DATABASE_URL,
    logging: true,
    synchronize: true,
    migrations: [path.join(__dirname, "./migrations/*")],
    entities: [User, Message],
  });

  const PORT = process.env.PORT || 4000;
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    })
  );

  const addUser = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers["x-token"] as string;
    if (token) {
      try {
        const { user } = <any>jwt.verify(token, SECRET as string);
        req.user = user;
      } catch (err) {
        const refreshToken = req.headers["x-refresh-token"];
        const newTokens = await refreshTokens(
          refreshToken as string,
          SECRET as string,
          SECRET2 as string
        );

        if (newTokens?.token && newTokens?.refreshToken) {
          res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
          res.set("x-token", newTokens.token);
          res.set("x-refresh-token", newTokens.refreshToken);
        }
        req.user = newTokens?.user;
      }
    }
    next();
  };

  app.use(addUser);

  const schema = await buildSchema({
    resolvers: [HelloResolver, MessageResolver, UserResolver],
    validate: false,
  });

  const apolloServer = new ApolloServer({
    playground: true,
    introspection: true,
    schema,
    context: (args) => {
      return {
        req: args.req || args.connection?.context.req,
        res: args.res,
        userLoader: createUserLoader(),
        SECRET,
        SECRET2,
      };
    },

    subscriptions: {
      onConnect: async ({ token, refreshToken }: ConnectionParams) => {
        if (token && refreshToken) {
          try {
            const { user } = <any>jwt.verify(token, SECRET as string);
            return {
              req: {
                user,
              },
            };
          } catch (err) {
            const newTokens = await refreshTokens(
              refreshToken,
              SECRET as string,
              SECRET2 as string
            );
            return { req: { user: newTokens?.user } };
          }
        }

        throw new Error(`Unauthorized`);
      },
    },
  });

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  const httpServer = http.createServer(app);
  apolloServer.installSubscriptionHandlers(httpServer);

  // ⚠️ Pay attention to the fact that we are calling `listen` on the http server variable, and not on `app`.
  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Server ready at http://localhost:${PORT}${apolloServer.graphqlPath}`
    );
    console.log(
      `🚀 Subscriptions ready at ws://localhost:${PORT}${apolloServer.subscriptionsPath}`
    );
  });
};

main().catch((err) => {
  console.error(err);
});
