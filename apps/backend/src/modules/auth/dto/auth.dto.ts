import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { RegisterPayload, LoginPayload, VerifyEmailPayload, ForgotPasswordPayload, ResetPasswordPayload, ChangePasswordPayload, RefreshTokenPayload } from '@nos/shared-types';

export class RegisterDto implements RegisterPayload {
  @ApiProperty({ example: 'admin@nos.internal', description: 'User corporate email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'SecureP@ss123!', description: 'Strong password (minimum 8 characters)' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  @ApiProperty({ example: 'Alex', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Mercer', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;
}

export class LoginDto implements LoginPayload {
  @ApiProperty({ example: 'admin@nos.internal' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'SecureP@ss123!' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class VerifyEmailDto implements VerifyEmailPayload {
  @ApiProperty({ example: 'admin@nos.internal' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '123456', description: '6-digit SMTP verification OTP' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp!: string;
}

export class ForgotPasswordDto implements ForgotPasswordPayload {
  @ApiProperty({ example: 'admin@nos.internal' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class ResetPasswordDto implements ResetPasswordPayload {
  @ApiProperty({ example: 'admin@nos.internal' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp!: string;

  @ApiProperty({ example: 'NewSecureP@ss456!' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  newPassword!: string;
}

export class ChangePasswordDto implements ChangePasswordPayload {
  @ApiProperty({ example: 'SecureP@ss123!' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ example: 'NewSecureP@ss456!' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  newPassword!: string;
}

export class RefreshDto implements RefreshTokenPayload {
  @ApiProperty({ description: 'Active refresh token string' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
