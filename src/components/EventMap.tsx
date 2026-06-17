import { useEffect, useRef, useState } from "react";
import type { ParisEvent } from "@/types/event";
import { X, MapPin, ExternalLink } from "lucide-react";

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

export default function EventMap({ events }: { events: ParisEvent[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").Marker[]>([]);
  const [selected, setSelected] = useState<ParisEvent | null>(null);
  const [ready, setReady] = useState(false);

  const mappable = events.filter((e) => e.lat && e.lon);

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, { center: PARIS_CENTER, zoom: 13, scrollWheelZoom: true });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        opacity: 0.85,
      }).addTo(map);

      leafletMapRef.current = map;
      setReady(true);
    });

    return () => {
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !leafletMapRef.current) return;

    import("leaflet").then((L) => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      const map = leafletMapRef.current!;

      mappable.forEach((evt) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:hsl(40,35%,99%);border:2px solid hsl(168,42%,38%);border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,0.15);cursor:pointer"><span style="transform:rotate(45deg);font-size:14px">📍</span></div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
        });

        const marker = L.marker([evt.lat!, evt.lon!], { icon }).addTo(map);
        marker.on("click", () => setSelected(evt));
        markersRef.current.push(marker);
      });

      if (markersRef.current.length > 0) {
        map.fitBounds(L.featureGroup(markersRef.current).getBounds().pad(0.15));
      }
    });
  }, [ready, mappable]);

  return (
    <div className="relative" style={{ height: "calc(100vh - 140px)", minHeight: 400 }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {mappable.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20" style={{ background: "hsl(42 38% 96%)" }}>
          <span className="text-5xl">🗺️</span>
          <p style={{ fontFamily: "'Lora', Georgia, serif" }} className="text-foreground">Aucun lieu à afficher</p>
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
            Les événements sans coordonnées ne sont pas visibles sur la carte
          </p>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full" style={{ zIndex: 1 }} />

      <div
        className="absolute top-3 left-3 z-[1000] rounded-2xl px-3 py-2 text-xs shadow-sm"
        style={{ background: "hsl(40 35% 99% / 0.95)", backdropFilter: "blur(8px)", border: "1px solid hsl(38 22% 84% / 0.7)", fontFamily: "'Nunito', sans-serif" }}
      >
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" style={{ color: "hsl(168 42% 38%)" }} />
          {mappable.length} lieu{mappable.length > 1 ? "x" : ""}
        </div>
      </div>

      {selected && (
        <div
          className="absolute bottom-0 left-0 right-0 z-[1000] rounded-t-3xl shadow-lg p-5"
          style={{ background: "hsl(40 35% 99%)", border: "1px solid hsl(38 22% 84% / 0.7)", maxHeight: "50%", overflowY: "auto" }}
        >
          <button onClick={() => setSelected(null)} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full" style={{ background: "hsl(42 25% 91%)" }}>
            <X className="h-4 w-4" style={{ color: "hsl(30 15% 55%)" }} />
          </button>

          <h3 className="text-foreground pr-8 leading-snug" style={{ fontFamily: "'Lora', Georgia, serif", fontWeight: 500, fontSize: "1.05rem" }}>
            {selected.title}
          </h3>

          {selected.placeName && (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "hsl(30 15% 55%)", fontFamily: "'Nunito', sans-serif" }}>
              <MapPin className="h-3 w-3" />
              {selected.placeName}
            </p>
          )}

          {selected.description && (
            <p className="text-sm leading-relaxed mt-3" style={{ color: "hsl(30 25% 30%)", fontFamily: "'Nunito', sans-serif" }}>
              {selected.description.replace(/<[^>]*>/g, "").slice(0, 200)}
            </p>
          )}

          {selected.contactUrl && (
            <a
              href={selected.contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 rounded-2xl text-white text-sm font-semibold"
              style={{ background: "linear-gradient(135deg, hsl(152 36% 46%), hsl(168 42% 32%))" }}
            >
              Voir l'événement <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
