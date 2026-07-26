import { z } from 'zod';
export declare const orderAnalysisSchema: z.ZodObject<{
    summary: z.ZodString;
    priority: z.ZodEnum<{
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
    }>;
    riskFlags: z.ZodArray<z.ZodString>;
    missingInformation: z.ZodArray<z.ZodString>;
    recommendedActions: z.ZodArray<z.ZodString>;
    customerExplanation: z.ZodString;
}, z.core.$strip>;
export type ValidatedOrderAnalysis = z.infer<typeof orderAnalysisSchema>;
