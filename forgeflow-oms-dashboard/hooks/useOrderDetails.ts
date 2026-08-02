'use client';

import { useEffect, useState } from 'react';
import {
  generateOrderAnalysis,
  getOrder,
  getOrderAnalysis,
} from '@/lib/api';
import type { Order, OrderAnalysis } from '@/types/api';
import { useAsyncAction } from '@/hooks/useAsyncAction';

export function useOrderDetails(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [analyses, setAnalyses] = useState<OrderAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadOrderDetails() {
      try {
        const [orderResult, analysesResult] = await Promise.all([
          getOrder(orderId),
          getOrderAnalysis(orderId),
        ]);

        if (!isActive) {
          return;
        }

        setOrder(orderResult);
        setAnalyses(analysesResult);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setLoadError(
          error instanceof Error ? error.message : 'Failed to load order.',
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadOrderDetails();

    return () => {
      isActive = false;
    };
  }, [orderId]);

  const {
    execute: generateAnalysis,
    isExecuting: isGenerating,
    error: generateAnalysisError,
  } = useAsyncAction(
    () => generateOrderAnalysis(orderId),
    {
      onSuccess: (analysis) => {
        setAnalyses((current) => [analysis, ...current]);
      },
      errorMessage: 'Failed to generate analysis.',
    },
  );

  return {
    order,
    analyses,
    isLoading,
    error: loadError ?? generateAnalysisError,
    isGenerating,
    generateAnalysis,
  };
}