export type LoginResponse = {
    accessToken: string;
    refreshToken?: string;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED';

export type Order = {
    id: string;
    userId: string;
    status: OrderStatus;
    totalAmount: string;
    createdAt?: string;
    updatedAt?: string;
    user?: {
        id: string;
        email: string;
    };
    items: {
        id: string;
        productId: string;
        quantity: number;
        unitPrice: string;
        product?: {
            id: string;
            name: string;
            price?: string;
        };
    }[];
};

export type OrderAnalysis = {
    id: string;
    orderId: string;
    summary: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    riskFlags: string[];
    missingInformation: string[];
    recommendedActions: string[];
    customerExplanation: string;
    provider: string;
    model: string;
    createdAt: string;
}