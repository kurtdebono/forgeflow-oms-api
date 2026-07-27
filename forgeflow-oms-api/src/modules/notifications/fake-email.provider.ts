import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider, SendEmailInput } from './email-provider.interface';

@Injectable()
export class FakeEmailProvider implements EmailProvider {
    private readonly logger = new Logger(FakeEmailProvider.name);

    async sendEmail(input: SendEmailInput): Promise<void> {
        this.logger.log(
            `Fake email sent to ${input.to}: ${input.subject}`
        );
    }
}