"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const email_provider_interface_1 = require("./email-provider.interface");
let NotificationService = NotificationService_1 = class NotificationService {
    emailProvider;
    logger = new common_1.Logger(NotificationService_1.name);
    constructor(emailProvider) {
        this.emailProvider = emailProvider;
    }
    async sendManualReviewAlert(input) {
        const to = process.env.OPS_REVIEW_EMAIL;
        if (!to) {
            this.logger.warn('OPS_REVIEW_EMAIL is not configured. Manual review alert skipped.');
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
                ...input.recommendedActions.map((action) => `- ${action}`)
            ].join('\n')
        });
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(email_provider_interface_1.EMAIL_PROVIDER)),
    __metadata("design:paramtypes", [Object])
], NotificationService);
//# sourceMappingURL=notifications.service.js.map