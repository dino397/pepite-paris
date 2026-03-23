import { Sparkles, Clock, MapPin, Ticket, ExternalLink, X } from "lucide-react";

export interface Activity {
  id: string;
  title: string;
  emoji: string;
  category: string;
  age_min?: number;
  age_max?: number;
  duration?: string;
  distance_km?: number;
  transport?: string[];
  description: string;
  practical_info?: string;
  requires_booking?: boolean;
  booking_url?: string | null;
  booking_deadline?: string | null;
  tags?: string[];
  highlighted?: boolean;
  indoor?: boolean;
  urgency?: "high" | "medium" | "low";
}

const CATEGORY_COLORS: Record<string, string> = {
  sortie: "bg-soft-sage/15 text-soft-sage border-soft-sage/30",
  maison: "bg-warm-amber/15 text-warm-amber border-warm-amber/30",
  culture: "bg-purple-100 text-purple-700 border-purple-200",
  sport: "bg-sky-blue/15 text-sky-blue border-sky-blue/30",
  créatif: "bg-blush/15 text-blush border-blush/30",
  spectacle: "bg-warm-gold/15 text-warm-gold border-warm-gold/30",
  cinema: "bg-sky-blue/15 text-sky-blue border-sky-blue/30",
  atelier: "bg-blush/15 text-blush border-blush/30",
};

const URGENCY_CONFIG = {
  high: { label: "Urgent", color: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Cette semaine", color: "bg-warm-amber/15 text-warm-amber border-warm-amber/30" },
  low: { label: "Bientôt", color: "bg-muted text-muted-foreground border-border" },
};

interface ActivityCardProps {
  activity: Activity;
  variant?: "weekend" | "prebooking";
  onDismiss?: () => void;
  isExtra?: boolean;
}

export default function ActivityCard({
  activity,
  variant = "weekend",
  onDismiss,
  isExtra = false,
}: ActivityCardProps) {
  const categoryColor = CATEGORY_COLORS[activity.category] || CATEGORY_COLORS.sortie;

  return (
    <div
      className={`relative rounded-2xl border bg-card overflow-hidden transition-all hover:shadow-md group ${
        activity.highlighted
          ? "border-primary/40 shadow-sm ring-1 ring-primary/10"
          : isExtra
          ? "border-dashed border-border"
          : "border-border/70"
      }`}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-muted/80 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
          aria-label="Supprimer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {activity.highlighted && (
        <div className="gradient-hero px-4 py-1.5 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          <span className="text-xs font-semibold text-primary-foreground tracking-wide">Pépite de la semaine ✨</span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="text-3xl flex-shrink-0 mt-0.5">{activity.emoji}</div>
          <div className="flex-1 min-w-0 pr-6">
            <h3 className="font-display font-bold text-foreground leading-snug">{activity.title}</h3>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${categoryColor}`}>
                {activity.category}
              </span>
              {variant === "prebooking" && activity.urgency && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${URGENCY_CONFIG[activity.urgency].color}`}>
                  ⏰ {URGENCY_CONFIG[activity.urgency].label}
                </span>
              )}
              {activity.indoor === false && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-soft-sage/10 text-soft-sage border-soft-sage/20">
                  🌤️ Extérieur
                </span>
              )}
              {activity.indoor === true && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-warm-amber/10 text-warm-amber border-warm-amber/20">
                  🏠 Intérieur
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-foreground/80 leading-relaxed">{activity.description}</p>

        {/* Meta info */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {activity.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {activity.duration}
            </span>
          )}
          {activity.distance_km !== undefined && activity.distance_km > 0 && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              ~{activity.distance_km} km
            </span>
          )}
          {activity.age_min !== undefined && (
            <span className="flex items-center gap-1">
              👶 {activity.age_min}{activity.age_max ? `–${activity.age_max}` : "+"} ans
            </span>
          )}
        </div>

        {/* Practical info */}
        {activity.practical_info && (
          <div className="bg-muted/50 rounded-xl px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            {activity.practical_info}
          </div>
        )}

        {/* Booking deadline */}
        {activity.booking_deadline && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-warm-amber">
            <Ticket className="h-3.5 w-3.5" />
            Réserver avant : {activity.booking_deadline}
          </div>
        )}

        {/* Tags */}
        {activity.tags && activity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activity.tags.map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-secondary text-muted-foreground rounded-full text-xs">
                #{tag.replace(/\s/g, "_")}
              </span>
            ))}
          </div>
        )}

        {/* Booking CTA */}
        {variant === "prebooking" && activity.booking_url && (
          <a
            href={activity.booking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl gradient-hero text-primary-foreground text-sm font-semibold transition-opacity hover:opacity-90"
          >
            <Ticket className="h-4 w-4" />
            Réserver
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {variant === "prebooking" && !activity.booking_url && (
          <div className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-border text-muted-foreground text-xs">
            🔍 Recherchez "{activity.title}" pour réserver
          </div>
        )}
      </div>
    </div>
  );
}
