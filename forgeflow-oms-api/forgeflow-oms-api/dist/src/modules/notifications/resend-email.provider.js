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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResendEmailProvider = void 0;
const common_1 = require("@nestjs/common");
const resend_1 = require("resend");
let ResendEmailProvider = class ResendEmailProvider {
    resend;
    fromEmail;
    constructor() {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error('RESEND_API_KEY is not defined.');
        }
        this.fromEmail = process.env.RESEND_FROM_EMAIL ?? 'ForgeFlow <onboarding@resend.dev>';
        this.resend = new resend_1.Resend(apiKey);
    }
    async sendEmail(input) {
        const { error } = await this.resend.emails.send({
            from: this.fromEmail,
            to: input.to,
            subject: input.subject,
            html: input.html,
            text: input.text
        });
        if (error) {
            throw new common_1.BadGatewayException(`Failed to send email via Resend: ${error.message}`);
        }
    }
};
exports.ResendEmailProvider = ResendEmailProvider;
exports.ResendEmailProvider = ResendEmailProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ResendEmailProvider);
//# sourceMappingURL=resend-email.provider.js.map