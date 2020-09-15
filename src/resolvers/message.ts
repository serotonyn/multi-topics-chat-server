import {
  Arg,
  Ctx,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  FieldResolver,
  Root,
  Subscription,
  PubSub,
  Publisher,
  UseMiddleware,
} from "type-graphql";
import { getConnection } from "typeorm";
import { Message } from "../entities/Message";

import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";
import { User } from "../entities/User";

@InputType()
class MessageInput {
  @Field()
  text: string;
  @Field()
  topic: string;
  @Field()
  isNewTopic: boolean;
  @Field()
  color: string;
  @Field({ nullable: false })
  otherUserId: number;
}

@ObjectType()
class PaginatedMessages {
  @Field(() => [Message])
  messages: Message[];
  @Field()
  hasMore: boolean;
}
@ObjectType()
class Topic {
  @Field()
  label: string;
  @Field()
  color: string;
}

const CREATE_NEW_MESSAGE = "CREATE_NEW_MESSAGE";

@Resolver(Message)
export class MessageResolver {
  @FieldResolver(() => User)
  user(@Root() message: Message, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(message.userId);
  }
  //TODO check if it return the correct otheruser
  @FieldResolver(() => User)
  otherUser(@Root() message: Message, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(message.otherUserId);
  }

  @Query(() => PaginatedMessages)
  async messages(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
    @Arg("otherUserId", () => Int) otherUserId: number,
    @Ctx() { req }: MyContext
  ): Promise<PaginatedMessages> {
    // 20 -> 21
    const realLimit = Math.min(50, limit);
    const reaLimitPlusOne = realLimit + 1;

    const replacements: any[] = [reaLimitPlusOne];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const messages = await getConnection().query(
      `
    select m.*
    from message m
    where (m."userId" = ${req.user.id} AND m."otherUserId" = ${otherUserId}
    ${cursor ? `AND m."createdAt" < $2` : ""}
    )
    OR ( m."userId" = ${otherUserId} AND m."otherUserId" = ${req.user.id}
    ${cursor ? `AND m."createdAt" < $2` : ""}
      )
    order by m."createdAt" DESC
    limit $1
    `,
      replacements
    );

    return {
      messages: messages.slice(0, realLimit),
      hasMore: messages.length === reaLimitPlusOne,
    };
  }

  @Query(() => Message, { nullable: true })
  @UseMiddleware(isAuth)
  async message(
    @Arg("id", () => Int) id: number
  ): Promise<Message | undefined> {
    return Message.findOne(id);
  }

  @Query(() => [Topic], { nullable: true })
  @UseMiddleware(isAuth)
  async topics(
    @Arg("otherUserId", () => Int) otherUserId: number,
    @Ctx() { req }: MyContext
  ): Promise<[Topic] | []> {
    const messages = await getConnection().query(
      `
    select m.*
    from message m
    where (m."userId" = ${req.user.id} AND m."otherUserId" = ${otherUserId})
    OR ( m."userId" = ${otherUserId} AND m."otherUserId" = ${req.user.id})
    `
    );
    if (!messages || !messages.length) return [];

    const uniqTopics = [
      //@ts-ignore
      ...new Set([...messages.map((m) => m.topic)]),
    ];
    const opts = uniqTopics.map((t) => {
      return {
        //@ts-ignore
        color: messages.find((m) => m.topic === t).color,
        topic: t,
      };
    });
    //@ts-ignore
    const topics = opts.map((o) => ({
      label: o.topic,
      color: o.color,
    }));
    //@ts-ignore
    return topics;
  }

  @Mutation(() => Message)
  @UseMiddleware(isAuth)
  async createMessage(
    @PubSub(CREATE_NEW_MESSAGE)
    publish: Publisher<Partial<Message> & { isNewTopic: boolean }>,
    @Arg("input") input: MessageInput,
    @Ctx() { req }: MyContext
  ): Promise<Message> {
    const curUser = await User.findOne(req.user.id);
    // if (!curUser) throw new Error("not authorized");
    const otherUser = await User.findOne(input.otherUserId);
    if (!otherUser) throw new Error("not authorized");

    const message = await Message.create({
      text: input.text,
      topic: input.topic,
      color: input.color,
      user: curUser,
      otherUser: otherUser,
    }).save();

    await publish({ ...message, isNewTopic: input.isNewTopic });

    return message;
  }

  @Subscription({
    topics: CREATE_NEW_MESSAGE,
    filter: ({ payload, context }) =>
      context.req.user.id === payload.otherUser.id,
  })
  @UseMiddleware(isAuth)
  newMessageSubscription(
    @Root() newMessage: Message & { isNewTopic: boolean }
  ): Message {
    // TODO
    delete newMessage["isNewTopic"];
    return newMessage;
  }

  @Subscription({
    topics: CREATE_NEW_MESSAGE,
    filter: ({ payload }) => payload.isNewTopic,
  })
  @UseMiddleware(isAuth)
  newTopicSubscription(@Root() newMessage: Message): Topic {
    return {
      label: newMessage.topic,
      color: newMessage.color,
    };
  }
}
