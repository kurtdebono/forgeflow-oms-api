import { EmailProvider, SendEmailInput } from './email-provider.interface';
export declare class FakeEmailProvider implements EmailProvider {
    private readonly logger;
    sendEmail(input: SendEmailInput): Promise<void>;
}
