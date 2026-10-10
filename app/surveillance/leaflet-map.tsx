"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";

export type MapArea = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  cases: number;
  today: number;
  baseline: number;
  level: "alert" | "watch" | null;
  score: number | null;
};
export type MapHospital = { id: string; name: string; lat: number; lon: number; intakes: number };

/** Real basemap (OpenStreetMap, softened with CSS) with area halos and hospital nodes as HTML markers. */
export default function LeafletMap({
  areas,
  hospitals,
  maxCases,
  syndromeLabel,
  onSelect,
}: {
  areas: MapArea[];
  hospitals: MapHospital[];
  maxCases: number;
  syndromeLabel: string;
  onSelect?: (area: string) => void;
}) {
  const areaIcon = (a: MapArea) => {
    const size = Math.round(22 + Math.sqrt(a.cases / maxCases) * 54);
    const shade = a.cases === 0 ? 0 : 0.25 + 0.65 * (a.cases / maxCases);
    const ring = a.level === "alert" ? "#dc2626" : a.level === "watch" ? "#ca8a04" : "#ffffff";
    const pulse = a.level === "alert" ? `<span class="priora-pulse" style="width:${size + 18}px;height:${size + 18}px"></span>` : "";
    const fill = a.cases === 0 ? "rgba(148,163,184,0.45)" : `rgba(15,118,110,${shade.toFixed(2)})`;
    const text = shade > 0.55 ? "#fff" : "#0f2a2a";
    return L.divIcon({
      className: "priora-area",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      html: `${pulse}<span class="priora-dot" style="width:${size}px;height:${size}px;background:${fill};border-color:${ring};color:${text}">${a.cases}</span><span class="priora-label">${a.name}${a.level === "alert" ? " ▲" : ""}</span>`,
    });
  };
  const hospitalIcon = (h: MapHospital) =>
    L.divIcon({
      className: "priora-hospital",
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      html: `<span class="priora-h">H</span><span class="priora-hlabel">${h.name} · ${h.intakes}</span>`,
    });

  return (
    <MapContainer
      bounds={L.latLngBounds([...areas, ...hospitals].map((p) => [p.lat, p.lon] as [number, number])).pad(0.02)}
      zoomSnap={0.25}
      minZoom={10}
      maxZoom={15}
      scrollWheelZoom={false}
      className="priora-map h-[560px] w-full rounded-lg"
      attributionControl
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      {areas.map((a) => (
        <Marker
          key={a.id}
          position={[a.lat, a.lon]}
          icon={areaIcon(a)}
          eventHandlers={{ click: () => a.level && onSelect?.(a.id) }}
          zIndexOffset={a.level ? 1000 : 0}
        >
          <Tooltip direction="top" offset={[0, -18]}>
            <strong>{a.name}</strong>
            <br />
            {syndromeLabel}: {a.cases} in 3 days · {a.today} today (baseline ~{a.baseline}/day)
            {a.level && (
              <>
                <br />
                <span style={{ color: a.level === "alert" ? "#dc2626" : "#ca8a04" }}>
                  {a.level.toUpperCase()} · score {a.score} · {onSelect ? "click for the brief" : "health officers see the AI brief"}
                </span>
              </>
            )}
          </Tooltip>
        </Marker>
      ))}
      {hospitals.map((h) => (
        <Marker key={h.id} position={[h.lat, h.lon]} icon={hospitalIcon(h)} zIndexOffset={2000}>
          <Tooltip direction="right" offset={[12, 0]}>
            <strong>{h.name}</strong> · {h.intakes} intakes in 30 days
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
