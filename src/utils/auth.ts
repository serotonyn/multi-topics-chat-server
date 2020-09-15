import jwt from "jsonwebtoken";
import _ from "lodash";
import argon2 from "argon2";
import { User } from "../entities/User";

export const createTokens = async (
  user: { id: number },
  secret: string,
  secret2: string
) => {
  const createToken = jwt.sign(
    {
      user: _.pick(user, ["id"]),
    },
    secret,
    {
      expiresIn: "90h",
    }
  );

  const createRefreshToken = jwt.sign(
    {
      user: _.pick(user, "id"),
    },
    secret2,
    {
      expiresIn: "7d",
    }
  );

  return [createToken, createRefreshToken];
};

export const refreshTokens: (
  refreshToken: string,
  SECRET: string,
  SECRET2: string
) => Promise<
  { token: string; refreshToken: string; user: User } | undefined
> = async (refreshToken, SECRET, SECRET2) => {
  let userId = 0;
  try {
    const {
      user: { id },
    } = jwt.decode(refreshToken);
    userId = id;
  } catch (err) {
    return undefined;
  }

  if (!userId) {
    return undefined;
  }

  const user = await User.findOne({ where: { id: userId } });

  if (!user) {
    return undefined;
  }

  const refreshSecret = user.password + SECRET2;

  try {
    jwt.verify(refreshToken, refreshSecret);
  } catch (err) {
    return undefined;
  }

  const [newToken, newRefreshToken] = await createTokens(
    user,
    SECRET,
    refreshSecret
  );
  return {
    token: newToken,
    refreshToken: newRefreshToken,
    user,
  };
};

export const tryLogin = async (
  usernameOrEmail: string,
  password: string,
  SECRET: string,
  SECRET2: string
) => {
  const user = await User.findOne(
    usernameOrEmail.includes("@")
      ? { where: { email: usernameOrEmail } }
      : { where: { username: usernameOrEmail } }
  );
  if (!user) {
    // user with provided email not found
    return {
      ok: false,
      errors: [{ field: "usernameOrEmail", message: "Wrong email" }],
    };
  }

  const valid = await argon2.verify(user.password, password);
  if (!valid) {
    // bad password
    return {
      ok: false,
      errors: [{ field: "password", message: "Wrong password" }],
    };
  }

  const refreshTokenSecret = user.password + SECRET2;

  const [token, refreshToken] = await createTokens(
    user,
    SECRET,
    refreshTokenSecret
  );

  return {
    ok: true,
    token,
    refreshToken,
  };
};
