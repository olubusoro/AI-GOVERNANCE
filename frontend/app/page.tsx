"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SidePanel from "@/components/SidePanel";

// MapView needs to be dynamically imported with SSR disabled because Leaflet requires the window object
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

// ── Types matching the enriched backend schema ──────────────────────────────

export interface ProjectLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface ProjectBudget {
  official_ngn: number;
  official_usd: number;
  disbursed_ngn: number;
  disbursed_usd: number;
}

export interface AIAnalysis {
  confidence_score: number;
  label: string;
  detail: string;
  bounding_box_image: string;
  last_analyzed: string;
}

export interface WhatsAppReports {
  count: number;
  summary: string;
  last_report: string;
}

export interface ProjectTimeline {
  start_date: string;
  expected_end: string;
  completion_pct: number;
}

export interface Project {
  id: number;
  name: string;
  status: string;
  sector: string;
  description?: string;
  location: ProjectLocation;
  budget: ProjectBudget;
  ai_analysis: AIAnalysis;
  whatsapp_reports: WhatsAppReports;
  timeline?: ProjectTimeline;
}

// ── API base URL — reads from env var in production, falls back to localhost ─
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://ai-gov-7d7t.onrender.com";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch(`${API_BASE}/api/projects`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Project[] = await res.json();
        setProjects(data);
      } catch (err) {
        console.error("Failed to fetch projects", err);
        setError("Could not load projects. Is the backend running on port 8000?");
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  async function handleSelectProject(proj: Project) {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${proj.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const detail: Project = await res.json();
      setSelectedProject(detail);
    } catch {
      // Fall back to the summary object if detail fetch fails
      setSelectedProject(proj);
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300">
        Loading infrastructure data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Start the backend: <code>uvicorn main:app --reload --port 8000</code></p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex h-screen w-screen overflow-hidden">
      <div className="flex-1 h-full relative">
        <MapView projects={projects} onSelectProject={handleSelectProject} />
      </div>
      <div className="w-[420px] h-full shadow-2xl z-10 flex-shrink-0 transition-transform duration-300 border-l border-gray-200 dark:border-gray-800">
        <SidePanel project={selectedProject} apiBase={API_BASE} loading={detailLoading} />
      </div>
    </main>
  );
}
