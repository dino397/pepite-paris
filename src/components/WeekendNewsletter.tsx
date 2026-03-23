import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  mockWeather,
  mockCalendarEvents,
  mockBookings,
  mockActivities,
  mockFutureEvents,
  mockFutureWeekend,
  type Activity,
  type FutureEvent,
} from "@/data/mockActivities";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDayKey(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function getNextWeekendDates(): { saturday: Date; sunday: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + (daysUntilSaturday === 0 && dayOfWeek === 6 ? 7 : daysUntilSaturday));
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  return { saturday, sunday };
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function formatDateISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

const WEATHER_CODE_MAP: Record<string, { icon: string; desc: string }> = {
  "0": { icon: "☀️", desc: "Ensoleillé" },
  "1": { icon: "☀️", desc: "Ensoleillé" },
  "2": { icon: "⛅", desc: "Nuageux" },
  "3": { icon: "☁️", desc: "Couvert" },
  "45": { icon: "🌫️", desc: "Brouillard" },
  "48": { icon: "🌫️", desc: "Brouillard" },
  "51": { icon: "🌧️", desc: "Bruine" },
  "53": { icon: "🌧️", desc: "Bruine" },
  "61": { icon: "🌧️", desc: "Pluie" },
  "63": { icon: "🌧️", desc: "Pluie" },
  "65": { icon: "🌧️", desc: "Pluie forte" },
  "71": { icon: "🌨️", desc: "Neige" },
  "73": { icon: "🌨️", desc: "Neige" },
  "80": { icon: "⛈️", desc: "Averses" },
  "95": { icon: "⛈️", desc: "Orage" },
};

function getWeatherInfo(code: number) {
  const key = String(code);
  return WEATHER_CODE_MAP[key] ?? { icon: "⛅", desc: "Variable" };
}

// DB row → Activity
interface DbActivity {
  id: string;
  category: string;
  title: string;
  description: string | null;
  location: string | null;
  arrondissement: string | null;
  duration: string | null;
  booking_url: string | null;
  travel_walk: string | null;
  travel_bike: string | null;
  travel_car: string | null;
  is_exceptional: boolean | null;
  badge: string | null;
  showtimes: string | null;
  cinema_name: string | null;
  cinema_url: string | null;
  date_start: string | null;
  date_end: string | null;
}

function dbRowToActivity(row: DbActivity, index: number): Activity {
  return {
    id: index + 1,
    category: (row.category as Activity["category"]) || "activite",
    title: row.title,
    description: row.description ?? "",
    date: row.date_start ?? "",
    location: row.location ?? "",
    arrondissement: row.arrondissement ?? "",
    duration: row.duration ?? "",
    booking_url: row.booking_url ?? "",
    travel_walk: row.travel_walk ?? "",
    travel_bike: row.travel_bike ?? "",
    travel_car: row.travel_car ?? "",
    is_exceptional: row.is_exceptional ?? false,
    is_future: false,
    badge: row.badge ?? undefined,
    cinemas: row.cinema_name
      ? [
          {
            name: row.cinema_name,
            url: row.cinema_url ?? "",
            arrondissement: row.arrondissement ?? "",
            travel_walk: row.travel_walk ?? "",
            showtimes: row.showtimes ?? "",
          },
        ]
      : undefined,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface WeatherDay {
  day: string;
  icon: string;
  desc: string;
  min: number;
  max: number;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: "#888",
        letterSpacing: "0.05em",
        textTransform: "lowercase",
        marginBottom: 12,
      }}
    >
      {children}
    </h2>
  );
}

function Separator() {
  return (
    <hr style={{ border: "none", borderTop: "1px solid #e8e8e8", margin: "40px 0" }} />
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: "#fafafa", borderRadius: 8, padding: "14px 16px", marginBottom: 12 }}>
      <div className="animate-pulse space-y-2">
        <div style={{ height: 14, background: "#e8e8e8", borderRadius: 4, width: "60%" }} />
        <div style={{ height: 12, background: "#e8e8e8", borderRadius: 4, width: "90%" }} />
        <div style={{ height: 12, background: "#e8e8e8", borderRadius: 4, width: "75%" }} />
      </div>
    </div>
  );
}

