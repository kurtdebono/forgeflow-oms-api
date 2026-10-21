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

export type PageMeta = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export type Paginated<T> = {
    data: T[];
    meta: PageMeta;
};

export type PageQuery = {
    page?: number;
    limit?: number;
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