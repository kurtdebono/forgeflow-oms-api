"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderAnalysisSchema = void 0;
const zod_1 = require("zod");
exports.orderAnalysisSchema = zod_1.z.object({
    summary: zod_1.z.string().min(1).max(1000),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']),
    riskFlags: zod_1.z.array(zod_1.z.string().min(1)).max(10),
    missingInformation: zod_1.z.array(zod_1.z.string().min(1)).max(10),
    recommendedActions: zod_1.z.array(zod_1.z.string().min(1)).max(10),
    customerExplanation: zod_1.z.string().min(1).max(1500)
});
//# sourceMappingURL=order-analysis.schema.js.map