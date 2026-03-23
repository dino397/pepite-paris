import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ExternalLink, MapPin, Clock, Ticket, Sparkles, CalendarDays, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  mockWeather,
  mockBookings,
  mockActivities,
  mockFutureEvents,
  mockFutureWeekend,
  type Activity,
  type FutureEvent,
} from "@/data/mockActivities";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDayKey(): string {
  return new Date().toISOString().split("T")[0];
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
  return WEATHER_CODE_MAP[String(code)] ?? { icon: "⛅", desc: "Variable" };
}

interface WeatherDay {
  day: string;
  icon: string;
  desc: string;
  min: number;
  max: number;
}

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
  poster_url: string | null;
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
    poster_url: row.poster_url ?? undefined,
    cinemas: row.cinema_name
      ? [{ name: row.cinema_name, url: row.cinema_url ?? "", arrondissement: row.arrondissement ?? "", travel_walk: row.travel_walk ?? "", showtimes: row.showtimes ?? "" }]
      : undefined,
  };
}

// ─── CATEGORY CONFIG ──────────────────────────────────────────────────────────

const CAT_CONFIG: Record<string, { label: string; emoji: string; bgClass: string; textClass: string; borderClass: string }> = {
  cinema:   { label: "Cinéma",    emoji: "🎬", bgClass: "bg-ghibli-sky/15",    textClass: "text-ghibli-sky",    borderClass: "border-ghibli-sky/30" },
  theatre:  { label: "Théâtre",   emoji: "🎭", bgClass: "bg-ghibli-petal/15",  textClass: "text-ghibli-petal",  borderClass: "border-ghibli-petal/30" },
  expo:     { label: "Expo",      emoji: "🖼️", bgClass: "bg-ghibli-gold/15",   textClass: "text-ghibli-gold",   borderClass: "border-ghibli-gold/30" },
  activite: { label: "Activité",  emoji: "🌿", bgClass: "bg-ghibli-meadow/15", textClass: "text-ghibli-meadow", borderClass: "border-ghibli-meadow/30" },
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function SectionTitle({ children, emoji }: { children: React.ReactNode; emoji?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {emoji && <span className="text-base">{emoji}</span>}
      <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-widest">
        {children}
      </h2>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

function GhibliSkeleton() {
  return (
    <div className="ghibli-card p-4 space-y-3 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded-full w-3/5" />
          <div className="h-3 bg-muted rounded-full w-2/5" />
        </div>
      </div>
      <div className="h-3 bg-muted rounded-full w-full" />
      <div className="h-3 bg-muted rounded-full w-4/5" />
    </div>
  );
}

// ─── WEATHER CARD ─────────────────────────────────────────────────────────────

function WeatherStrip({ data, loading }: { data: WeatherDay[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-ghibli-sky/10 border border-ghibli-sky/20 p-4 animate-pulse">
        <div className="h-4 bg-ghibli-sky/20 rounded-full w-2/5 mb-3" />
        <div className="space-y-2">
          <div className="h-5 bg-ghibli-sky/20 rounded-full w-4/5" />
          <div className="h-5 bg-ghibli-sky/20 rounded-full w-3/5" />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-ghibli-sky/10 border border-ghibli-sky/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-ghibli-sky mb-3">Météo ce week-end</p>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.day} className="flex items-center gap-2 text-sm">
            <span className="text-lg leading-none">{d.icon}</span>
            <span className="font-display font-semibold text-foreground">{d.day}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{d.desc}</span>
            <span className="ml-auto font-medium text-foreground/80">{d.min}°–{d.max}°C</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── WEEKEND PLAN (merged bookings + agenda) ─────────────────────────────────

interface AgendaEvent {
  id: string;
  title: string;
  event_date: string;
  emoji: string | null;
  event_type: string | null;
  notes: string | null;
}

const EMOJIS = ["🎂", "🎉", "🏋️", "📚", "🎭", "🎬", "🍕", "✈️", "🏖️", "🎁", "👨‍👩‍👧", "📅"];

function WeekendPlanSection({
  userId,
  agendaEvents,
  onEventsChange,
  saturday,
  sunday,
}: {
  userId: string | null;
  agendaEvents: AgendaEvent[];
  onEventsChange: () => void;
  saturday: Date;
  sunday: Date;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formEmoji, setFormEmoji] = useState("📅");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Combine real bookings + mock bookings for the weekend
  const weekendISOSat = formatDateISO(saturday);
  const weekendISOSun = formatDateISO(sunday);

  // Filter agenda events for this weekend
  const weekendAgendaEvents = agendaEvents.filter((ev) => {
    const d = ev.event_date;
    return d === weekendISOSat || d === weekendISOSun;
  });

  // Mock bookings always shown
  const allItems = [
    ...mockBookings.map((b, i) => ({
      id: `booking-${i}`,
      emoji: "🎟️",
      title: b.event_name,
      subtitle: `${b.location} · ${b.notes}`,
      isBooking: true,
    })),
    ...weekendAgendaEvents.map((ev) => ({
      id: ev.id,
      emoji: ev.emoji ?? "📅",
      title: ev.title,
      subtitle: new Date(ev.event_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) + (ev.notes ? ` · ${ev.notes}` : ""),
      isBooking: false,
    })),
  ];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("agenda_events").insert({
        user_id: userId,
        title: formTitle,
        event_date: formDate,
        emoji: formEmoji,
        notes: formNotes || null,
      });
      if (error) throw error;
      toast.success("Ajouté au programme 🌿");
      setFormTitle(""); setFormDate(""); setFormNotes(""); setFormEmoji("📅");
      setShowForm(false);
      onEventsChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith("booking-")) return;
    await supabase.from("agenda_events").delete().eq("id", id);
    onEventsChange();
  };

  return (
    <div className="rounded-2xl bg-ghibli-meadow/8 border border-ghibli-meadow/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-ghibli-meadow">Programme du week-end</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs font-medium text-ghibli-meadow hover:text-primary transition-colors"
        >
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? "Fermer" : "Ajouter"}
        </button>
      </div>

      {allItems.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground italic">Week-end libre pour l'instant 🎉</p>
      )}

      {allItems.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-2.5 group"
        >
          <span className="text-base flex-shrink-0 mt-0.5">{item.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.subtitle}</p>
          </div>
          {item.isBooking && (
            <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-ghibli-gold bg-ghibli-gold/10 rounded-full px-2 py-0.5">
              Réservé
            </span>
          )}
          {!item.isBooking && (
            <button
              onClick={() => handleDelete(item.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}

      {showForm && (
        <form onSubmit={handleAdd} className="pt-2 space-y-2.5 border-t border-border/50 animate-fade-in">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Titre</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Brunch, ciné, musée…" required className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Note</Label>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Détails" className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setFormEmoji(em)}
                className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${formEmoji === em ? "bg-primary/20 ring-2 ring-primary scale-110" : "bg-muted hover:bg-secondary"}`}
              >
                {em}
              </button>
            ))}
          </div>
          <Button type="submit" disabled={saving} size="sm" className="w-full gradient-meadow text-primary-foreground rounded-xl font-semibold">
            {saving ? "Ajout…" : "Ajouter au programme"}
          </Button>
        </form>
      )}
    </div>
  );
}

// ─── ACTIVITY CARD (Ghibli style) ─────────────────────────────────────────────

const SHOW_POSTER_CATEGORIES = new Set(["cinema", "theatre", "expo"]);

function GhibliActivityCard({ activity, reco = false }: { activity: Activity; reco?: boolean }) {
  const cat = CAT_CONFIG[activity.category] ?? CAT_CONFIG.activite;
  const showPoster = SHOW_POSTER_CATEGORIES.has(activity.category) && activity.poster_url;

  return (
    <div
      className={`ghibli-card group relative ${
        reco ? "border-ghibli-gold/40 ring-1 ring-ghibli-gold/20" : ""
      } ${showPoster ? "p-0 overflow-hidden" : ""}`}
    >
      {reco && (
        <div className="absolute top-0 left-0 right-0 h-0.5 gradient-sunset z-10" />
      )}

      <div className="flex flex-row items-stretch">
        {/* Poster — side column, natural proportions, no crop */}
        {showPoster && (
          <div className="flex-shrink-0 w-28 self-stretch bg-muted">
            <img
              src={activity.poster_url}
              alt={`Affiche ${activity.title}`}
              className="w-full h-full object-cover object-center"
              loading="lazy"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.parentElement!.style.display = "none";
              }}
            />
          </div>
        )}

        <div className={`flex-1 min-w-0 p-4 space-y-3 ${showPoster ? "" : ""}`}>
          <div className="flex items-start gap-3">
            {!showPoster && (
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${cat.bgClass}`}>
                {cat.emoji}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <h3 className="font-display font-bold text-foreground leading-snug flex-1">
                  {activity.title}
                  {activity.is_exceptional && <span className="ml-1 text-ghibli-gold">🌟</span>}
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className={`ghibli-tag border text-[11px] ${cat.bgClass} ${cat.textClass} ${cat.borderClass}`}>
                  {showPoster && <span className="mr-0.5">{cat.emoji}</span>}{cat.label}
                </span>
                {activity.badge && (
                  <span className="ghibli-tag bg-muted text-muted-foreground border border-border text-[11px]">
                    {activity.badge}
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{activity.description}</p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {activity.arrondissement && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {activity.arrondissement}
                {activity.travel_walk && ` · 🚶 ${activity.travel_walk}`}
              </span>
            )}
            {activity.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {activity.duration}
              </span>
            )}
            {activity.booking_url && activity.booking_url !== "#" && (
              <a
                href={activity.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-primary font-semibold hover:underline"
              >
                <Ticket className="h-3 w-3" /> Réserver <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>

          {/* Cinema sub-cards */}
          {activity.cinemas && activity.cinemas.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {activity.cinemas.map((c) => (
                <div key={c.name} className="rounded-xl bg-ghibli-sky/8 border border-ghibli-sky/20 p-2.5 text-xs space-y-1">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-primary hover:underline block leading-tight"
                  >
                    {c.name}
                  </a>
                  <div className="text-muted-foreground">📍 {c.arrondissement} · 🚶 {c.travel_walk}</div>
                  <div className="text-muted-foreground">🗓️ {c.showtimes}</div>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    🔗 Billets
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── RECO CARD ────────────────────────────────────────────────────────────────

function RecoCard({ activity }: { activity: Activity }) {
  return (
    <div className="space-y-3">
      <SectionTitle emoji="✨">Coup de cœur de la semaine</SectionTitle>
      <GhibliActivityCard activity={activity} reco />
    </div>
  );
}

// ─── FUTURE / PRE-BOOKING SECTION ─────────────────────────────────────────────

function FutureBanner({ futureEvents }: { futureEvents: FutureEvent[] }) {
  return (
    <div className="rounded-3xl bg-ghibli-gold/8 border border-ghibli-gold/20 p-5 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-ghibli-earth mb-1">
          Week-end du {mockFutureWeekend.label}
        </p>
        <div className="space-y-2">
          {mockFutureWeekend.events.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-ghibli-earth font-semibold">{e.title}</span>
              <span className="text-muted-foreground text-xs">· 📍 {e.location} · 🗓️ {e.day} {e.time}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-ghibli-earth mb-3">
          À pré-réserver dès maintenant
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {futureEvents.map((evt) => (
            <div
              key={evt.id}
              className="rounded-2xl bg-card border border-ghibli-gold/20 p-3.5 space-y-2 hover:shadow-card transition-shadow"
            >
              <p className="font-display font-bold text-foreground text-sm leading-snug">{evt.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{evt.description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span>📍 {evt.arrondissement}</span>
                <span>🗓️ {evt.date}</span>
                <span>⌛ dès {evt.age}</span>
                {evt.booking_url && evt.booking_url !== "#" && (
                  <a
                    href={evt.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto font-semibold text-primary flex items-center gap-1 hover:underline"
                  >
                    🔗 Réserver <ExternalLink className="h-2.5 w-2.5" />
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

// ─── SCRAPE BANNER ────────────────────────────────────────────────────────────

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

  const cfg = {
    idle:    { bg: "bg-ghibli-gold/8 border-ghibli-gold/25",   text: "text-ghibli-earth", label: "Activités non encore générées pour ce week-end." },
    no_data: { bg: "bg-ghibli-gold/8 border-ghibli-gold/25",   text: "text-ghibli-earth", label: "Aucune activité scrapée pour ce week-end." },
    running: { bg: "bg-ghibli-sky/10 border-ghibli-sky/25",    text: "text-ghibli-deep",  label: "Scraping en cours… (~2 min)" },
    error:   { bg: "bg-destructive/5 border-destructive/20",   text: "text-destructive",  label: "Erreur lors du scraping." },
    done:    { bg: "bg-ghibli-gold/8 border-ghibli-gold/25",   text: "text-ghibli-earth", label: "" },
  }[status] ?? { bg: "bg-ghibli-gold/8 border-ghibli-gold/25", text: "text-ghibli-earth", label: "" };

  return (
    <div className={`rounded-2xl border ${cfg.bg} px-4 py-3 flex items-center justify-between gap-3 flex-wrap`}>
      <span className={`text-sm ${cfg.text}`}>{cfg.label}</span>
      {status !== "running" && (
        <button
          onClick={onTrigger}
          disabled={triggering}
          className="text-xs font-semibold text-primary border border-primary/30 rounded-xl px-3 py-1.5 hover:bg-primary/5 transition-colors disabled:opacity-50"
        >
          {triggering ? "Lancement…" : "🌿 Scraper maintenant"}
        </button>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function WeekendNewsletter() {
  const { saturday, sunday } = getNextWeekendDates();
  const weekendLabel = `${formatDate(saturday)} & ${formatDate(sunday)}`;

  const [weatherData, setWeatherData] = useState<WeatherDay[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);

  const [liveActivities, setLiveActivities] = useState<Activity[] | null>(null);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [scrapeStatus, setScrapeStatus] = useState<"idle" | "done" | "running" | "error" | "no_data">("idle");
  const [scrapeCount, setScrapeCount] = useState(0);
  const [triggering, setTriggering] = useState(false);

  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const weekKey = getDayKey();

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  // Load agenda events
  const loadAgendaEvents = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("agenda_events")
      .select("*")
      .eq("user_id", userId)
      .order("event_date");
    if (data) setAgendaEvents(data);
  }, [userId]);

  useEffect(() => {
    if (userId) loadAgendaEvents();
  }, [userId, loadAgendaEvents]);

  // Load activities
  const loadActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const { data: run } = await supabase
        .from("scrape_runs")
        .select("status, activities_found")
        .eq("week_key", weekKey)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (run?.status === "running") { setScrapeStatus("running"); setActivitiesLoading(false); return; }
      if (run?.status === "error") setScrapeStatus("error");

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

  const triggerScrape = async (force = false) => {
    setTriggering(true);
    setScrapeStatus("running");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-activities`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ force }),
        }
      );
      const data = await res.json();
      if (data.success || data.fromCache) await loadActivities();
      else setScrapeStatus("error");
    } catch { setScrapeStatus("error"); }
    finally { setTriggering(false); }
  };

  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      const satISO = formatDateISO(saturday);
      const sunISO = formatDateISO(sunday);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe%2FParis&start_date=${satISO}&end_date=${sunISO}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.daily) {
        setWeatherData(
          data.daily.time.map((t: string, i: number) => {
            const code = data.daily.weathercode[i];
            const info = getWeatherInfo(code);
            return { day: ["Samedi", "Dimanche"][i] ?? t, ...info, min: Math.round(data.daily.temperature_2m_min[i]), max: Math.round(data.daily.temperature_2m_max[i]) };
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

  useEffect(() => { fetchWeather(); loadActivities(); }, [fetchWeather, loadActivities]);

  useEffect(() => {
    if (scrapeStatus !== "running") return;
    const timer = setInterval(() => loadActivities(), 8000);
    return () => clearInterval(timer);
  }, [scrapeStatus, loadActivities]);

  const handleRefresh = async () => {
    setSpinning(true);
    await Promise.all([fetchWeather(), loadActivities(), loadAgendaEvents()]);
    setTimeout(() => setSpinning(false), 800);
  };

  const activities = liveActivities ?? mockActivities;
  const theatreActivities = activities.filter((a) => a.category === "theatre");
  const expoActivities = activities.filter((a) => a.category === "expo");
  const otherActivities = activities.filter((a) => a.category === "activite");
  const cinemaActivities = activities.filter((a) => a.category === "cinema");
  const recoActivity = theatreActivities[0] ?? activities[3] ?? activities[0];
  const isLive = liveActivities !== null && liveActivities.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative top strip */}
      <div className="h-1.5 w-full gradient-meadow" />

      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 space-y-8 animate-fade-in">

        {/* ── HEADER ── */}
        <header className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl animate-sway inline-block">🌿</span>
              <h1 className="font-display font-bold text-2xl text-foreground leading-tight">
                Week-end avec Ariel & Gala
              </h1>
            </div>
            <p className="text-sm text-muted-foreground ml-9">{weekendLabel}</p>
            {isLive && (
              <span className="ml-9 mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/8 border border-primary/20 rounded-full px-2.5 py-0.5">
                <Sparkles className="h-3 w-3" /> {scrapeCount} activités en direct
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            className="mt-1 p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/8 transition-all"
            title="Actualiser"
          >
            <RefreshCw className={`h-4 w-4 transition-transform duration-700 ${spinning ? "rotate-[720deg]" : ""}`} />
          </button>
        </header>

        {/* ── SCRAPE BANNER ── */}
        <ScrapeBanner
          status={activitiesLoading ? "running" : scrapeStatus}
          activitiesFound={scrapeCount}
          onTrigger={() => triggerScrape(true)}
          triggering={triggering}
        />

        {/* ── MÉTÉO + PROGRAMME (merged) ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <WeatherStrip data={weatherData.length ? weatherData : mockWeather} loading={weatherLoading} />
          <WeekendPlanSection
            userId={userId}
            agendaEvents={agendaEvents}
            onEventsChange={loadAgendaEvents}
            saturday={saturday}
            sunday={sunday}
          />
        </section>

        {/* ── COUP DE CŒUR ── */}
        {recoActivity && (
          <section>
            <RecoCard activity={recoActivity} />
          </section>
        )}

        {/* ── CINÉMA ── */}
        {(activitiesLoading ? true : cinemaActivities.length > 0) && (
          <section>
            <SectionTitle emoji="🎬">Cinéma</SectionTitle>
            <p className="text-xs text-muted-foreground -mt-2 mb-4">dessin animé · 2–8 ans</p>
            {activitiesLoading ? (
              <div className="space-y-3"><GhibliSkeleton /><GhibliSkeleton /></div>
            ) : (
              <div className="space-y-3">
                {cinemaActivities.slice(0, 2).map((a) => <GhibliActivityCard key={a.id} activity={a} />)}
              </div>
            )}
          </section>
        )}

        {/* ── THÉÂTRE ── */}
        {(activitiesLoading ? true : theatreActivities.length > 0) && (
          <section>
            <SectionTitle emoji="🎭">Théâtre & Spectacles</SectionTitle>
            {activitiesLoading ? (
              <div className="space-y-3"><GhibliSkeleton /><GhibliSkeleton /></div>
            ) : (
              <div className="space-y-3">
                {theatreActivities.slice(0, 3).map((a) => <GhibliActivityCard key={a.id} activity={a} />)}
              </div>
            )}
          </section>
        )}

        {/* ── EXPOS ── */}
        {(activitiesLoading ? true : expoActivities.length > 0) && (
          <section>
            <SectionTitle emoji="🖼️">Expositions & Musées</SectionTitle>
            {activitiesLoading ? (
              <div className="space-y-3"><GhibliSkeleton /><GhibliSkeleton /></div>
            ) : (
              <div className="space-y-3">
                {expoActivities.slice(0, 3).map((a) => <GhibliActivityCard key={a.id} activity={a} />)}
              </div>
            )}
          </section>
        )}

        {/* ── ACTIVITÉS ── */}
        {(activitiesLoading ? true : otherActivities.length > 0) && (
          <section>
            <SectionTitle emoji="🌿">Activités</SectionTitle>
            {activitiesLoading ? (
              <div className="space-y-3"><GhibliSkeleton /><GhibliSkeleton /></div>
            ) : (
              <div className="space-y-3">
                {otherActivities.slice(0, 3).map((a) => <GhibliActivityCard key={a.id} activity={a} />)}
              </div>
            )}
          </section>
        )}

        {/* ── À VENIR ── */}
        <section>
          <SectionTitle emoji="🗓️">À venir & à pré-réserver</SectionTitle>
          <FutureBanner futureEvents={mockFutureEvents} />
        </section>

        {/* ── FOOTER ── */}
        <footer className="text-center pb-8">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-lg">🌸</span>
            Bon week-end avec Ariel et Gala !
            <span className="text-lg">🌸</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
