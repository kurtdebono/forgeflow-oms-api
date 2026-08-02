export type SendEmailInput = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};
export interface EmailProvider {
    sendEmail(input: SendEmailInput): Promise<void>;
}
export declare const EMAIL_PROVIDER: unique symbol;
