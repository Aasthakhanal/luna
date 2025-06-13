import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

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
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
      await sgMail.send({
        to,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: 'Reset your password',
        templateId: process.env.SENDGRID_RESET_PASSWORD_TEMPLATE_ID!,
        dynamicTemplateData: {
          otp,
        },
      });
    } catch (e) {
      console.error('SendGrid Error:', e.response?.body || e.message);
    }
  }
}
