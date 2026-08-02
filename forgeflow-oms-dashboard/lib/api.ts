import { getAccessToken } from "./auth";
import type { LoginResponse, Order, OrderAnalysis } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if(!API_BASE_URL) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not defined.');
}

type ApiOptions = {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    body?: unknown;
    authenticated?: boolean
}

async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
    debugger
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if(options.authenticated !== false) {
        const token = getAccessToken();

        if(!token) {
            throw new Error('You are not logged in.');
        }

        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    if(!response.ok) {
        const message = await response.text();

        throw new Error(message || `API request failed with ${response.status}`);
    }

    return response.json() as Promise<T>;
}

export function login(email: string, password: string) {
    return apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        authenticated: false,
        body: {
            email,
            password
        }
    });
}

export function getOrders() {
    return apiFetch<Order[]>('/orders');
}

export function getMyOrders() {
    return apiFetch<Order[]>('/orders/my');
}

export function getOrder(orderId: string) {
    return apiFetch<Order>(`/orders/${orderId}`);
}

export function getOrderAnalysis(orderId: string) {
    return apiFetch<OrderAnalysis[]>(
        `/orders/${orderId}/intelligence/analysis`
    );
}

export function generateOrderAnalysis(orderId: string) {
    return apiFetch<OrderAnalysis>(
        `/orders/${orderId}/intelligence/analysis`,
        {
            method: 'POST'
        }
    );
}