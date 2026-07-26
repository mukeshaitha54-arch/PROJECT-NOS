import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaUserRepository } from '../../database/repositories/prisma-user.repository';
import { PrismaTokenRepository } from '../../database/repositories/prisma-token.repository';
import { Argon2PasswordHasherService } from '../../common/services/argon2-password-hasher.service';
import { SmtpMailService } from '../../common/services/smtp-mail.service';
import { IUserRepositoryToken } from '../../common/repositories/user.repository.interface';
import { ITokenRepositoryToken } from '../../common/repositories/token.repository.interface';
import { IPasswordHasherToken } from '../../common/services/password-hasher.interface';
import { IMailServiceToken } from '../../common/services/mail-service.interface';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'nos_super_secret_jwt_key_32_chars_min_length_value!'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: IUserRepositoryToken, useClass: PrismaUserRepository },
    { provide: ITokenRepositoryToken, useClass: PrismaTokenRepository },
    { provide: IPasswordHasherToken, useClass: Argon2PasswordHasherService },
    { provide: IMailServiceToken, useClass: SmtpMailService },
  ],
  exports: [AuthService, JwtModule, IUserRepositoryToken, ITokenRepositoryToken, IPasswordHasherToken, IMailServiceToken],
})
export class AuthModule {}
