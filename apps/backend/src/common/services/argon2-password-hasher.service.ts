import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { IPasswordHasher } from "./password-hasher.interface";

@Injectable()
export class Argon2PasswordHasherService implements IPasswordHasher {
  async hash(plainText: string): Promise<string> {
    return argon2.hash(plainText, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });
  }

  async verify(hash: string, plainText: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainText);
    } catch {
      return false;
    }
  }
}
