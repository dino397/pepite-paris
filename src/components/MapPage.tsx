import { useEffect, useRef, useState } from "react";
import { Activity } from "./ActivityCard";
import { X, MapPin, Clock, ExternalLink } from "lucide-react";

interface MapPageProps {
  activities: Activity[];
}

// Category → emoji mapping for map pins
const CATEGORY_EMOJI: Record<string, string> = {
  cinema: "🎬",
  theatre: "🎭",
  expo: "🖼️",
  activite: "🌿",
  sortie: "🌳",
  maison: "🏠",
  culture: "🏛️",
  sport: "⚽",
  créatif: "🎨",
  spectacle: "🎪",
};

// Paris arrondissement approximate coords for activities without exact coords
const PARIS_ARRONDISSEMENTS: Record<string, [number, number]> = {
  "75001": [48.8606, 2.3477],
  "75002": [48.8674, 2.3465],
  "75003": [48.8632, 2.3594],
  "75004": [48.8546, 2.3527],
  "75005": [48.8462, 2.3517],
  "75006": [48.8498, 2.3336],
  "75007": [48.8566, 2.3122],
  "75008": [48.8745, 2.3084],
  "75009": [48.8777, 2.3365],
  "75010": [48.8771, 2.3614],
  "75011": [48.8590, 2.3799],
  "75012": [48.8406, 2.3863],
  "75013": [48.8302, 2.3560],
  "75014": [48.8318, 2.3272],
  "75015": [48.8417, 2.3000],
  "75016": [48.8638, 2.2690],
  "75017": [48.8873, 2.3118],
  "75018": [48.8921, 2.3444],
  "75019": [48.8839, 2.3760],
  "75020": [48.8638, 2.3978],
};

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

