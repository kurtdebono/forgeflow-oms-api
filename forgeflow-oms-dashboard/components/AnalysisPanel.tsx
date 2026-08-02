import type { OrderAnalysis } from '@/types/api';

import { Priority } from './Priority';

type AnalysisPanelProps = {
  analyses: OrderAnalysis[];
  isGenerating: boolean;
  onGenerate: () => void;
};

export function AnalysisPanel({
  analyses,
  isGenerating,
  onGenerate,
}: AnalysisPanelProps) {
  const latestAnalysis = analyses[0];

  return (
    <section className="rounded-xl border p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">AI Order Intelligence</h2>
          <p className="mt-1 text-sm text-gray-600">
            Advisory analysis generated from controlled order context.
          </p>
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : 'Generate analysis'}
        </button>
      </div>

      {!latestAnalysis && (
        <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          No analysis generated yet.
        </div>
      )}

      {latestAnalysis && (
        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-3">
            <Priority priority={latestAnalysis.priority} />
            <p className="text-sm text-gray-500">
              Provider: {latestAnalysis.provider} · Model: {latestAnalysis.model}
            </p>
          </div>

          <div>
            <h3 className="font-medium">Summary</h3>
            <p className="mt-1 text-sm text-gray-700">
              {latestAnalysis.summary}
            </p>
          </div>

          <div>
            <h3 className="font-medium">Risk flags</h3>
            {latestAnalysis.riskFlags.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">No risk flags.</p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {latestAnalysis.riskFlags.map((risk, index) => (
                  <li key={index}>{risk}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="font-medium">Missing information</h3>
            {latestAnalysis.missingInformation.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">
                No missing information identified.
              </p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {latestAnalysis.missingInformation.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="font-medium">Recommended actions</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {latestAnalysis.recommendedActions.map((action, index) => (
                <li key={index}>{action}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="font-medium">Customer explanation</h3>
            <p className="mt-1 text-sm text-gray-700">
              {latestAnalysis.customerExplanation}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}