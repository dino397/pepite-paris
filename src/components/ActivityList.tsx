import { useState } from "react";
import { CATEGORIES, type Activity, type Category } from "@/types/activity";
import { MapPin, Clock, ExternalLink, ChevronDown, Star } from "lucide-react";

function ActivityCard({ activity }: { activity: Activity }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: "hsl(40 35% 99%)",
        border: `1px solid ${activity.is_exceptional ? "hsl(38 50% 70%)" : "hsl(38 22% 88%)"}`,
        boxShadow: activity.is_exceptional ? "0 2px 12px rgba(180,140,60,0.1)" : "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4">
        <div className="flex gap-3">
          {activity.poster_url ? (
            <img
              src={activity.poster_url}
              alt=""
              className="w-16 h-20 rounded-xl object-cover flex-shrink-0"
              style={{ border: "1px solid hsl(38 22% 88%)" }}
            />
          ) : (
            <div
              className="w-16 h-20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: "hsl(42 30% 93%)" }}
            >
              {CATEGORIES.find((c) => c.id === activity.category)?.emoji ?? "📍"}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className="text-foreground leading-snug line-clamp-2"
                style={{ fontFamily: "'Lora', Georgia, serif", fontWeight: 500, fontSize: "0.95rem" }}
              >
                {activity.is_exceptional && <Star className="inline h-3.5 w-3.5 text-ghibli-gold mr-1" />}
                {activity.title}
              </h3>
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 text-muted-foreground/40 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </div>

            {activity.badge && (
              <span
                className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  background: "hsl(42 30% 93%)",
                  color: "hsl(30 25% 45%)",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {activity.badge}
              </span>
            )}

            <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: "hsl(30 15% 55%)", fontFamily: "'Nunito', sans-serif" }}>
              {activity.location && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {activity.location}
                  {activity.arrondissement && ` · ${activity.arrondissement}`}
                </span>
              )}
              {activity.duration && (
                <span className="flex items-center gap-1 flex-shrink-0">
                  <Clock className="h-3 w-3" />
                  {activity.duration}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
          {activity.description && (
            <p className="text-sm leading-relaxed" style={{ color: "hsl(30 25% 30%)" }}>
              {activity.description}
            </p>
          )}

          {activity.showtimes && (
            <p className="text-xs" style={{ color: "hsl(30 15% 55%)" }}>
              Séances : {activity.showtimes}
            </p>
          )}

          <div className="flex flex-wrap gap-2 text-xs" style={{ color: "hsl(30 15% 55%)" }}>
            {activity.travel_walk && <span>🚶 {activity.travel_walk}</span>}
            {activity.travel_bike && <span>🚲 {activity.travel_bike}</span>}
          </div>

          {activity.booking_url && (
            <a
              href={activity.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(152 36% 46%), hsl(168 42% 32%))" }}
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

function Skeleton() {
  return (
    <div className="rounded-2xl p-4 space-y-3 animate-pulse" style={{ background: "hsl(40 35% 99%)", border: "1px solid hsl(38 22% 88%)" }}>
      <div className="flex gap-3">
        <div className="w-16 h-20 rounded-xl" style={{ background: "hsl(42 30% 93%)" }} />
        <div className="flex-1 space-y-2">
          <div className="h-4 rounded-full w-3/5" style={{ background: "hsl(42 30% 93%)" }} />
          <div className="h-3 rounded-full w-2/5" style={{ background: "hsl(42 30% 93%)" }} />
          <div className="h-3 rounded-full w-4/5" style={{ background: "hsl(42 30% 93%)" }} />
        </div>
      </div>
    </div>
  );
}

interface ActivityListProps {
  activities: Activity[];
  loading: boolean;
}

export default function ActivityList({ activities, loading }: ActivityListProps) {
  if (loading) {
    return (
      <div className="px-4 py-6 space-y-8">
        {CATEGORIES.map((cat) => (
          <div key={cat.id}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{cat.emoji}</span>
              <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-widest">{cat.label}</h2>
              <div className="flex-1 h-px bg-border/60" />
            </div>
            <div className="space-y-3">
              <Skeleton />
              <Skeleton />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <span className="text-5xl mb-4">🌿</span>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "1.1rem" }} className="text-foreground">
          Aucune activité trouvée
        </p>
        <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
          Essayez de modifier vos filtres
        </p>
      </div>
    );
  }

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: activities.filter((a) => a.category === cat.id),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="px-4 py-6 space-y-8">
      {grouped.map((group) => (
        <div key={group.id}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{group.emoji}</span>
            <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              {group.label}
            </h2>
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-xs text-muted-foreground/50" style={{ fontFamily: "'Nunito', sans-serif" }}>
              {group.items.length}
            </span>
          </div>
          <div className="space-y-3">
            {group.items.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
