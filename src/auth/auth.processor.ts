import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';

interface EmailJobData {
  to: string;
  otp: string;
}

@Processor('auth')
@Injectable()
export class AuthProcessor {
  private createTransporter() {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SENDGRID_FROM_EMAIL,
        pass: process.env.GOOGLE_APP_PASSWORD,
      },
    });
  }

  // @Process('send-verification-email')
  // async handleSendVerificationEmail(job: Job<EmailJobData>): Promise<void> {
  //   const {
  //     data: { to, otp },
  //   } = job;

  //   try {
  //     const transporter = this.createTransporter();

  //     await transporter.sendMail({
  //       from: process.env.SENDGRID_FROM_EMAIL,
  //       to,
  //       subject: '🌸 Luna - Verify Your Email',
  //       html: `
  //         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fef7f7;">
  //           <div style="text-align: center; margin-bottom: 30px;">
  //             <h1 style="color: #e91e63; margin: 0;">🌸 Luna</h1>
  //             <p style="color: #666; margin: 5px 0 0 0;">Your Period Tracking Companion</p>
  //           </div>

  //           <div style="background: white; padding: 30px; border-radius: 10px; border-left: 4px solid #e91e63;">
  //             <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
  //             <p style="color: #666; line-height: 1.6;">Welcome to Luna! Please use the verification code below to complete your registration:</p>

  //             <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
  //               <div style="font-size: 32px; font-weight: bold; color: #e91e63; letter-spacing: 5px;">${otp}</div>
  //             </div>

  //             <p style="color: #666; line-height: 1.6;">This code will expire in 10 minutes for your security.</p>
  //             <p style="color: #666; line-height: 1.6;">If you didn't create an account with Luna, please ignore this email.</p>
  //           </div>

  //           <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
  //             <p>This email was sent by Luna Period Tracker</p>
  //           </div>
  //         </div>
  //       `,
  //     });

  //     console.log(`Verification email sent successfully to ${to}`);
  //   } catch (error: unknown) {
  //     const errorMessage =
  //       error instanceof Error ? error.message : 'Unknown error occurred';
  //     console.error('Email Error:', errorMessage);
  //   }
  // }

  @Process('send-reset-password-email')
  async handleSendResetPasswordEmail(job: Job<EmailJobData>): Promise<void> {
    const {
      data: { to, otp },
    } = job;

    try {
      const transporter = this.createTransporter();

      await transporter.sendMail({
        from: process.env.SENDGRID_FROM_EMAIL,
        to,
        subject: '🔒 Luna - Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fef7f7;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #e91e63; margin: 0;">🌸 Luna</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Your Period Tracking Companion</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 10px; border-left: 4px solid #e91e63;">
              <h2 style="color: #333; margin-top: 0;">🔒 Password Reset Request</h2>
              <p style="color: #666; line-height: 1.6;">We received a request to reset your password. Use the code below to create a new password:</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <div style="font-size: 32px; font-weight: bold; color: #e91e63; letter-spacing: 5px;">${otp}</div>
              </div>
              
              <p style="color: #666; line-height: 1.6;">This code will expire in 10 minutes for your security.</p>
              <p style="color: #666; line-height: 1.6;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>This email was sent by Luna Period Tracker</p>
            </div>
          </div>
        `,
      });

      console.log(`Password reset email sent successfully to ${to}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Email Error:', errorMessage);
    }
  }
}
