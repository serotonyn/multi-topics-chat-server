import {
  Resolver,
  Mutation,
  Arg,
  Field,
  InputType,
  Ctx,
  ObjectType,
  Query,
  FieldResolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { MyContext } from "../types";
import { User } from "../entities/User";
import argon2 from "argon2";
import { validateRegister } from "../utils/validateRegister";
import { getConnection, Not } from "typeorm";
import { isAuth } from "../middleware/isAuth";
import { tryLogin } from "../utils/auth";

@InputType()
export class UsernamePasswordInput {
  @Field()
  email: string;
  @Field()
  username: string;
  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@ObjectType()
class LoginResponse {
  @Field(() => Boolean)
  ok: boolean;

  @Field(() => String, { nullable: true })
  token?: string;

  @Field(() => String, { nullable: true })
  refreshToken?: string;

  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
}

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    if (req.user.id === user.id) {
      return user.email;
    }
    return "";
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    // you are not logged in
    if (!req.user) {
      return null;
    }

    return User.findOne(req.user.id);
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput
  ): Promise<UserResponse> {
    const errors = validateRegister(options);
    if (errors) {
      return { errors };
    }

    const hashedPassword = await argon2.hash(options.password);
    let user;
    try {
      // User.create({}).save()
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: options.username,
          email: options.email,
          password: hashedPassword,
        })
        .returning("*")
        .execute();
      user = result.raw[0];
    } catch (err) {
      //|| err.detail.includes("already exists")) {
      // duplicate username error
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
  }

  @Mutation(() => LoginResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { SECRET, SECRET2 }: MyContext
  ): Promise<LoginResponse> {
    const { ok, token, refreshToken, errors } = await tryLogin(
      usernameOrEmail,
      password,
      SECRET,
      SECRET2
    );

    return {
      ok,
      token,
      refreshToken,
      errors,
    };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    // return new Promise((resolve) =>
    //   req.session.destroy((err) => {
    //     res.clearCookie(COOKIE_NAME);
    //     if (err) {
    //       console.log(err);
    //       resolve(false);
    //       return;
    //     }
    //     resolve(true);
    //   })
    // );
  }

  @Query(() => [User])
  @UseMiddleware(isAuth)
  users(@Ctx() { req }: MyContext): Promise<User[]> {
    return User.find({ where: { id: Not(req.user.id) } });
  }

  @Query(() => UserResponse)
  @UseMiddleware(isAuth)
  async user(@Arg("userId") userId: string): Promise<UserResponse> {
    const user = await User.findOne(userId);
    if (!user) throw new Error("no user");
    return {
      user,
    };
  }
}
