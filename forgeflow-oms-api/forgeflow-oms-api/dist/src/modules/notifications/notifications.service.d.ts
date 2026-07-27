import type { EmailProvider } from './email-provider.interface';
type ManualReviewAlertInput = {
    orderId: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    summary: string;
    riskFlags: string[];
    recommendedActions: string[];
};
export declare class NotificationService {
    private readonly emailProvider;
    private readonly logger;
    constructor(emailProvider: EmailProvider);
    sendManualReviewAlert(input: ManualReviewAlertInput): Promise<void>;
}
export {};
