import { BadGatewayException, Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailProvider, SendEmailInput } from './email-provider.interface';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
    private readonly resend: Resend;
    private readonly fromEmail: string;

    constructor() {
        const apiKey = process.env.RESEND_API_KEY;

        if(!apiKey) {
            throw new Error('RESEND_API_KEY is not defined.');
        }

        this.fromEmail = process.env.RESEND_FROM_EMAIL ?? 'ForgeFlow <onboarding@resend.dev>';

        this.resend = new Resend(apiKey);
    }

    async sendEmail(input: SendEmailInput): Promise<void> {
        const { error } = await this.resend.emails.send({
            from: this.fromEmail,
            to: input.to,
            subject: input.subject,
            html: input.html,
            text: input.text
        });

        if (error) {
            throw new BadGatewayException(
                `Failed to send email via Resend: ${error.message}`
            );
        }
    }
}