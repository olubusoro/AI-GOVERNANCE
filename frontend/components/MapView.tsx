"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Project } from "@/lib/api";
import { useTheme } from "next-themes";

// Fix missing marker icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapViewProps {
  projects: Project[];
  onSelectProject: (p: Project) => void;
}

export default function MapView({ projects, onSelectProject }: MapViewProps) {
  const { resolvedTheme } = useTheme();

  const tileUrl = resolvedTheme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <MapContainer
      center={[9.082, 8.6753]}
      zoom={6}
      className="w-full h-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url={tileUrl}
      />
      {projects.map((proj) => (
        <Marker
          key={proj.id}
          position={[proj.location.lat, proj.location.lng]}
          eventHandlers={{
            click: () => onSelectProject(proj),
          }}
        >
          <Popup>
            <div className="font-semibold text-gray-900">{proj.name}</div>
            <div className="text-sm text-gray-500">
              {proj.status} · {proj.location.label}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
