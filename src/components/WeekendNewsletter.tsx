import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ExternalLink, MapPin, Clock, Ticket, Sparkles, Plus, X, LogOut, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import pepiteIllustration from "@/assets/pepite-illustration.png";
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
  source_url: string | null;
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

// ─── WEEKEND PLAN ─────────────────────────────────────────────────────────────

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

  const weekendISOSat = formatDateISO(saturday);
  const weekendISOSun = formatDateISO(sunday);

  const weekendAgendaEvents = agendaEvents.filter((ev) => {
    const d = ev.event_date;
    return d === weekendISOSat || d === weekendISOSun;
  });

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
    <div className="rounded-2xl bg-ghibli-sky/10 border border-ghibli-sky/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-ghibli-sky">Programme du week-end</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs font-medium text-ghibli-sky hover:text-primary transition-colors"
        >
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? "Fermer" : "Ajouter"}
        </button>
      </div>

      {allItems.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground italic">Week-end libre pour l'instant 🎉</p>
      )}

      {allItems.map((item) => (
        <div key={item.id} className="flex items-start gap-2.5 group">
          <span className="text-base flex-shrink-0 mt-0.5">{item.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.subtitle}</p>
          </div>
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

const SHOW_POSTER_CATEGORIES = new Set(["cinema", "theatre", "expo", "activite"]);

function googleMapsUrl(location: string, arrondissement: string): string {
  const query = encodeURIComponent(`${location} Paris ${arrondissement}`);
  return `https://maps.google.com/?q=${query}`;
}

function parseMins(s: string | undefined | null): number {
  if (!s) return Infinity;
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : Infinity;
}

function fastestTravel(activity: Activity): { emoji: string; label: string } | null {
  const walk = parseMins(activity.travel_walk);
  const bike = parseMins(activity.travel_bike);
  const car  = parseMins(activity.travel_car);

  if (walk <= 12) return { emoji: "🚶", label: activity.travel_walk! };
  if (bike <= 25)  return { emoji: "🚲", label: activity.travel_bike! };

  const options = [
    { emoji: "🚶", label: activity.travel_walk, mins: walk },
    { emoji: "🚲", label: activity.travel_bike, mins: bike },
    { emoji: "🚗", label: activity.travel_car,  mins: car  },
  ].filter((o) => o.mins < Infinity);
  if (!options.length) return null;
  const best = options.reduce((a, b) => (a.mins <= b.mins ? a : b));
  return { emoji: best.emoji, label: best.label! };
}

function GhibliActivityCard({
  activity,
  reco = false,
  onDismiss,
}: {
  activity: Activity;
  reco?: boolean;
  onDismiss?: () => void;
}) {
  const cat = CAT_CONFIG[activity.category] ?? CAT_CONFIG.activite;
  const showPoster = SHOW_POSTER_CATEGORIES.has(activity.category) && activity.poster_url;
  const mapsUrl = activity.google_maps_url || (activity.location ? googleMapsUrl(activity.location, activity.arrondissement) : null);
  const travel = fastestTravel(activity);

  // For booking link: prefer source_url (specific page) then booking_url, then maps
  const bookingLink = (activity as any).source_url && (activity as any).source_url !== "#"
    ? (activity as any).source_url
    : activity.booking_url && activity.booking_url !== "#"
    ? activity.booking_url
    : null;

  return (
    <div
      className={`ghibli-card group relative overflow-hidden flex flex-row h-[160px] ${
        reco ? "border-ghibli-gold/40 ring-1 ring-ghibli-gold/20" : ""
      }`}
    >
      {reco && (
        <div className="absolute top-0 left-0 right-0 h-0.5 gradient-sunset z-10" />
      )}

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 z-20 flex items-center justify-center w-5 h-5 rounded-full bg-background/80 border border-border/60 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          aria-label="Supprimer cette activité"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Poster */}
      {showPoster && (
        <div className="flex-shrink-0 w-28 bg-muted overflow-hidden">
          <img
            src={activity.poster_url}
            alt={`Visuel ${activity.title}`}
            className="w-full h-full object-cover object-center"
            loading="lazy"
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              el.parentElement!.style.display = "none";
            }}
          />
        </div>
      )}

      {/* No poster: emoji icon */}
      {!showPoster && (
        <div className={`flex-shrink-0 w-14 flex items-center justify-center ${cat.bgClass}`}>
          <span className="text-3xl">{cat.emoji}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 p-3 flex flex-col justify-between overflow-hidden">
        <div>
          <div className="flex items-start gap-1.5 flex-wrap mb-1">
            <h3 className="font-display font-bold text-foreground text-sm leading-snug">
              {activity.title}
              {activity.is_exceptional && <span className="ml-1 text-ghibli-gold">🌟</span>}
            </h3>
          </div>
          <div className="flex flex-wrap gap-1 mb-1.5">
            <span className={`ghibli-tag border text-[10px] ${cat.bgClass} ${cat.textClass} ${cat.borderClass}`}>
              {cat.label}
            </span>
            {activity.badge && (
              <span className="ghibli-tag bg-muted text-muted-foreground border border-border text-[10px]">
                {activity.badge}
              </span>
            )}
          </div>
          <p
            className="text-xs text-muted-foreground leading-[1.45] overflow-hidden"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              minHeight: "calc(2 * 1.45em)",
            }}
          >
            {activity.description}
          </p>
        </div>

        {/* Bottom: meta row */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap mt-1">
          {activity.location && (
            <a
              href={mapsUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 hover:text-primary hover:underline transition-colors font-medium"
              title="Ouvrir dans Google Maps"
            >
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span>{activity.location}{activity.arrondissement ? ` · ${activity.arrondissement}` : ""}</span>
              <ExternalLink className="h-2.5 w-2.5 ml-0.5 opacity-60" />
            </a>
          )}
          {travel && (
            <span className="flex items-center gap-0.5 font-medium">
              {travel.emoji} {travel.label}
            </span>
          )}
          {activity.duration && (
            <span className="flex items-center gap-0.5 ml-auto">
              <Clock className="h-3 w-3" /> {activity.duration}
            </span>
          )}
          {bookingLink && (
            <a
              href={bookingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-primary font-semibold hover:underline"
            >
              <Ticket className="h-3 w-3" /> Réserver
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function GhibliActivityCardWithCinemas({
  activity,
  reco = false,
  onDismiss,
}: {
  activity: Activity;
  reco?: boolean;
  onDismiss?: () => void;
}) {
  return (
    <div className="space-y-2">
      <GhibliActivityCard activity={activity} reco={reco} onDismiss={onDismiss} />
      {activity.cinemas && activity.cinemas.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pl-1">
          {activity.cinemas.map((c) => (
            <div key={c.name} className="rounded-xl bg-ghibli-sky/8 border border-ghibli-sky/20 p-2.5 text-xs space-y-1">
              <a
                href={c.url && c.url !== "#" ? c.url : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-primary hover:underline block leading-tight"
              >
                {c.name}
              </a>
              <div className="text-muted-foreground">📍 {c.arrondissement} · 🚶 {c.travel_walk}</div>
              <div className="text-muted-foreground">🗓️ {c.showtimes}</div>
              {c.url && c.url !== "#" && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  🔗 Billets
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SECTION WITH VOIR PLUS ───────────────────────────────────────────────────

function ActivitySection({
  emoji,
  title,
  subtitle,
  activities,
  loading,
  initialCount = 2,
  withCinemas = false,
  dismissedIds,
  onDismiss,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  activities: Activity[];
  loading: boolean;
  initialCount?: number;
  withCinemas?: boolean;
  dismissedIds: Set<number>;
  onDismiss: (id: number) => void;
}) {
  const [showMore, setShowMore] = useState(false);

  const visible = activities.filter((a) => !dismissedIds.has(a.id));
  const displayed = showMore ? visible : visible.slice(0, initialCount);
  const hasMore = visible.length > initialCount;

  if (!loading && visible.length === 0) return null;

  return (
    <section>
      <SectionTitle emoji={emoji}>{title}</SectionTitle>
      {subtitle && <p className="text-xs text-muted-foreground -mt-2 mb-4">{subtitle}</p>}
      {loading ? (
        <div className="space-y-3">
          <GhibliSkeleton />
          <GhibliSkeleton />
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((a) =>
            withCinemas ? (
              <GhibliActivityCardWithCinemas
                key={a.id}
                activity={a}
                onDismiss={() => onDismiss(a.id)}
              />
            ) : (
              <GhibliActivityCard
                key={a.id}
                activity={a}
                onDismiss={() => onDismiss(a.id)}
              />
            )
          )}
          {hasMore && !showMore && (
            <button
              onClick={() => setShowMore(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-dashed border-border/60 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Voir plus d'idées
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ─── RECO CARD ────────────────────────────────────────────────────────────────

function RecoCard({ activity, onDismiss }: { activity: Activity; onDismiss?: () => void }) {
  return (
    <div className="space-y-3">
      <SectionTitle emoji="✨">Coup de cœur de la semaine</SectionTitle>
      <GhibliActivityCardWithCinemas activity={activity} reco onDismiss={onDismiss} />
    </div>
  );
}

// ─── FUTURE / PRE-BOOKING SECTION ─────────────────────────────────────────────

function FutureBanner({ futureEvents }: { futureEvents: FutureEvent[] }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-ghibli-meadow/8 border border-ghibli-meadow/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-ghibli-meadow mb-3">
          Week-end du {mockFutureWeekend.label}
        </p>
        <div className="space-y-0 divide-y divide-border/40">
          {mockFutureWeekend.events.map((e, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="text-lg flex-shrink-0">{e.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug truncate">{e.title}</p>
                <p className="text-xs text-muted-foreground">📍 {e.location} · 🗓️ {e.day} {e.time}</p>
              </div>
              <a
                href={e.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold text-primary border border-primary/30 rounded-xl px-2.5 py-1 hover:bg-primary/8 transition-colors"
              >
                <ExternalLink className="h-3 w-3" /> Voir
              </a>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            À pré-réserver
          </h2>
          <div className="flex-1 h-px bg-border/60" />
        </div>
        <div className="space-y-3">
          {futureEvents.map((evt) => (
            <div
              key={evt.id}
              className="ghibli-card flex flex-row h-[120px] overflow-hidden group hover:shadow-md transition-shadow"
            >
              <div className="flex-shrink-0 w-16 flex items-center justify-center bg-ghibli-gold/10 text-3xl">
                {evt.emoji}
              </div>
              <div className="flex-1 min-w-0 p-3 flex flex-col justify-between overflow-hidden">
                <div>
                  <h3 className="font-display font-bold text-foreground text-sm leading-snug mb-1">
                    {evt.title}
                  </h3>
                  <p
                    className="text-xs text-muted-foreground leading-[1.45] overflow-hidden"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {evt.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" /> {evt.location} · {evt.arrondissement}
                  </span>
                  <span>🗓️ {evt.date}</span>
                  <span className="ml-auto flex items-center gap-2">
                    <span>⌛ {evt.age}</span>
                    {evt.booking_url && evt.booking_url !== "#" && (
                      <a
                        href={evt.booking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary flex items-center gap-0.5 hover:underline"
                      >
                        <Ticket className="h-3 w-3" /> Réserver
                      </a>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

// ─── Age subtitle helper ──────────────────────────────────────────────────────

interface ChildData {
  name: string;
  age_years: number | null;
}

function buildAgeSubtitle(children: ChildData[]): string {
  const ages = children.map((c) => c.age_years).filter((a): a is number => a !== null);
  if (ages.length === 0) return "";
  const minAge = Math.max(0, Math.min(...ages) - 1);
  const maxAge = Math.max(...ages) + 2;
  if (children.length === 1) {
    return `Adapté à votre enfant · ${minAge}–${maxAge} ans`;
  }
  return `Adapté à vos enfants · ${minAge}–${maxAge} ans`;
}

export default function WeekendNewsletter({ onSignOut }: { onSignOut?: () => void }) {
  const { saturday, sunday } = getNextWeekendDates();
  const weekendLabel = `${formatDate(saturday)} & ${formatDate(sunday)}`;

  const [weatherData, setWeatherData] = useState<WeatherDay[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);

  const [liveActivities, setLiveActivities] = useState<Activity[] | null>(null);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [children, setChildren] = useState<ChildData[]>([]);

  // Dismissed activity ids
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(() => new Set());
  const [dismissedReco, setDismissedReco] = useState(false);

  const weekKey = getDayKey();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      // Load family profile → then children
      const { data: profile } = await supabase
        .from("family_profiles")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (profile) {
        const { data: childRows } = await supabase
          .from("children")
          .select("name, age_years")
          .eq("family_id", profile.id);
        if (childRows) setChildren(childRows);
      }
    });
  }, []);

  const ageSubtitle = buildAgeSubtitle(children);

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

  const loadActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const { data: rows } = await supabase
        .from("scraped_activities")
        .select("*")
        .eq("week_key", weekKey)
        .order("created_at");

      if (rows && rows.length > 0) {
        setLiveActivities(rows.map((r, i) => dbRowToActivity(r as DbActivity, i)));
      } else {
        setLiveActivities(null);
      }
    } catch (err) {
      console.error("loadActivities error:", err);
      setLiveActivities(null);
    } finally {
      setActivitiesLoading(false);
    }
  }, [weekKey]);

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

  const handleRefresh = async () => {
    setSpinning(true);
    await Promise.all([fetchWeather(), loadActivities(), loadAgendaEvents()]);
    setTimeout(() => setSpinning(false), 800);
  };

  const handleDismiss = (id: number) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const activities = liveActivities ?? mockActivities;
  const theatreActivities = activities.filter((a) => a.category === "theatre");
  const expoActivities = activities.filter((a) => a.category === "expo");
  const otherActivities = activities.filter((a) => a.category === "activite");
  const cinemaActivities = activities.filter((a) => a.category === "cinema");
  const recoActivity = !dismissedReco
    ? (theatreActivities[0] ?? activities[3] ?? activities[0])
    : null;

  return (
    <div className="min-h-screen bg-background">

      {/* ── HERO HEADER with illustration ── */}
      <div className="relative overflow-hidden" style={{ minHeight: 220 }}>
        {/* Illustration */}
        <img
          src={pepiteIllustration}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-[center_28%]"
        />

        {/* Animated clouds */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute rounded-full blur-sm opacity-40"
            style={{ width: 140, height: 42, background: "radial-gradient(ellipse, #fff8ee 60%, transparent 100%)", top: "8%", left: "6%", animation: "cloudDrift1 22s ease-in-out infinite" }} />
          <div className="absolute rounded-full blur-sm opacity-35"
            style={{ width: 90, height: 28, background: "radial-gradient(ellipse, #fdebd0 60%, transparent 100%)", top: "12%", left: "10%", animation: "cloudDrift1 22s ease-in-out infinite" }} />
          <div className="absolute rounded-full blur-sm opacity-40"
            style={{ width: 180, height: 48, background: "radial-gradient(ellipse, #fff8ee 60%, transparent 100%)", top: "4%", left: "55%", animation: "cloudDrift2 28s ease-in-out infinite" }} />
          <div className="absolute rounded-full blur-sm opacity-30"
            style={{ width: 120, height: 32, background: "radial-gradient(ellipse, #fdebd0 60%, transparent 100%)", top: "10%", left: "62%", animation: "cloudDrift2 28s ease-in-out infinite" }} />
        </div>
        <style>{`
          @keyframes cloudDrift1 { 0%, 100% { transform: translateX(0px); } 50% { transform: translateX(28px); } }
          @keyframes cloudDrift2 { 0%, 100% { transform: translateX(0px); } 50% { transform: translateX(-22px); } }
        `}</style>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/75 to-transparent" />

        {/* Decorative top strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 gradient-meadow z-10" />

        {/* Header content */}
        <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-8 pt-10 pb-6 flex items-start justify-between">
          <div className="drop-shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl animate-sway inline-block">🌿</span>
              <h1 className="font-display font-bold text-2xl text-foreground leading-tight">
                Week-end avec Ariel & Gala
              </h1>
            </div>
            <p className="text-sm text-muted-foreground ml-9">{weekendLabel}</p>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/8 transition-all backdrop-blur-sm bg-background/40"
              title="Actualiser"
            >
              <RefreshCw className={`h-4 w-4 transition-transform duration-700 ${spinning ? "rotate-[720deg]" : ""}`} />
            </button>
            {onSignOut && (
              <button
                onClick={async () => { await supabase.auth.signOut(); onSignOut(); }}
                className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all backdrop-blur-sm bg-background/40"
                title="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-8 pb-8 space-y-8 animate-fade-in -mt-2">

        {/* ── MÉTÉO + PROGRAMME ── */}
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
            <RecoCard activity={recoActivity} onDismiss={() => setDismissedReco(true)} />
          </section>
        )}

        {/* ── CINÉMA ── */}
        <ActivitySection
          emoji="🎬"
          title="Cinéma"
          subtitle="Adapté aux 3-8 ans"
          activities={cinemaActivities}
          loading={activitiesLoading}
          initialCount={2}
          withCinemas
          dismissedIds={dismissedIds}
          onDismiss={handleDismiss}
        />

        {/* ── THÉÂTRE ── */}
        <ActivitySection
          emoji="🎭"
          title="Théâtre & Spectacles"
          activities={theatreActivities}
          loading={activitiesLoading}
          initialCount={2}
          dismissedIds={dismissedIds}
          onDismiss={handleDismiss}
        />

        {/* ── EXPOS ── */}
        <ActivitySection
          emoji="🖼️"
          title="Expositions & Musées"
          activities={expoActivities}
          loading={activitiesLoading}
          initialCount={2}
          dismissedIds={dismissedIds}
          onDismiss={handleDismiss}
        />

        {/* ── ACTIVITÉS ── */}
        <ActivitySection
          emoji="🌿"
          title="Activités"
          activities={otherActivities}
          loading={activitiesLoading}
          initialCount={2}
          dismissedIds={dismissedIds}
          onDismiss={handleDismiss}
        />

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
