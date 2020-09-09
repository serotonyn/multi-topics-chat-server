"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageResolver = void 0;
const type_graphql_1 = require("type-graphql");
const typeorm_1 = require("typeorm");
const Message_1 = require("../entities/Message");
const isAuth_1 = require("../middleware/isAuth");
const User_1 = require("../entities/User");
let MessageInput = class MessageInput {
};
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], MessageInput.prototype, "text", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], MessageInput.prototype, "topic", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", Boolean)
], MessageInput.prototype, "isNewTopic", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], MessageInput.prototype, "color", void 0);
__decorate([
    type_graphql_1.Field({ nullable: false }),
    __metadata("design:type", Number)
], MessageInput.prototype, "otherUserId", void 0);
MessageInput = __decorate([
    type_graphql_1.InputType()
], MessageInput);
let PaginatedMessages = class PaginatedMessages {
};
__decorate([
    type_graphql_1.Field(() => [Message_1.Message]),
    __metadata("design:type", Array)
], PaginatedMessages.prototype, "messages", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", Boolean)
], PaginatedMessages.prototype, "hasMore", void 0);
PaginatedMessages = __decorate([
    type_graphql_1.ObjectType()
], PaginatedMessages);
let Topic = class Topic {
};
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], Topic.prototype, "label", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], Topic.prototype, "color", void 0);
Topic = __decorate([
    type_graphql_1.ObjectType()
], Topic);
const CREATE_NEW_MESSAGE = "CREATE_NEW_MESSAGE";
let MessageResolver = class MessageResolver {
    user(message, { userLoader }) {
        return userLoader.load(message.userId);
    }
    otherUser(message, { userLoader }) {
        return userLoader.load(message.otherUserId);
    }
    messages(limit, offset, otherUserId, { req }) {
        return __awaiter(this, void 0, void 0, function* () {
            const realLimit = Math.min(50, limit);
            const realLimitPlusOne = realLimit + 1;
            const replacements = [realLimitPlusOne];
            if (offset) {
                replacements.push(offset);
            }
            const messages = yield typeorm_1.getConnection().query(`
    select m.*
    from message m
    where (m."userId" = ${req.session.userId} AND m."otherUserId" = ${otherUserId}
    )
    OR ( m."userId" = ${otherUserId} AND m."otherUserId" = ${req.session.userId}
      )
    order by m."createdAt" DESC
    limit $1
    ${offset ? `offset $2` : ""}
    `, replacements);
            return {
                messages: messages.slice(0, realLimit),
                hasMore: messages.length === realLimitPlusOne,
            };
        });
    }
    message(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return Message_1.Message.findOne(id);
        });
    }
    topics(otherUserId, { req }) {
        return __awaiter(this, void 0, void 0, function* () {
            const messages = yield typeorm_1.getConnection().query(`
    select m.*
    from message m
    where (m."userId" = ${req.session.userId} AND m."otherUserId" = ${otherUserId})
    OR ( m."userId" = ${otherUserId} AND m."otherUserId" = ${req.session.userId})
    `);
            if (!messages || !messages.length)
                return [];
            const uniqTopics = [
                ...new Set([...messages.map((m) => m.topic)]),
            ];
            const opts = uniqTopics.map((t) => {
                return {
                    color: messages.find((m) => m.topic === t).color,
                    topic: t,
                };
            });
            const topics = opts.map((o) => ({
                label: o.topic,
                color: o.color,
            }));
            return topics;
        });
    }
    createMessage(publish, input, { req }) {
        return __awaiter(this, void 0, void 0, function* () {
            const curUser = yield User_1.User.findOne(req.session.userId);
            const otherUser = yield User_1.User.findOne(input.otherUserId);
            if (!otherUser)
                throw new Error("not authorized");
            const message = yield Message_1.Message.create({
                text: input.text,
                topic: input.topic,
                color: input.color,
                user: curUser,
                otherUser: otherUser,
            }).save();
            yield publish(Object.assign(Object.assign({}, message), { isNewTopic: input.isNewTopic }));
            return message;
        });
    }
    newMessageSubscription(newMessage) {
        delete newMessage["isNewTopic"];
        return newMessage;
    }
    newTopicSubscription(newMessage) {
        return {
            label: newMessage.topic,
            color: newMessage.color,
        };
    }
};
__decorate([
    type_graphql_1.FieldResolver(() => User_1.User),
    __param(0, type_graphql_1.Root()), __param(1, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Message_1.Message, Object]),
    __metadata("design:returntype", void 0)
], MessageResolver.prototype, "user", null);
__decorate([
    type_graphql_1.FieldResolver(() => User_1.User),
    __param(0, type_graphql_1.Root()), __param(1, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Message_1.Message, Object]),
    __metadata("design:returntype", void 0)
], MessageResolver.prototype, "otherUser", null);
__decorate([
    type_graphql_1.Query(() => PaginatedMessages),
    type_graphql_1.UseMiddleware(isAuth_1.isAuth),
    __param(0, type_graphql_1.Arg("limit", () => type_graphql_1.Int)),
    __param(1, type_graphql_1.Arg("offset", () => type_graphql_1.Int, { nullable: true })),
    __param(2, type_graphql_1.Arg("otherUserId", () => type_graphql_1.Int)),
    __param(3, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Number, Object]),
    __metadata("design:returntype", Promise)
], MessageResolver.prototype, "messages", null);
__decorate([
    type_graphql_1.Query(() => Message_1.Message, { nullable: true }),
    type_graphql_1.UseMiddleware(isAuth_1.isAuth),
    __param(0, type_graphql_1.Arg("id", () => type_graphql_1.Int)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MessageResolver.prototype, "message", null);
__decorate([
    type_graphql_1.Query(() => [Topic], { nullable: true }),
    type_graphql_1.UseMiddleware(isAuth_1.isAuth),
    __param(0, type_graphql_1.Arg("otherUserId", () => type_graphql_1.Int)),
    __param(1, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], MessageResolver.prototype, "topics", null);
__decorate([
    type_graphql_1.Mutation(() => Message_1.Message),
    type_graphql_1.UseMiddleware(isAuth_1.isAuth),
    __param(0, type_graphql_1.PubSub(CREATE_NEW_MESSAGE)),
    __param(1, type_graphql_1.Arg("input")),
    __param(2, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, MessageInput, Object]),
    __metadata("design:returntype", Promise)
], MessageResolver.prototype, "createMessage", null);
__decorate([
    type_graphql_1.Subscription({
        topics: CREATE_NEW_MESSAGE,
        filter: ({ payload, context }) => context.req.session.userId === payload.otherUser.id,
    }),
    type_graphql_1.UseMiddleware(isAuth_1.isAuth),
    __param(0, type_graphql_1.Root()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Message_1.Message)
], MessageResolver.prototype, "newMessageSubscription", null);
__decorate([
    type_graphql_1.Subscription({
        topics: CREATE_NEW_MESSAGE,
        filter: ({ payload }) => payload.isNewTopic,
    }),
    type_graphql_1.UseMiddleware(isAuth_1.isAuth),
    __param(0, type_graphql_1.Root()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Message_1.Message]),
    __metadata("design:returntype", Topic)
], MessageResolver.prototype, "newTopicSubscription", null);
MessageResolver = __decorate([
    type_graphql_1.Resolver(Message_1.Message)
], MessageResolver);
exports.MessageResolver = MessageResolver;
//# sourceMappingURL=message.js.map