// Give deterministic jitter to overlapping pins
function jitter(index: number, total: number): [number, number] {
  if (total <= 1) return [0, 0];
  const angle = (2 * Math.PI * index) / total;
  const radius = 0.003;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

export default function MapPage({ activities }: MapPageProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").Marker[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filter activities that have a location or can be placed on map
  const mappableActivities = activities.filter((a) => a.latitude || a.location);

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // Dynamically import Leaflet to avoid SSR issues
    import("leaflet").then((L) => {
      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: PARIS_CENTER,
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Soft watercolor-style tile layer (Stadia Alidade Smooth)
      L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
          opacity: 0.85,
        }
      ).addTo(map);

      leafletMapRef.current = map;
      setMapLoaded(true);
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Add markers when map is loaded and activities change
  useEffect(() => {
    if (!mapLoaded || !leafletMapRef.current) return;

    import("leaflet").then((L) => {
      // Clear old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const map = leafletMapRef.current!;

      // Group by approximate position to handle jitter
      const positionGroups = new Map<string, Activity[]>();

      mappableActivities.forEach((act) => {
        let lat: number | undefined;
        let lng: number | undefined;

        if (act.latitude && act.longitude) {
          lat = act.latitude;
          lng = act.longitude;
        } else if (act.location) {
          // Try to find arrondissement in location string
          const arrMatch = act.location.match(/75(\d{3})/);
          if (arrMatch) {
            const coords = PARIS_ARRONDISSEMENTS[arrMatch[0]];
            if (coords) { lat = coords[0]; lng = coords[1]; }
          }
          // Fallback: Paris center with random-ish offset based on id hash
          if (!lat) {
            const hash = act.id.charCodeAt(0) + act.id.charCodeAt(1);
            lat = PARIS_CENTER[0] + ((hash % 20) - 10) * 0.004;
            lng = PARIS_CENTER[1] + (((hash * 7) % 20) - 10) * 0.005;
          }
        }

        if (lat && lng) {
          const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
          if (!positionGroups.has(key)) positionGroups.set(key, []);
          positionGroups.get(key)!.push({ ...act, latitude: lat, longitude: lng });
        }
      });

      positionGroups.forEach((group) => {
        group.forEach((act, idx) => {
          const [dlat, dlng] = jitter(idx, group.length);
          const lat = act.latitude! + dlat;
          const lng = act.longitude! + dlng;

          const emoji = CATEGORY_EMOJI[act.category] || "📍";
          const color = act.highlighted ? "#2d7a5e" : "#5a8f7b";

          // Custom emoji pin
          const icon = L.divIcon({
            className: "",
            html: `
              <div style="
                display: flex; align-items: center; justify-content: center;
                width: 38px; height: 38px;
                background: ${act.highlighted ? "linear-gradient(135deg, hsl(152,36%,46%), hsl(168,42%,32%))" : "hsl(40,35%,99%)"};
                border: 2px solid ${color};
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 3px 10px rgba(0,0,0,0.18);
                cursor: pointer;
              ">
                <span style="transform: rotate(45deg); font-size: 16px; line-height: 1;">${emoji}</span>
              </div>
            `,
            iconSize: [38, 38],
            iconAnchor: [19, 38],
          });

          const marker = L.marker([lat, lng], { icon }).addTo(map);
          marker.on("click", () => setSelectedActivity(act));
          markersRef.current.push(marker);
        });
      });

      // Fit bounds if there are markers
      if (markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.15));
      }
    });
  }, [mapLoaded, mappableActivities]);

  return (
    <div className="relative" style={{ height: "calc(100vh - 120px)", minHeight: 400 }}>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />

      {/* Empty state */}
      {activities.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20"
          style={{ background: "hsl(42 38% 96%)" }}>
          <span className="text-5xl">🗺️</span>
          <div className="text-center">
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "1.1rem" }}
              className="text-foreground">Aucune activité à afficher</p>
            <p className="text-sm text-muted-foreground mt-1"
              style={{ fontFamily: "'Nunito', sans-serif" }}>
              Générez d'abord vos activités depuis l'onglet "Ce week-end"
            </p>
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full rounded-none" style={{ zIndex: 1 }} />

      {/* Legend */}
      <div
        className="absolute top-3 left-3 z-[1000] rounded-2xl px-3 py-2 text-xs flex flex-col gap-1 shadow-card"
        style={{
          background: "hsl(40 35% 99% / 0.95)",
          backdropFilter: "blur(8px)",
          border: "1px solid hsl(38 22% 84% / 0.7)",
          fontFamily: "'Nunito', sans-serif",
          color: "hsl(30 15% 50%)",
        }}
      >
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" style={{ color: "hsl(168 42% 38%)" }} />
          {activities.length} activité{activities.length > 1 ? "s" : ""}
        </div>
        <div className="opacity-70">Cliquez sur un pin pour les détails</div>
      </div>

      {/* Activity detail popup */}
      {selectedActivity && (
        <div
          className="absolute bottom-0 left-0 right-0 z-[1000] rounded-t-3xl shadow-float p-5"
          style={{
            background: "hsl(40 35% 99%)",
            border: "1px solid hsl(38 22% 84% / 0.7)",
            maxHeight: "55%",
            overflowY: "auto",
          }}
        >
          <button
            onClick={() => setSelectedActivity(null)}
            className="absolute top-4 right-4 flex items-center justify-center w-7 h-7 rounded-full transition-colors"
            style={{ background: "hsl(42 25% 91%)", color: "hsl(30 15% 55%)" }}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 pr-8">
            <span className="text-3xl flex-shrink-0">{selectedActivity.emoji}</span>
            <div>
              <h3
                className="text-foreground leading-snug"
                style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "1.05rem" }}
              >
                {selectedActivity.title}
              </h3>
              {selectedActivity.location && (
                <p className="text-xs mt-0.5 flex items-center gap-1"
                  style={{ color: "hsl(30 15% 55%)", fontFamily: "'Nunito', sans-serif" }}>
                  <MapPin className="h-3 w-3" />
                  {selectedActivity.location}
                </p>
              )}
            </div>
          </div>

          <p
            className="text-sm leading-relaxed mt-3"
            style={{ color: "hsl(30 25% 30%)", fontFamily: "'Nunito', sans-serif" }}
          >
            {selectedActivity.description}
          </p>

          <div
            className="flex flex-wrap gap-3 text-xs mt-3"
            style={{ color: "hsl(30 15% 55%)", fontFamily: "'Nunito', sans-serif" }}
          >
            {selectedActivity.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {selectedActivity.duration}
              </span>
            )}
            {selectedActivity.age_min !== undefined && (
              <span>👶 {selectedActivity.age_min}{selectedActivity.age_max ? `–${selectedActivity.age_max}` : "+"} ans</span>
            )}
          </div>

          {selectedActivity.booking_url && (
            <a
              href={selectedActivity.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 rounded-2xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, hsl(152 36% 46%), hsl(168 42% 32%))",
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              Réserver
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
