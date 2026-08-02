import { Inject, Injectable, Logger } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email-provider.interface';
import type { EmailProvider } from './email-provider.interface';

type ManualReviewAlertInput = {
  orderId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  riskFlags: string[];
  recommendedActions: string[];
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
  ) {}

  async sendManualReviewAlert(input: ManualReviewAlertInput): Promise<void> {
    const to = process.env.OPS_REVIEW_EMAIL;

    if (!to) {
      this.logger.warn(
        'OPS_REVIEW_EMAIL is not configured. Manual review alert skipped.',
      );
      return;
    }

    await this.emailProvider.sendEmail({
      to,
      subject: `ForgeFlow manual review required: Order ${input.orderId}`,
      html: `
            <h1>Manual review required</h1>
            <p><strong>Order:</strong> ${input.orderId}</p>
            <p><strong>Priority:</strong> ${input.priority}</p>
            
            <h2>Summary</h2>
            <p>${input.summary}</p>
            
            <h2>Risk flags</h2>
            <ul>
                ${input.riskFlags.map((risk) => `<li>${risk}</li>`).join('')}
            </ul>
            
            <h2>Recommended actions</h2>
            <ul>
                ${input.recommendedActions.map((action) => `<li>${action}</li>`).join('')}
            </ul>
            `,
      text: [
        'Manual review required',
        `Order: ${input.orderId}`,
        `Priority: ${input.priority}`,
        '',
        'Summary;',
        input.summary,
        '',
        'Risk flags:',
        ...input.riskFlags.map((risk) => `- ${risk}`),
        '',
        ...input.recommendedActions.map((action) => `- ${action}`),
      ].join('\n'),
    });
  }
}
