"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Project } from "@/app/page";
import { useTheme } from "next-themes";

// Leaflet must only be imported client-side (it uses `window`)
// We do a dynamic import inside useEffect so SSR/Turbopack never touches it.

const STATUS_COLORS: Record<string, string> = {
  Active: "#22c55e",
  Abandoned: "#ef4444",
  Completed: "#3b82f6",
};

interface MapViewProps {
  projects: Project[];
  onSelectProject: (p: Project) => void;
}

export default function MapView({ projects, onSelectProject }: MapViewProps) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mounted, setMounted] = useState(false);

  // ── Mount the Leaflet map exactly once ─────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let L: any;
    let map: any;

    (async () => {
      L = (await import("leaflet")).default;

      // Fix missing default marker icons in webpack/Turbopack builds
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      // Guard: another effect cycle may have already initialised the container
      if ((containerRef.current as any)?._leaflet_id) return;

      map = L.map(containerRef.current!, {
        center: [9.082, 8.6753],
        zoom: 6,
        zoomControl: true,
      });

      mapRef.current = map;
      setMounted(true);
    })();

    return () => {
      // Cleanup on unmount — removes the map and its DOM state entirely
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // runs once on mount

  // ── Swap tile layer when theme changes ─────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mounted) return;

    (async () => {
      const L = (await import("leaflet")).default;

      const tileUrl =
        resolvedTheme === "dark"
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      const attribution =
        resolvedTheme === "dark"
          ? '© <a href="https://carto.com/">CartoDB</a>'
          : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

      // Remove old tile layers
      mapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.TileLayer) mapRef.current.removeLayer(layer);
      });

      L.tileLayer(tileUrl, { attribution }).addTo(mapRef.current);
    })();
  }, [resolvedTheme, mounted]);

  // ── Sync markers whenever projects or theme changes ────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mounted || projects.length === 0) return;

    (async () => {
      const L = (await import("leaflet")).default;

      // Remove old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      projects.forEach((proj) => {
        const color = STATUS_COLORS[proj.status] ?? "#6b7280";
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
          <path fill="${color}" stroke="white" stroke-width="2"
            d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 26 14 26S28 23.333 28 14C28 6.268 21.732 0 14 0z"/>
          <circle fill="white" cx="14" cy="14" r="6"/>
        </svg>`;

        const icon = L.divIcon({
          html: svg,
          iconSize: [28, 40],
          iconAnchor: [14, 40],
          popupAnchor: [0, -40],
          className: "",
        });

        const marker = L.marker([proj.location.lat, proj.location.lng], { icon })
          .addTo(mapRef.current)
          .bindPopup(
            `<div style="font-weight:600;color:#111">${proj.name}</div>
             <div style="font-size:12px;color:#555">${proj.location.label}</div>
             <div style="font-size:12px;font-weight:600;margin-top:4px;color:${color}">${proj.status}</div>`
          )
          .on("click", () => onSelectProject(proj));

        markersRef.current.push(marker);
      });
    })();
  }, [projects, mounted, onSelectProject]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full z-0"
      style={{ background: resolvedTheme === "dark" ? "#1a1a2e" : "#e5e5e5" }}
    />
  );
}
