import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OtpType } from '@prisma/client';
import { Queue } from 'bull';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { compare } from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectQueue('auth') private readonly authQueue: Queue,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);

    console.log(registerDto, 'registerDto');
    const [token, otp] = await Promise.all([
      this.jwtService.signAsync({
        user_id: user.id,
        role: user.role,
      }),
      this.generateOtp(),
    ]);

    await Promise.all([
      this.prisma.otp.create({
        data: {
          user_id: user.id,
          otp,
          type: OtpType.registration,
        },
      }),
      this.authQueue.add('send-verification-email', {
        to: user.email,
        otp,
      }),
    ]);
    return { token };
  }
  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          {
            email: loginDto.username,
          },
          {
            phone_number: loginDto.username,
          },
        ],
      },
    });

    if (!user) {
      throw new NotFoundException(`user ${loginDto.username} not found`);
    }
    if (!(await compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.jwtService.signAsync({
      user_id: user.id,
      role: user.role,
    });
    return { token };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otp = await this.generateOtp();

    await this.prisma.otp.create({
      data: {
        otp,
        user_id: user.id,
        type: OtpType.reset,
      },
    });

    await this.authQueue.add('send-reset-password-email', {
      to: email,
      otp,
    });

    return { message: 'A reset password OTP has been sent to your email' };
  }

  async verifyResetOtp(verifyOtpDto: VerifyOtpDto) {
    const { otp, user_id } = verifyOtpDto;
    const user = await this.prisma.user.findUnique({ where: { id: user_id } });
    if (!user) throw new NotFoundException('User not found');

    const otpRecord = await this.prisma.otp.findFirst({
      where: {
        user_id: user.id,
        otp,
        type: OtpType.reset,
      },
    });

    if (!otpRecord) throw new BadRequestException('Invalid OTP');

    return { message: 'OTP verified successfully' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    const otpRecord = await this.prisma.otp.findFirst({
      where: {
        user_id: user.id,
        otp,
        type: OtpType.reset,
      },
    });

    if (!otpRecord) throw new BadRequestException('Invalid OTP');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: newPassword },
    });

    return { message: 'Password reset successful' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const { otp, user_id } = dto;
    const otpRecord = await this.prisma.otp.findFirst({
      where: {
        user_id,
        otp,
        type: OtpType.registration,
      },
    });
    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    await this.prisma.otp.delete({ where: { id: otpRecord.id } });
    return { message: 'Email verified successfully' };
  }

  private async generateOtp() {
    let otp: number;
    do {
      otp = Math.floor(100000 + Math.random() * 900000);
      if (
        !(await this.prisma.otp.findFirst({
          where: { otp: otp.toString() },
        }))
      ) {
        return otp.toString();
      }
    } while (true);
  }
}
