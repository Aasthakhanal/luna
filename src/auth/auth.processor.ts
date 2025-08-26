import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import * as nodemailer from 'nodemailer';

@Processor('auth')
@Injectable()
export class AuthProcessor {
  @Process('send-verification-email')
  async handleSendVerificationEmail(job: any) {
    const {
      data: { to, otp },
    } = job;

    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
      await sgMail.send({
        to,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: 'Verify your email',
        templateId: process.env.SENDGRID_VERIFY_EMAIL_TEMPLATE_ID!,
        dynamicTemplateData: {
          otp,
        },
      });
    } catch (e) {
      console.error('SendGrid Error:', e.response?.body || e.message);
    }
  }

  @Process('send-reset-password-email')
  async handleSendResetPasswordEmail(job: any) {
    const {
      data: { to, otp },
    } = job;

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'aasthakhanal02@gmail.com',
          pass: process.env.GOOGLE_APP_PASSWORD,
        },
      });

      var message = {
        to,
        from: 'aasthakhanal02@gmail.com',
        subject: 'Reset Your Password',
        text: `Please use OTP: ${otp} to reset your password.`,
      };

      await transporter.sendMail(message);
    } catch (e) {
      console.error('Nodemailer Error:', e.message);
    }
  }
}
