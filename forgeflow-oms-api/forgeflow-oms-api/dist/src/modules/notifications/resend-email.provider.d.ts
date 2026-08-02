import { EmailProvider, SendEmailInput } from './email-provider.interface';
export declare class ResendEmailProvider implements EmailProvider {
    private readonly resend;
    private readonly fromEmail;
    constructor();
    sendEmail(input: SendEmailInput): Promise<void>;
}
