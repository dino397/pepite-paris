import type { ParisEvent } from "@/types/event";
import EventCard from "./EventCard";

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

interface EventListProps {
  events: ParisEvent[];
  loading: boolean;
  error: Error | null;
}

export default function EventList({ events, loading, error }: EventListProps) {
  if (loading) {
    return (
      <div className="px-4 py-6 space-y-3 max-w-2xl mx-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <span className="text-5xl mb-4">😔</span>
        <p style={{ fontFamily: "'Lora', Georgia, serif", fontWeight: 500, fontSize: "1.1rem" }} className="text-foreground">
          Impossible de charger les événements
        </p>
        <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
          Vérifiez votre connexion internet et réessayez
        </p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <span className="text-5xl mb-4">🌿</span>
        <p style={{ fontFamily: "'Lora', Georgia, serif", fontWeight: 500, fontSize: "1.1rem" }} className="text-foreground">
          Aucun événement trouvé
        </p>
        <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
          Essayez un autre filtre
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-3 max-w-2xl mx-auto">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
