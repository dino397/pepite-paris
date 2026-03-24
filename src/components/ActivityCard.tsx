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
  location?: string;
  latitude?: number;
  longitude?: number;
}

const URGENCY_CONFIG = {
  high: { label: "Urgent", bg: "hsl(0 65% 52% / 0.10)", color: "hsl(0 65% 44%)", border: "hsl(0 65% 52% / 0.22)" },
  medium: { label: "Cette semaine", bg: "hsl(35 80% 60% / 0.12)", color: "hsl(35 65% 40%)", border: "hsl(35 80% 60% / 0.28)" },
  low: { label: "Bientôt", bg: "hsl(42 25% 91%)", color: "hsl(30 15% 55%)", border: "hsl(38 22% 80%)" },
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

  const cardBorder = activity.highlighted
    ? "hsl(168 42% 38% / 0.40)"
    : isExtra
    ? "hsl(38 22% 84%)"
    : "hsl(38 22% 84% / 0.80)";

  return (
    <div
      className="relative rounded-2xl overflow-hidden transition-all hover:shadow-hover group"
      style={{
        background: "hsl(40 35% 99%)",
        border: `1.5px ${isExtra ? "dashed" : "solid"} ${cardBorder}`,
        boxShadow: activity.highlighted
          ? "0 2px 16px -4px hsl(168 42% 38% / 0.15), 0 1px 4px hsl(30 25% 20% / 0.05)"
          : "0 1px 8px -3px hsl(30 25% 20% / 0.08)",
      }}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center w-6 h-6 rounded-full transition-colors"
          style={{ background: "hsl(42 25% 91% / 0.90)", color: "hsl(30 15% 55%)" }}
          aria-label="Supprimer"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "hsl(0 65% 52% / 0.12)";
            (e.currentTarget as HTMLElement).style.color = "hsl(0 65% 44%)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "hsl(42 25% 91% / 0.90)";
            (e.currentTarget as HTMLElement).style.color = "hsl(30 15% 55%)";
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Highlighted banner — Pépite de la semaine */}
      {activity.highlighted && (
        <div
          className="px-4 py-1.5 flex items-center gap-1.5"
          style={{ background: "linear-gradient(135deg, hsl(152 36% 46%), hsl(168 42% 32%))" }}
        >
          <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          <span
            className="text-xs font-semibold text-primary-foreground tracking-wide"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            Pépite de la semaine ✨
          </span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="text-3xl flex-shrink-0 mt-0.5">{activity.emoji}</div>
          <div className="flex-1 min-w-0 pr-7">
            <h3
              className="text-foreground leading-snug"
              style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "1.05rem" }}
            >
              {activity.title}
            </h3>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {/* category tag */}
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                style={{
                  background: "hsl(168 42% 38% / 0.08)",
                  color: "hsl(168 42% 30%)",
                  borderColor: "hsl(168 42% 38% / 0.22)",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {activity.category}
              </span>

              {variant === "prebooking" && activity.urgency && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                  style={{
                    background: URGENCY_CONFIG[activity.urgency].bg,
                    color: URGENCY_CONFIG[activity.urgency].color,
                    borderColor: URGENCY_CONFIG[activity.urgency].border,
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  ⏰ {URGENCY_CONFIG[activity.urgency].label}
                </span>
              )}

              {activity.indoor === false && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                  style={{
                    background: "hsl(128 35% 52% / 0.10)",
                    color: "hsl(128 35% 34%)",
                    borderColor: "hsl(128 35% 52% / 0.22)",
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  🌤️ Extérieur
                </span>
              )}
              {activity.indoor === true && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                  style={{
                    background: "hsl(35 80% 60% / 0.10)",
                    color: "hsl(35 65% 38%)",
                    borderColor: "hsl(35 80% 60% / 0.22)",
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  🏠 Intérieur
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p
          className="text-sm leading-relaxed"
          style={{ color: "hsl(30 25% 30%)", fontFamily: "'Nunito', sans-serif" }}
        >
          {activity.description}
        </p>

        {/* Meta info */}
        <div
          className="flex flex-wrap gap-3 text-xs"
          style={{ color: "hsl(30 15% 55%)", fontFamily: "'Nunito', sans-serif" }}
        >
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
          <div
            className="rounded-xl px-3 py-2 text-xs leading-relaxed"
            style={{
              background: "hsl(42 25% 91% / 0.70)",
              color: "hsl(30 15% 50%)",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {activity.practical_info}
          </div>
        )}

        {/* Booking deadline */}
        {activity.booking_deadline && (
          <div
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "hsl(35 65% 42%)", fontFamily: "'Nunito', sans-serif" }}
          >
            <Ticket className="h-3.5 w-3.5" />
            Réserver avant : {activity.booking_deadline}
          </div>
        )}

        {/* Tags */}
        {activity.tags && activity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activity.tags.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full text-xs"
                style={{
                  background: "hsl(42 25% 91%)",
                  color: "hsl(30 15% 55%)",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
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
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, hsl(152 36% 46%), hsl(168 42% 32%))",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            <Ticket className="h-4 w-4" />
            Réserver
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {variant === "prebooking" && !activity.booking_url && (
          <div
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border text-xs"
            style={{
              borderColor: "hsl(38 22% 84%)",
              color: "hsl(30 15% 55%)",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            🔍 Recherchez "{activity.title}" pour réserver
          </div>
        )}
      </div>
    </div>
  );
}
