"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SidePanel from "@/components/SidePanel";
import {
  Project,
  fetchProjects,
  fetchProjectDetail,
  fetchAiReport,
} from "@/lib/api";
import fallbackProjects from "@/data/fallback-projects.json";

// MapView needs to be dynamically imported with SSR disabled because Leaflet requires the window object
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const FALLBACK: Project[] = fallbackProjects as Project[];

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      try {
        setProjects(await fetchProjects());
      } catch (err) {
        console.warn("API unreachable, using bundled fallback data", err);
        setProjects(FALLBACK);
        setOffline(true);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  async function handleSelectProject(project: Project) {
    setSelectedProject(project);
    // The list endpoint has no budget/timeline/detected_objects; hydrate from the
    // detail + ai-report endpoints, falling back to bundled data if unreachable.
    if (project.budget && project.ai_analysis.detected_objects) return;
    try {
      const [detail, report] = await Promise.all([
        fetchProjectDetail(project.id),
        fetchAiReport(project.id),
      ]);
      setSelectedProject({
        ...detail,
        ai_analysis: {
          ...detail.ai_analysis,
          detected_objects: report.detected_objects,
        },
      });
    } catch {
      const local = FALLBACK.find((p) => p.id === project.id);
      if (local) setSelectedProject({ ...local, ...project });
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
        Loading projects…
      </div>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <MapView projects={projects} onSelectProject={handleSelectProject} />
      <SidePanel
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
      {offline && (
        <div className="absolute bottom-4 left-4 z-20 rounded-full bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 px-3 py-1 text-xs text-amber-800 dark:text-amber-200 shadow">
          Offline demo data
        </div>
      )}
    </main>
  );
}
