import { useState } from "react";
import { MapPin, Clock, ExternalLink, ChevronDown, Ticket } from "lucide-react";
import type { ParisEvent } from "@/types/event";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

export default function EventCard({ event }: { event: ParisEvent }) {
  const [expanded, setExpanded] = useState(false);
  const isFree = event.priceType?.toLowerCase().includes("gratuit");

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: "hsl(40 35% 99%)",
        border: "1px solid hsl(38 22% 88%)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4">
        <div className="flex gap-3">
          {event.coverUrl ? (
            <img
              src={event.coverUrl}
              alt=""
              className="w-16 h-20 rounded-xl object-cover flex-shrink-0"
              style={{ border: "1px solid hsl(38 22% 88%)" }}
              loading="lazy"
            />
          ) : (
            <div
              className="w-16 h-20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: "hsl(42 30% 93%)" }}
            >
              🎉
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className="text-foreground leading-snug line-clamp-2"
                style={{ fontFamily: "'Lora', Georgia, serif", fontWeight: 500, fontSize: "0.95rem" }}
              >
                {event.title}
              </h3>
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 text-muted-foreground/40 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {event.dateDescription && (
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: "hsl(42 30% 93%)", color: "hsl(30 25% 45%)", fontFamily: "'Nunito', sans-serif" }}
                >
                  {event.dateDescription.length > 40 ? formatDate(event.dateStart) : event.dateDescription}
                </span>
              )}
              {isFree && (
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: "hsl(152 30% 92%)", color: "hsl(152 36% 36%)", fontFamily: "'Nunito', sans-serif" }}
                >
                  Gratuit
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: "hsl(30 15% 55%)", fontFamily: "'Nunito', sans-serif" }}>
              {event.placeName && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {event.placeName}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
          {event.description && (
            <p className="text-sm leading-relaxed" style={{ color: "hsl(30 25% 30%)" }}>
              {event.description.replace(/<[^>]*>/g, "").slice(0, 300)}
              {event.description.length > 300 ? "…" : ""}
            </p>
          )}

          {event.address && (
            <p className="text-xs flex items-center gap-1" style={{ color: "hsl(30 15% 55%)" }}>
              <MapPin className="h-3 w-3" />
              {event.address}
            </p>
          )}

          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {event.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-[10px]"
                  style={{ background: "hsl(42 30% 93%)", color: "hsl(30 25% 50%)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {event.contactUrl && (
            <a
              href={event.contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(152 36% 46%), hsl(168 42% 32%))" }}
            >
              <Ticket className="h-4 w-4" />
              Voir l'événement
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
