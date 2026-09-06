import { Project } from "@/app/page";
import { Activity, MapPin, DollarSign, Brain, MessageCircle, Clock, TrendingUp } from "lucide-react";

interface SidePanelProps {
  project: Project | null;
  apiBase: string;
  loading?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function scoreColor(score: number) {
  if (score >= 70) return { text: "text-green-700 dark:text-green-300", bar: "bg-green-500", bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-100 dark:border-green-800" };
  if (score >= 35) return { text: "text-yellow-700 dark:text-yellow-300", bar: "bg-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-100 dark:border-yellow-800" };
  return { text: "text-red-700 dark:text-red-300", bar: "bg-red-500", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-100 dark:border-red-800" };
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Active: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    Abandoned: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    Completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  };
  return map[status] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SidePanel({ project, apiBase, loading = false }: SidePanelProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-white dark:bg-gray-900">
        <div className="text-center text-gray-400 dark:text-gray-500">
          <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading project details…</p>
        </div>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 gap-3 p-8 text-center">
        <MapPin size={40} className="opacity-30" />
        <p className="font-medium">Select a project pin on the map</p>
        <p className="text-sm">Click any marker to view project details, AI analysis, and community reports.</p>
      </div>
    );
  }

  const { ai_analysis, budget, whatsapp_reports, timeline } = project;
  const score = ai_analysis.confidence_score;
  const colors = scoreColor(score);
  const disbursedPct = budget.official_usd > 0
    ? Math.round((budget.disbursed_usd / budget.official_usd) * 100)
    : 0;

  return (
    <div className="h-full w-full bg-white dark:bg-gray-900 flex flex-col gap-5 overflow-y-auto p-6">

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{project.name}</h2>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${statusBadge(project.status)}`}>
            {project.status}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <MapPin size={14} />
          <span>{project.location.label}</span>
          <span className="mx-1">·</span>
          <span>{project.sector}</span>
        </div>
        {project.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{project.description}</p>
        )}
      </div>

      {/* Budget breakdown */}
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-3 text-sm font-medium">
          <DollarSign size={16} /> Budget
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Official</div>
            <div className="font-bold text-gray-900 dark:text-white">{formatUSD(budget.official_usd)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Disbursed</div>
            <div className="font-bold text-gray-900 dark:text-white">{formatUSD(budget.disbursed_usd)}</div>
          </div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all"
            style={{ width: `${disbursedPct}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-1">{disbursedPct}% disbursed</div>
      </div>

      {/* AI Analysis */}
      <div className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
        <div className={`flex items-center gap-2 mb-2 font-medium text-sm ${colors.text}`}>
          <Brain size={16} /> AI Verification
        </div>
        <div className={`text-4xl font-bold mb-1 ${colors.text}`}>{score}%</div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ai_analysis.label}</div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{ai_analysis.detail}</p>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div className={`${colors.bar} h-2 rounded-full transition-all`} style={{ width: `${score}%` }} />
        </div>
        {ai_analysis.bounding_box_image && (
          <a
            href={`${apiBase}${ai_analysis.bounding_box_image}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-block mt-3 text-xs underline ${colors.text}`}
          >
            View satellite analysis image →
          </a>
        )}
      </div>

      {/* WhatsApp community reports */}
      <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-4">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2 font-medium text-sm">
          <MessageCircle size={16} /> Community Reports (WhatsApp)
        </div>
        <div className="text-2xl font-bold text-green-700 dark:text-green-300 mb-1">
          {whatsapp_reports.count} <span className="text-sm font-normal">reports</span>
        </div>
        <p className="text-sm text-green-800 dark:text-green-200 italic">"{whatsapp_reports.summary}"</p>
      </div>

      {/* Timeline */}
      {timeline && (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-3 text-sm font-medium">
            <TrendingUp size={16} /> Timeline
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Start Date</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{timeline.start_date}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Expected End</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{timeline.expected_end}</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-indigo-400 h-2 rounded-full" style={{ width: `${timeline.completion_pct}%` }} />
          </div>
          <div className="text-xs text-gray-400 mt-1">{timeline.completion_pct}% complete</div>
        </div>
      )}

      {/* Last analysed timestamp */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 pb-2">
        <Clock size={12} />
        AI last analysed: {new Date(ai_analysis.last_analyzed).toLocaleDateString()}
      </div>
    </div>
  );
}
