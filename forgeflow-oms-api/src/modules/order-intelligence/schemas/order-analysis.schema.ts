import { z } from 'zod';

export const orderAnalysisSchema = z.object({
  summary: z.string().min(1).max(1000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  riskFlags: z.array(z.string().min(1)).max(10),
  missingInformation: z.array(z.string().min(1)).max(10),
  recommendedActions: z.array(z.string().min(1)).max(10),
  customerExplanation: z.string().min(1).max(1500),
});

export type ValidatedOrderAnalysis = z.infer<typeof orderAnalysisSchema>;