function MetaGrid({
  arrondissement,
  travelWalk,
  date,
  duration,
  bookingUrl,
  showtimes,
}: {
  arrondissement?: string;
  travelWalk?: string;
  date?: string;
  duration?: string;
  bookingUrl?: string;
  showtimes?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 4,
        marginTop: 10,
        fontSize: 12,
        color: "#666",
        lineHeight: 1.5,
      }}
    >
      <div>
        {arrondissement && (
          <div>
            📍 {arrondissement}
            {travelWalk && ` · 🚶 ${travelWalk}`}
          </div>
        )}
        {(date || showtimes) && <div>🗓️ {showtimes || date}</div>}
      </div>
      <div>
        {duration && <div>⌛️ {duration}</div>}
        {bookingUrl && bookingUrl !== "#" && (
          <div>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, fontWeight: 600, color: "#2563eb", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
            >
              🔗 Réserver <ExternalLink style={{ display: "inline", width: 10, height: 10 }} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section: Météo ───────────────────────────────────────────────────────────

function WeatherCard({ data, loading }: { data: WeatherDay[]; loading: boolean }) {
  return (
    <div style={{ background: "#eef4ff", borderRadius: 8, padding: "14px 16px" }}>
      <h3
        style={{
          color: "#1a3a6e",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.05em",
          marginBottom: 8,
          textTransform: "lowercase",
        }}
      >
        météo ce weekend
      </h3>
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div style={{ height: 14, background: "#c8d8f0", borderRadius: 4, width: "80%" }} />
          <div style={{ height: 14, background: "#c8d8f0", borderRadius: 4, width: "70%" }} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.map((d) => (
            <div key={d.day} style={{ fontSize: 14, color: "#1a3a6e" }}>
              {d.icon} <strong>{d.day}</strong> · {d.desc} · {d.min}°–{d.max}°C
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section: Agenda ─────────────────────────────────────────────────────────

function AgendaCard() {
  return (
    <div style={{ background: "#eef4ff", borderRadius: 8, padding: "14px 16px" }}>
      <h3
        style={{
          color: "#1a3a6e",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.05em",
          marginBottom: 8,
          textTransform: "lowercase",
        }}
      >
        tes projets ce weekend
      </h3>
      {mockCalendarEvents.length === 0 ? (
        <p style={{ fontSize: 13, color: "#888", fontStyle: "italic" }}>
          Week-end libre pour l'instant 🎉
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {mockCalendarEvents.map((e, i) => (
            <div key={i} style={{ fontSize: 13, color: "#1a3a6e" }}>
              <strong>{e.day} {e.time}</strong> — {e.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section: Réservations ───────────────────────────────────────────────────

function BookingsSection() {
  return (
    <div>
      <SectionTitle>tes réservations</SectionTitle>
      {mockBookings.length === 0 ? (
        <p style={{ fontSize: 13, color: "#888", fontStyle: "italic" }}>
          Aucune réservation pour ce week-end
        </p>
      ) : (
        mockBookings.map((b, i) => (
          <div
            key={i}
            style={{
              background: "#fafafa",
              borderRadius: 8,
              padding: "14px 16px",
              marginBottom: 12,
              transition: "box-shadow 0.2s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.boxShadow = "none")
            }
          >
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a", lineHeight: 1.3 }}>
              {b.event_name}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 4,
                marginTop: 10,
                fontSize: 12,
                color: "#666",
                lineHeight: 1.5,
              }}
            >
              <div>
                📍 {b.location}
                <br />
                🗓️ {b.notes}
              </div>
              <div />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Section: Ma reco ────────────────────────────────────────────────────────

function RecoSection({ activity }: { activity: Activity }) {
  return (
    <div>
      <SectionTitle>ma reco pour ce week-end</SectionTitle>
      <div
        style={{
          background: "#fffbf0",
          borderLeft: "3px solid #f0a500",
          borderRadius: 8,
          padding: "14px 16px",
          transition: "box-shadow 0.2s",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.boxShadow = "none")
        }
      >
        <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a", lineHeight: 1.3 }}>
          {activity.title}
          {activity.is_exceptional && " 🌟"}
        </div>
        <p
          style={{
            fontSize: 13,
            color: "#555",
            lineHeight: 1.4,
            marginTop: 6,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          Mon coup de cœur cette semaine. {activity.description}
        </p>
        <MetaGrid
          arrondissement={activity.arrondissement}
          travelWalk={activity.travel_walk}
          date="Sam & Dim, 10h–12h"
          duration={activity.duration}
          bookingUrl={activity.booking_url}
        />
      </div>
    </div>
  );
}

// ─── Section: Cinéma ─────────────────────────────────────────────────────────

function CinemaSection({ activities }: { activities: Activity[] }) {
  const films = activities.filter((a) => a.category === "cinema").slice(0, 2);
  if (films.length === 0) return null;
  return (
    <div>
      <SectionTitle>cinéma</SectionTitle>
      <p style={{ fontSize: 12, color: "#888", marginTop: -8, marginBottom: 12 }}>
        dessin animé · 2–5 ans
      </p>
      {films.map((film) => (
        <div key={film.id} style={{ marginBottom: 20 }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}
          >
            <span style={{ fontWeight: 700, fontSize: 16, color: "#1a1a1a" }}>{film.title}</span>
            {film.badge && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#666",
                  background: "#f5f5f5",
                  padding: "2px 8px",
                  borderRadius: 10,
                }}
              >
                {film.badge}
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: 13,
              color: "#555",
              lineHeight: 1.4,
              marginBottom: 8,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {film.description}
          </p>
          {film.cinemas && film.cinemas.length > 0 && (
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
              className="cinema-sub-grid"
            >
              {film.cinemas.map((c) => (
                <div
                  key={c.name}
                  style={{
                    background: "#fafafa",
                    borderRadius: 6,
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "#666",
                    lineHeight: 1.5,
                    transition: "box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.boxShadow = "none")
                  }
                >
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#2563eb",
                      textDecoration: "none",
                      display: "block",
                      marginBottom: 2,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    {c.name}
                  </a>
                  <div>📍 {c.arrondissement} · 🚶 {c.travel_walk}</div>
                  <div>🗓️ {c.showtimes}</div>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#2563eb",
                      textDecoration: "none",
                      display: "inline-block",
                      marginTop: 2,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    🔗 Billets
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Section: Théâtre, Expos, Activités ──────────────────────────────────────

function ActivityList({
  title,
  activities,
  max,
}: {
  title: string;
  activities: Activity[];
  max: number;
}) {
  const items = activities.slice(0, max);
  if (items.length === 0) return null;
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      {items.map((act) => (
        <div
          key={act.id}
          style={{
            background: "#fafafa",
            borderRadius: 8,
            padding: "14px 16px",
            marginBottom: 12,
            transition: "box-shadow 0.2s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.boxShadow = "none")
          }
        >
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a", lineHeight: 1.3 }}>
            {act.title}
            {act.is_exceptional && " 🌟"}
          </div>
          <p
            style={{
              fontSize: 13,
              color: "#555",
              lineHeight: 1.4,
              marginTop: 4,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {act.description}
          </p>
          <MetaGrid
            arrondissement={act.arrondissement}
            travelWalk={act.travel_walk}
            date="Sam & Dim, 10h–12h"
            duration={act.duration}
            bookingUrl={act.booking_url}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Section: À venir ────────────────────────────────────────────────────────

function FutureSection({ futureEvents }: { futureEvents: FutureEvent[] }) {
  return (
    <div
      style={{
        background: "#fff8ee",
        marginLeft: "calc(-50vw + 50%)",
        marginRight: "calc(-50vw + 50%)",
        padding: "32px calc(50vw - 50% + 40px)",
      }}
      className="future-section-responsive"
    >
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#a05a00", marginBottom: 12 }}>
          week-end du {mockFutureWeekend.label}
        </div>
        <div>
          {mockFutureWeekend.events.map((e, i) => (
            <div key={i}>
              <div
                style={{
                  padding: "10px 0",
                  fontSize: 13,
                  color: "#555",
                  display: "flex",
                  gap: 8,
                  alignItems: "baseline",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{e.title}</span>
                <span>📍 {e.location}</span>
                <span>🗓️ {e.day} {e.time}</span>
              </div>
              {i < mockFutureWeekend.events.length - 1 && (
                <div style={{ borderBottom: "1px dashed #e0d0b0" }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#a05a00", marginBottom: 12 }}>
          à pré-booker
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          className="prebook-grid-responsive"
        >
          {futureEvents.map((evt) => (
            <div
              key={evt.id}
              style={{
                background: "#fff3e0",
                borderRadius: 8,
                padding: "12px 14px",
                transition: "box-shadow 0.2s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.boxShadow = "none")
              }
            >
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a", lineHeight: 1.3 }}>
                {evt.title}
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "#555",
                  lineHeight: 1.4,
                  marginTop: 4,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {evt.description}
              </p>
              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5, marginTop: 8 }}>
                <span>📍 {evt.arrondissement}</span>
                {" · "}
                <span>🗓️ {evt.date}</span>
                {" · "}
                <span>⌛️ dès {evt.age}</span>
                {" · "}
                {evt.booking_url && evt.booking_url !== "#" && (
                  <a
                    href={evt.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, fontWeight: 600, color: "#2563eb", textDecoration: "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    🔗 Réserver
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Scrape status banner ─────────────────────────────────────────────────────

function ScrapeBanner({
  status,
  activitiesFound,
  onTrigger,
  triggering,
}: {
  status: "idle" | "done" | "running" | "error" | "no_data";
  activitiesFound: number;
  onTrigger: () => void;
  triggering: boolean;
}) {
  if (status === "done" && activitiesFound > 0) return null;

  const msgs: Record<string, { bg: string; text: string; border: string; label: string }> = {
    idle: {
      bg: "#fffbf0",
      border: "#f0a500",
      text: "#a05a00",
      label: "Données de la semaine non encore générées.",
    },
    no_data: {
      bg: "#fffbf0",
      border: "#f0a500",
      text: "#a05a00",
      label: "Aucune activité scrapée pour ce week-end.",
    },
    running: {
      bg: "#eef4ff",
      border: "#2563eb",
      text: "#1a3a6e",
      label: "Scraping en cours… (peut prendre ~2 min)",
    },
    error: {
      bg: "#fff0f0",
      border: "#dc2626",
      text: "#7f1d1d",
      label: "Erreur lors du scraping.",
    },
  };

  const cfg = msgs[status] ?? msgs.idle;

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 8,
        padding: "12px 16px",
        marginBottom: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 13, color: cfg.text }}>{cfg.label}</span>
      {status !== "running" && (
        <button
          onClick={onTrigger}
          disabled={triggering}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#2563eb",
            background: "none",
            border: "1px solid #2563eb",
            borderRadius: 6,
            padding: "4px 12px",
            cursor: "pointer",
            opacity: triggering ? 0.6 : 1,
          }}
        >
          {triggering ? "Lancement…" : "Scraper maintenant"}
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WeekendNewsletter() {
  const { saturday, sunday } = getNextWeekendDates();
  const weekendLabel = `${formatDate(saturday)} & ${formatDate(sunday)}`;

  const [weatherData, setWeatherData] = useState<WeatherDay[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);

  // Live activities from DB
  const [liveActivities, setLiveActivities] = useState<Activity[] | null>(null);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [scrapeStatus, setScrapeStatus] = useState<"idle" | "done" | "running" | "error" | "no_data">("idle");
  const [scrapeCount, setScrapeCount] = useState(0);
  const [triggering, setTriggering] = useState(false);

  const weekKey = getDayKey();

  // ── Load activities from DB ──
  const loadActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      // Check last scrape run
      const { data: run } = await supabase
        .from("scrape_runs")
        .select("status, activities_found")
        .eq("week_key", weekKey)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (run?.status === "running") {
        setScrapeStatus("running");
        setActivitiesLoading(false);
        return;
      }
      if (run?.status === "error") {
        setScrapeStatus("error");
      }

      // Load activities
      const { data: rows } = await supabase
        .from("scraped_activities")
        .select("*")
        .eq("week_key", weekKey)
        .order("created_at");

      if (rows && rows.length > 0) {
        setLiveActivities(rows.map((r, i) => dbRowToActivity(r as DbActivity, i)));
        setScrapeStatus("done");
        setScrapeCount(rows.length);
      } else {
        setScrapeStatus(run?.status === "done" ? "no_data" : "idle");
        setLiveActivities(null);
      }
    } catch (err) {
      console.error("loadActivities error:", err);
      setLiveActivities(null);
    } finally {
      setActivitiesLoading(false);
    }
  }, [weekKey]);

  // ── Trigger scrape manually ──
  const triggerScrape = async (force = false) => {
    setTriggering(true);
    setScrapeStatus("running");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-activities`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ force }),
        }
      );
      const data = await res.json();
      if (data.success) {
        await loadActivities();
      } else if (data.fromCache) {
        await loadActivities();
      } else {
        setScrapeStatus("error");
      }
    } catch (err) {
      console.error("triggerScrape error:", err);
      setScrapeStatus("error");
    } finally {
      setTriggering(false);
    }
  };

  // ── Weather ──
  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      const satISO = formatDateISO(saturday);
      const sunISO = formatDateISO(sunday);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe%2FParis&start_date=${satISO}&end_date=${sunISO}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.daily) {
        const days = ["Samedi", "Dimanche"];
        setWeatherData(
          data.daily.time.map((t: string, i: number) => {
            const code = data.daily.weathercode[i];
            const info = getWeatherInfo(code);
            return {
              day: days[i] ?? t,
              icon: info.icon,
              desc: info.desc,
              min: Math.round(data.daily.temperature_2m_min[i]),
              max: Math.round(data.daily.temperature_2m_max[i]),
            };
          })
        );
      } else {
        setWeatherData(mockWeather);
      }
    } catch {
      setWeatherData(mockWeather);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    loadActivities();
  }, [fetchWeather, loadActivities]);

  // Poll if scraping is running
  useEffect(() => {
    if (scrapeStatus !== "running") return;
    const timer = setInterval(() => {
      loadActivities();
    }, 8000);
    return () => clearInterval(timer);
  }, [scrapeStatus, loadActivities]);

  const handleRefresh = async () => {
    setSpinning(true);
    await Promise.all([fetchWeather(), loadActivities()]);
    setTimeout(() => setSpinning(false), 800);
  };

  // Use live data if available, fall back to mock
  const activities = liveActivities ?? mockActivities;

  const theatreActivities = activities.filter((a) => a.category === "theatre");
  const expoActivities = activities.filter((a) => a.category === "expo");
  const otherActivities = activities.filter((a) => a.category === "activite");
  const recoActivity = theatreActivities[1] ?? activities[3] ?? activities[0];

  const isLive = liveActivities !== null && liveActivities.length > 0;

  return (
    <>
      <style>{`
        body {
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          color: #1a1a1a;
        }
        .newsletter-container {
          max-width: 640px;
          margin: 0 auto;
          padding: 36px 40px;
          background: #ffffff;
        }
        @media (max-width: 639px) {
          .newsletter-container { padding: 16px; }
          .weather-agenda-grid { grid-template-columns: 1fr !important; }
          .cinema-sub-grid { grid-template-columns: 1fr !important; }
          .prebook-grid-responsive { grid-template-columns: 1fr !important; }
          .future-section-responsive {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
        }
      `}</style>

      <div className="newsletter-container">
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", margin: 0, lineHeight: 1.2 }}>
              👋 Week-end avec Ariel & Gala
            </h1>
            <p style={{ fontSize: 14, color: "#888", margin: "4px 0 0" }}>{weekendLabel}</p>
            {isLive && (
              <span
                style={{
                  display: "inline-block",
                  marginTop: 4,
                  fontSize: 11,
                  color: "#22c55e",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 10,
                  padding: "1px 8px",
                  fontWeight: 500,
                }}
              >
                ✦ {scrapeCount} activités scrapées live
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "#888",
              display: "flex",
              alignItems: "center",
            }}
            title="Actualiser"
          >
            <RefreshCw
              size={18}
              style={{
                transition: "transform 0.6s",
                transform: spinning ? "rotate(360deg)" : "rotate(0deg)",
              }}
            />
          </button>
        </div>

        {/* ── Scrape banner ── */}
        <ScrapeBanner
          status={activitiesLoading ? "running" : scrapeStatus}
          activitiesFound={scrapeCount}
          onTrigger={() => triggerScrape(true)}
          triggering={triggering}
        />

        {/* ── Météo + Agenda ── */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 40 }}
          className="weather-agenda-grid"
        >
          <WeatherCard data={weatherData.length ? weatherData : mockWeather} loading={weatherLoading} />
          <AgendaCard />
        </div>

        {/* ── Réservations ── */}
        {activitiesLoading ? (
          <>
            <SectionTitle>tes réservations</SectionTitle>
            <SkeletonCard />
          </>
        ) : (
          <BookingsSection />
        )}

        <Separator />

        {/* ── Ma reco ── */}
        {recoActivity && <RecoSection activity={recoActivity} />}

        <Separator />

        {/* ── Cinéma ── */}
        {activitiesLoading ? (
          <>
            <SectionTitle>cinéma</SectionTitle>
            <SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <CinemaSection activities={activities} />
        )}

        <Separator />

        {/* ── Théâtre ── */}
        {activitiesLoading ? (
          <>
            <SectionTitle>théâtre & spectacles</SectionTitle>
            <SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <ActivityList title="théâtre & spectacles" activities={theatreActivities} max={3} />
        )}

        <Separator />

        {/* ── Expos ── */}
        {activitiesLoading ? (
          <>
            <SectionTitle>expositions & musées</SectionTitle>
            <SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <ActivityList title="expositions & musées" activities={expoActivities} max={3} />
        )}

        <Separator />

        {/* ── Activités ── */}
        {activitiesLoading ? (
          <>
            <SectionTitle>activités</SectionTitle>
            <SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <ActivityList title="activités" activities={otherActivities} max={3} />
        )}

        <Separator />
      </div>

      {/* ── À venir (full bleed) ── */}
      <div className="newsletter-container" style={{ maxWidth: 640, margin: "0 auto", padding: 0, overflow: "hidden" }}>
        <FutureSection futureEvents={mockFutureEvents} />
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "32px 40px",
          textAlign: "center",
          fontSize: 13,
          color: "#888",
        }}
      >
        Bon week-end avec Ariel et Gala ! 🎉
      </div>
    </>
  );
}
