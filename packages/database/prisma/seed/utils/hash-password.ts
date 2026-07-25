import * as argon2 from "argon2";

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return argon2.hash(plainTextPassword, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}
