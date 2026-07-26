"use client";

import { useRef, useState } from "react";
import { Project, API_BASE_URL } from "@/lib/api";
import {
  MapPin,
  DollarSign,
  Brain,
  MessageCircle,
  X,
  Satellite,
} from "lucide-react";

interface SidePanelProps {
  project: Project | null;
  onClose: () => void;
}

const ngn = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  notation: "compact",
  maximumFractionDigits: 1,
});
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function statusClasses(status: string) {
  switch (status) {
    case "Completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    case "Active":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "Abandoned":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
}

function scoreColor(score: number) {
  if (score >= 80) return { text: "text-green-600 dark:text-green-400", bar: "bg-green-500" };
  if (score >= 40) return { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" };
  return { text: "text-red-600 dark:text-red-400", bar: "bg-red-500" };
}

export default function SidePanel({ project, onClose }: SidePanelProps) {
  // Keep rendering the last project while the panel slides out
  const lastProject = useRef<Project | null>(null);
  const [imageFailed, setImageFailed] = useState<number | null>(null);
  if (project) lastProject.current = project;
  const shown = project ?? lastProject.current;

  const open = project !== null;

  return (
    <aside
      className={`fixed top-0 right-0 z-20 h-full w-full max-w-[420px] transform bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {shown && (
        <div className="h-full overflow-y-auto p-6 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span
                className={`inline-block mb-2 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClasses(shown.status)}`}
              >
                {shown.status}
              </span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                {shown.name}
              </h2>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <MapPin size={15} />
                <span>
                  {shown.location.label} · {shown.sector}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close panel"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>

          {shown.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {shown.description}
            </p>
          )}

          {/* AI Verification Status — the hero card */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-5">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold mb-3">
              <Brain size={18} /> AI Verification Status
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-5xl font-extrabold tabular-nums ${scoreColor(shown.ai_analysis.confidence_score).text}`}
              >
                {shown.ai_analysis.confidence_score}%
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                confidence
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 mt-3">
              <div
                className={`h-2 rounded-full ${scoreColor(shown.ai_analysis.confidence_score).bar}`}
                style={{ width: `${shown.ai_analysis.confidence_score}%` }}
              />
            </div>
            <p className="mt-3 font-medium text-gray-900 dark:text-white">
              {shown.ai_analysis.label}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {shown.ai_analysis.detail}
            </p>

            {shown.ai_analysis.detected_objects && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {shown.ai_analysis.detected_objects.map((obj) => (
                  <span
                    key={obj.class}
                    className="rounded-full border border-blue-300 dark:border-blue-700 bg-white dark:bg-blue-950/40 px-2.5 py-1 text-xs text-blue-800 dark:text-blue-200"
                  >
                    {obj.count}× {obj.class.replace(/_/g, " ")}
                    <span className="ml-1 text-blue-500 dark:text-blue-400">
                      {Math.round(obj.confidence * 100)}%
                    </span>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                <Satellite size={14} /> Satellite AI Detection
              </div>
              {imageFailed === shown.id ? (
                <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                  Detection imagery pending upload
                </div>
              ) : (
                <img
                  key={shown.id}
                  src={`${API_BASE_URL}${shown.ai_analysis.bounding_box_image}`}
                  alt={`AI bounding-box detection for ${shown.name}`}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 object-cover"
                  onError={() => setImageFailed(shown.id)}
                />
              )}
              <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                Last analyzed{" "}
                {new Date(shown.ai_analysis.last_analyzed).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Budget vs Disbursed */}
          {shown.budget && (
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-3 text-sm font-medium">
                <DollarSign size={16} /> Budget vs. Disbursed
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Official budget
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white">
                    {ngn.format(shown.budget.official_ngn)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {usd.format(shown.budget.official_usd)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Disbursed
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white">
                    {ngn.format(shown.budget.disbursed_ngn)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {usd.format(shown.budget.disbursed_usd)}
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
                <div
                  className="bg-gray-600 dark:bg-gray-400 h-2 rounded-full"
                  style={{
                    width: `${Math.round((shown.budget.disbursed_ngn / shown.budget.official_ngn) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {Math.round(
                    (shown.budget.disbursed_ngn / shown.budget.official_ngn) * 100,
                  )}
                  % disbursed
                </span>
                {shown.timeline && (
                  <span>{shown.timeline.completion_pct}% physically complete</span>
                )}
              </div>
            </div>
          )}

          {/* Community Ground-Truth */}
          <div className="rounded-xl border border-green-100 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2 font-medium">
              <MessageCircle size={18} /> Community Ground-Truth
            </div>
            <p className="text-sm font-semibold text-green-900 dark:text-green-200">
              {shown.whatsapp_reports.count} WhatsApp report
              {shown.whatsapp_reports.count === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm text-green-800 dark:text-green-300 italic">
              &ldquo;{shown.whatsapp_reports.summary}&rdquo;
            </p>
            <p className="mt-2 text-[11px] text-green-700/70 dark:text-green-400/70">
              Last report{" "}
              {new Date(shown.whatsapp_reports.last_report).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
