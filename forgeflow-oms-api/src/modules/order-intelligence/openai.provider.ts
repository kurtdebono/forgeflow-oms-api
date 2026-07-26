import { BadGatewayException, Inject, Injectable } from "@nestjs/common";
import OpenAI from 'openai';
import { 
    OrderAnalysisInput,
    OrderAnalysisResult
} from './ai-provider.interface';

import type { AIProvider } from './ai-provider.interface';

@Injectable()
export class OpenAIProvider implements AIProvider {
    private readonly client: OpenAI;
    private readonly model: string;
    
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not defined.');
        }

        this.model = process.env.OPENAI_MODEL ?? 'gpt-5-mini';

        const timeout = Number(process.env.OPENAI_TIMEOUT_MS ?? 15000);

        this.client = new OpenAI({
            apiKey,
            timeout
        });
    }

    async generateOrderAnalysis (
        input: OrderAnalysisInput
    ): Promise<OrderAnalysisResult> {
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

            if(response.status !== 'completed') {
                throw new BadGatewayException(
                    `OpenAI response response did not complete. Status: ${response.status}`
                );
            }

            const outputText = response.output_text?.trim();

            if(!outputText) {
                throw new BadGatewayException(
                    'OpenAI returned an empty order analysis response.'
                );
            }

            return JSON.parse(outputText) as OrderAnalysisResult;
        } catch(error) {
            debugger;
            if (error instanceof BadGatewayException) {
                throw error;
            }

            throw new BadGatewayException(
                'Failed to generate order analysis using OpenAI.'
            );
        }
    }

    getMetadata() {
        return {
            provider: 'openai',
            model: this.model
        }
    }
}