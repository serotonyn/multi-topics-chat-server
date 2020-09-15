import { Request, Response } from "express";
import { User } from "./entities/User";
import { createUserLoader } from "./utils/createUserLoader";
// import { createUpdootLoader } from "./utils/createUpdootLoader";

export type MyContext = {
  req: Request & { user: User };
  res: Response;
  user: { id: number; username: string; email: string };
  userLoader: ReturnType<typeof createUserLoader>;
  SECRET: string;
  SECRET2: string;
};
