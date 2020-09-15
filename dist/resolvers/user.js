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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserResolver = exports.UsernamePasswordInput = void 0;
const type_graphql_1 = require("type-graphql");
const User_1 = require("../entities/User");
const argon2_1 = __importDefault(require("argon2"));
const validateRegister_1 = require("../utils/validateRegister");
const typeorm_1 = require("typeorm");
const isAuth_1 = require("../middleware/isAuth");
const auth_1 = require("../utils/auth");
let UsernamePasswordInput = class UsernamePasswordInput {
};
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], UsernamePasswordInput.prototype, "email", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], UsernamePasswordInput.prototype, "username", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], UsernamePasswordInput.prototype, "password", void 0);
UsernamePasswordInput = __decorate([
    type_graphql_1.InputType()
], UsernamePasswordInput);
exports.UsernamePasswordInput = UsernamePasswordInput;
let FieldError = class FieldError {
};
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], FieldError.prototype, "field", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], FieldError.prototype, "message", void 0);
FieldError = __decorate([
    type_graphql_1.ObjectType()
], FieldError);
let UserResponse = class UserResponse {
};
__decorate([
    type_graphql_1.Field(() => [FieldError], { nullable: true }),
    __metadata("design:type", Array)
], UserResponse.prototype, "errors", void 0);
__decorate([
    type_graphql_1.Field(() => User_1.User, { nullable: true }),
    __metadata("design:type", User_1.User)
], UserResponse.prototype, "user", void 0);
UserResponse = __decorate([
    type_graphql_1.ObjectType()
], UserResponse);
let LoginResponse = class LoginResponse {
};
__decorate([
    type_graphql_1.Field(() => Boolean),
    __metadata("design:type", Boolean)
], LoginResponse.prototype, "ok", void 0);
__decorate([
    type_graphql_1.Field(() => String, { nullable: true }),
    __metadata("design:type", String)
], LoginResponse.prototype, "token", void 0);
__decorate([
    type_graphql_1.Field(() => String, { nullable: true }),
    __metadata("design:type", String)
], LoginResponse.prototype, "refreshToken", void 0);
__decorate([
    type_graphql_1.Field(() => [FieldError], { nullable: true }),
    __metadata("design:type", Array)
], LoginResponse.prototype, "errors", void 0);
LoginResponse = __decorate([
    type_graphql_1.ObjectType()
], LoginResponse);
let UserResolver = class UserResolver {
    email(user, { req }) {
        if (req.user.id === user.id) {
            return user.email;
        }
        return "";
    }
    me({ req }) {
        if (!req.user) {
            return null;
        }
        return User_1.User.findOne(req.user.id);
    }
    register(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const errors = validateRegister_1.validateRegister(options);
            if (errors) {
                return { errors };
            }
            const hashedPassword = yield argon2_1.default.hash(options.password);
            let user;
            try {
                const result = yield typeorm_1.getConnection()
                    .createQueryBuilder()
                    .insert()
                    .into(User_1.User)
                    .values({
                    username: options.username,
                    email: options.email,
                    password: hashedPassword,
                })
                    .returning("*")
                    .execute();
                user = result.raw[0];
            }
            catch (err) {
                if (err.code === "23505") {
                    return {
                        errors: [
                            {
                                field: "username",
                                message: "username already taken",
                            },
                        ],
                    };
                }
            }
            return { user };
        });
    }
    login(usernameOrEmail, password, { SECRET, SECRET2 }) {
        return __awaiter(this, void 0, void 0, function* () {
            const { ok, token, refreshToken, errors } = yield auth_1.tryLogin(usernameOrEmail, password, SECRET, SECRET2);
            return {
                ok,
                token,
                refreshToken,
                errors,
            };
        });
    }
    logout({ req, res }) {
    }
    users({ req }) {
        return User_1.User.find({ where: { id: typeorm_1.Not(req.user.id) } });
    }
    user(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield User_1.User.findOne(userId);
            if (!user)
                throw new Error("no user");
            return {
                user,
            };
        });
    }
};
__decorate([
    type_graphql_1.FieldResolver(() => String),
    __param(0, type_graphql_1.Root()), __param(1, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [User_1.User, Object]),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "email", null);
__decorate([
    type_graphql_1.Query(() => User_1.User, { nullable: true }),
    __param(0, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "me", null);
__decorate([
    type_graphql_1.Mutation(() => UserResponse),
    __param(0, type_graphql_1.Arg("options")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UsernamePasswordInput]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "register", null);
__decorate([
    type_graphql_1.Mutation(() => LoginResponse),
    __param(0, type_graphql_1.Arg("usernameOrEmail")),
    __param(1, type_graphql_1.Arg("password")),
    __param(2, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "login", null);
__decorate([
    type_graphql_1.Mutation(() => Boolean),
    __param(0, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "logout", null);
__decorate([
    type_graphql_1.Query(() => [User_1.User]),
    type_graphql_1.UseMiddleware(isAuth_1.isAuth),
    __param(0, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "users", null);
__decorate([
    type_graphql_1.Query(() => UserResponse),
    type_graphql_1.UseMiddleware(isAuth_1.isAuth),
    __param(0, type_graphql_1.Arg("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "user", null);
UserResolver = __decorate([
    type_graphql_1.Resolver(User_1.User)
], UserResolver);
exports.UserResolver = UserResolver;
//# sourceMappingURL=user.js.map