import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {

  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async sendEmail(to: string, subject: string, html: string) {
    await sgMail.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
  }
}