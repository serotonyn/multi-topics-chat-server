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
exports.tryLogin = exports.refreshTokens = exports.createTokens = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const lodash_1 = __importDefault(require("lodash"));
const argon2_1 = __importDefault(require("argon2"));
const User_1 = require("../entities/User");
exports.createTokens = (user, secret, secret2) => __awaiter(void 0, void 0, void 0, function* () {
    const createToken = jsonwebtoken_1.default.sign({
        user: lodash_1.default.pick(user, ["id"]),
    }, secret, {
        expiresIn: "90h",
    });
    const createRefreshToken = jsonwebtoken_1.default.sign({
        user: lodash_1.default.pick(user, "id"),
    }, secret2, {
        expiresIn: "7d",
    });
    return [createToken, createRefreshToken];
});
exports.refreshTokens = (refreshToken, SECRET, SECRET2) => __awaiter(void 0, void 0, void 0, function* () {
    let userId = 0;
    try {
        const { user: { id }, } = jsonwebtoken_1.default.decode(refreshToken);
        userId = id;
    }
    catch (err) {
        return undefined;
    }
    if (!userId) {
        return undefined;
    }
    const user = yield User_1.User.findOne({ where: { id: userId } });
    if (!user) {
        return undefined;
    }
    const refreshSecret = user.password + SECRET2;
    try {
        jsonwebtoken_1.default.verify(refreshToken, refreshSecret);
    }
    catch (err) {
        return undefined;
    }
    const [newToken, newRefreshToken] = yield exports.createTokens(user, SECRET, refreshSecret);
    return {
        token: newToken,
        refreshToken: newRefreshToken,
        user,
    };
});
exports.tryLogin = (usernameOrEmail, password, SECRET, SECRET2) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield User_1.User.findOne(usernameOrEmail.includes("@")
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } });
    if (!user) {
        return {
            ok: false,
            errors: [{ field: "usernameOrEmail", message: "Wrong email" }],
        };
    }
    const valid = yield argon2_1.default.verify(user.password, password);
    if (!valid) {
        return {
            ok: false,
            errors: [{ field: "password", message: "Wrong password" }],
        };
    }
    const refreshTokenSecret = user.password + SECRET2;
    const [token, refreshToken] = yield exports.createTokens(user, SECRET, refreshTokenSecret);
    return {
        ok: true,
        token,
        refreshToken,
    };
});
//# sourceMappingURL=auth.js.map