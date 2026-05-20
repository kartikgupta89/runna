"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { GpsPoint } from "@/lib/training/gps";

function AutoPan({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

interface LiveMapProps {
  points: GpsPoint[];
  className?: string;
}

export default function LiveMap({ points, className }: LiveMapProps) {
  if (points.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded-xl ${className ?? ""}`}
      >
        <p className="text-sm text-muted-foreground animate-pulse">
          Acquiring GPS signal…
        </p>
      </div>
    );
  }

  const latest = points[points.length - 1];
  const center: [number, number] = [latest.lat, latest.lng];
  const polyline: [number, number][] = points.map((p) => [p.lat, p.lng]);

  return (
    <MapContainer
      center={center}
      zoom={16}
      className={className}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={polyline} color="#3b82f6" weight={4} opacity={0.85} />
      <CircleMarker
        center={center}
        radius={9}
        fillColor="#3b82f6"
        color="white"
        weight={2.5}
        fillOpacity={1}
      />
      <AutoPan center={center} />
    </MapContainer>
  );
}
