import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from 'src/helpers/public';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtPayload } from 'src/interfaces/jwt-payload';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('verify')
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Req() request: JwtPayload,
  ) {
    verifyOtpDto.user_id = request.payload.user_id;
    return this.authService.verifyOtp(verifyOtpDto);
  }
  // Forgot Password
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Public()
  @Post('verify-reset-otp')
  async verifyResetOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyResetOtp(verifyOtpDto);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body('email') email: string,
    @Body('otp') otp: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(email, otp, newPassword);
  }

  @Public()
  @Post('resend-reset-otp')
  async resendResetOtp(@Body('email') email: string) {
    return this.authService.resendResetOtp(email);
  }
}
