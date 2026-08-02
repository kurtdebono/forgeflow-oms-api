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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = __importDefault(require("openai"));
let OpenAIProvider = class OpenAIProvider {
    client;
    model;
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not defined.');
        }
        this.model = process.env.OPENAI_MODEL ?? 'gpt-5-mini';
        const timeout = Number(process.env.OPENAI_TIMEOUT_MS ?? 15000);
        this.client = new openai_1.default({
            apiKey,
            timeout
        });
    }
    async generateOrderAnalysis(input) {
        try {
            const response = await this.client.responses.create({
                model: this.model,
                input: [
                    {
                        role: 'system',
                        content: 'You are an order operations assistant. Analyse the provided order context and return only valid structured JSON. You are advisory only. Do not decide prices, stock, permissions, or order transitions.',
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            task: 'Generate an operational order analysis',
                            rules: [
                                'Return concise operational advice.',
                                'Do not invent products, prices, quantitioes, or customer data.',
                                'Use LOW, MEDIUM, or HIGH for priority.',
                                'Keep customerExplanation friendly and non-technical.',
                                'Do not say that the order is approved, shipped, cancelled, or changed unless the provided status says so.'
                            ],
                            order: input
                        })
                    }
                ],
                text: {
                    format: {
                        type: 'json_schema',
                        name: 'order_analysis',
                        strict: true,
                        schema: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                summary: {
                                    type: 'string'
                                },
                                priority: {
                                    type: 'string',
                                    enum: ['LOW', 'MEDIUM', 'HIGH'],
                                },
                                riskFlags: {
                                    type: 'array',
                                    items: {
                                        type: 'string'
                                    }
                                },
                                missingInformation: {
                                    type: 'array',
                                    items: {
                                        type: 'string'
                                    }
                                },
                                recommendedActions: {
                                    type: 'array',
                                    items: {
                                        type: 'string'
                                    }
                                },
                                customerExplanation: {
                                    type: 'string'
                                }
                            },
                            required: [
                                'summary',
                                'priority',
                                'riskFlags',
                                'missingInformation',
                                'recommendedActions',
                                'customerExplanation'
                            ]
                        }
                    }
                },
                max_output_tokens: 1500,
                store: false
            });
            if (response.status !== 'completed') {
                throw new common_1.BadGatewayException(`OpenAI response response did not complete. Status: ${response.status}`);
            }
            const outputText = response.output_text?.trim();
            if (!outputText) {
                throw new common_1.BadGatewayException('OpenAI returned an empty order analysis response.');
            }
            return JSON.parse(outputText);
        }
        catch (error) {
            debugger;
            if (error instanceof common_1.BadGatewayException) {
                throw error;
            }
            throw new common_1.BadGatewayException('Failed to generate order analysis using OpenAI.');
        }
    }
    getMetadata() {
        return {
            provider: 'openai',
            model: this.model
        };
    }
};
exports.OpenAIProvider = OpenAIProvider;
exports.OpenAIProvider = OpenAIProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], OpenAIProvider);
//# sourceMappingURL=openai.provider.js.map