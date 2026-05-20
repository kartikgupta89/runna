"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { GpsPoint } from "@/lib/training/gps";

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      const lats = points.map((p) => p[0]);
      const lngs = points.map((p) => p[1]);
      const sw: [number, number] = [Math.min(...lats), Math.min(...lngs)];
      const ne: [number, number] = [Math.max(...lats), Math.max(...lngs)];
      map.fitBounds([sw, ne], { padding: [24, 24] });
    }
  }, [map, points]);
  return null;
}

interface RouteMapProps {
  points: GpsPoint[];
  className?: string;
}

export default function RouteMap({ points, className }: RouteMapProps) {
  if (points.length === 0) return null;

  const polyline: [number, number][] = points.map((p) => [p.lat, p.lng]);
  const start = polyline[0];
  const end = polyline[polyline.length - 1];
  const center = start;

  return (
    <MapContainer
      center={center}
      zoom={15}
      className={className}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={polyline} color="#3b82f6" weight={4} opacity={0.85} />
      {/* Start dot — green */}
      <CircleMarker
        center={start}
        radius={7}
        fillColor="#22c55e"
        color="white"
        weight={2}
        fillOpacity={1}
      />
      {/* End dot — red */}
      <CircleMarker
        center={end}
        radius={7}
        fillColor="#ef4444"
        color="white"
        weight={2}
        fillOpacity={1}
      />
      <FitBounds points={polyline} />
    </MapContainer>
  );
}
