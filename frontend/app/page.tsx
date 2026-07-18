"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SidePanel from "@/components/SidePanel";

// MapView needs to be dynamically imported with SSR disabled because Leaflet requires the window object
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export interface Project {
  id: number;
  name: string;
  status: string;
  budget: string;
  location: [number, number];
  ai_score: number;
  whatsapp_status: string;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("https://ai-gov-7d7t.onrender.com/projects");
        const data = await res.json();
        setProjects(data);
      } catch (err) {
        console.error("Failed to fetch projects", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        Loading Data...
      </div>
    );
  }

  return (
    <main className="flex h-screen w-screen overflow-hidden">
      <div className="flex-1 h-full relative">
        <MapView projects={projects} onSelectProject={setSelectedProject} />
      </div>
      <div className="w-[400px] h-full shadow-2xl z-10 flex-shrink-0 transition-transform duration-300 border-l border-gray-200 dark:border-gray-800">
        <SidePanel project={selectedProject} />
      </div>
    </main>
  );
}

