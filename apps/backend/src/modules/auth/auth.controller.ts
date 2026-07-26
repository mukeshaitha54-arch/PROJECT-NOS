import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, VerifyEmailDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto, RefreshDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, ApiResponse } from '@nos/shared-types';

@ApiTags('Authentication & Identity')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new enterprise user account' })
  @SwaggerResponse({ status: 201, description: 'User account registered and OTP sent via SMTP.' })
  async register(@Body() dto: RegisterDto): Promise<ApiResponse> {
    const result = await this.authService.register(dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and issue JWT access and refresh tokens' })
  @SwaggerResponse({ status: 200, description: 'JWT tokens and user session data issued.' })
  async login(@Body() dto: LoginDto): Promise<ApiResponse> {
    const result = await this.authService.login(dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify account email using SMTP OTP' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<ApiResponse> {
    const result = await this.authService.verifyEmail(dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate and refresh JWT session token' })
  async refresh(@Body() dto: RefreshDto): Promise<ApiResponse> {
    const result = await this.authService.refresh(dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP sent via SMTP' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ApiResponse> {
    const result = await this.authService.forgotPassword(dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset account password with OTP verification' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<ApiResponse> {
    const result = await this.authService.resetPassword(dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for currently authenticated user' })
  async changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto): Promise<ApiResponse> {
    const result = await this.authService.changePassword(user, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke all active session refresh tokens' })
  async logout(@CurrentUser() user: User): Promise<ApiResponse> {
    const result = await this.authService.logout(user);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
