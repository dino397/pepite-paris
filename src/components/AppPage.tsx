import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import WeatherWidget from "./WeatherWidget";
import AgendaSection from "./AgendaSection";
import ActivityCard, { Activity } from "./ActivityCard";
import { RefreshCw, LogOut, Sparkles, CalendarDays, Ticket, Sun, User } from "lucide-react";

interface FamilyProfile {
  id: string;
  parent_name: string;
  city: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  preferences: string[];
}

interface Child {
  id: string;
  name: string;
  age_years: number | null;
}

interface AgendaEvent {
  id: string;
  title: string;
  event_date: string;
  emoji: string | null;
  event_type: string | null;
  notes: string | null;
}

interface ActivitiesContent {
  weekend: {
    label: string;
    weather_summary: string;
    activities: Activity[];
  };
  prebooking: {
    title: string;
    activities: Activity[];
  };
}

interface WeatherData {
  saturday: { description: string; tempMax: number } | null;
  sunday: { description: string; tempMax: number } | null;
  city: string;
}

interface AppPageProps {
  userId: string;
  profile: FamilyProfile;
  children: Child[];
  agendaEvents: AgendaEvent[];
  onAgendaChange: () => void;
}

type Tab = "weekend" | "agenda" | "prebooking";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "weekend", label: "Ce week-end", icon: <Sun className="h-4 w-4" /> },
  { id: "agenda", label: "Mon agenda", icon: <CalendarDays className="h-4 w-4" /> },
  { id: "prebooking", label: "À réserver", icon: <Ticket className="h-4 w-4" /> },
];

export default function AppPage({ userId, profile, children, agendaEvents, onAgendaChange }: AppPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("weekend");
  const [content, setContent] = useState<ActivitiesContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  const saturday = new Date(startOfWeek);
  saturday.setDate(startOfWeek.getDate() + 5);
  const sunday = new Date(startOfWeek);
  sunday.setDate(startOfWeek.getDate() + 6);
  const weekendLabel = `${saturday.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} & ${sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;

  const generateActivities = async (forceRegenerate = false) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-activities`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ weatherData, forceRegenerate }),
        }
      );

      if (res.status === 429) {
        toast.error("Trop de requêtes. Réessayez dans quelques instants.");
        return;
      }
      if (res.status === 402) {
        toast.error("Crédits insuffisants.");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de génération");

      setContent(data.content);
      if (!data.fromCache) toast.success("Activités générées ! 🎉");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur de génération");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const childrenLabel = children.length > 0
    ? children.map((c) => `${c.name || "Enfant"} ${c.age_years ? `(${c.age_years}ans)` : ""}`).join(", ")
    : null;

  const prebookingCount = content?.prebooking?.activities?.length ?? 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-display font-bold text-foreground leading-tight flex items-center gap-1.5">
              🗓️ Weekend Famille
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span>{profile.city}</span>
              {childrenLabel && <span>· {childrenLabel}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={handleSignOut} className="text-muted-foreground rounded-xl">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="container max-w-2xl mx-auto px-4 pb-0">
          <div className="flex border-b border-border -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px relative ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === "prebooking" && prebookingCount > 0 && (
                  <span className="ml-1 flex items-center justify-center w-4 h-4 rounded-full gradient-hero text-primary-foreground text-[10px] font-bold">
                    {prebookingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 container max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* ── Tab: Ce week-end ── */}
        {activeTab === "weekend" && (
          <div className="space-y-5 animate-fade-in">
            {/* Weather */}
            <WeatherWidget
              city={profile.city}
              latitude={profile.latitude}
              longitude={profile.longitude}
              onWeatherLoaded={setWeatherData}
            />

            {/* Weekend heading */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">Activités du week-end</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{weekendLabel}</p>
              </div>
              {content && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateActivities(true)}
                  disabled={loading}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Actualiser
                </Button>
              )}
            </div>

            {/* Generate CTA */}
            {!content && (
              <div className="flex flex-col items-center py-10 space-y-4">
                <div className="text-5xl">✨</div>
                <div className="text-center space-y-1">
                  <p className="font-display text-lg font-semibold text-foreground">Prêt pour ce week-end ?</p>
                  <p className="text-sm text-muted-foreground">On vous prépare des idées adaptées à votre famille</p>
                </div>
                <Button
                  onClick={() => generateActivities(false)}
                  disabled={loading}
                  className="gradient-hero text-primary-foreground font-semibold px-8 py-3 rounded-2xl text-base shadow-hover"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Génération…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Générer mes activités
                    </span>
                  )}
                </Button>
              </div>
            )}

            {/* Weather summary */}
            {content?.weekend?.weather_summary && (
              <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 text-sm text-foreground/80">
                <span>🌤️</span>
                <span>{content.weekend.weather_summary}</span>
              </div>
            )}

            {/* Activity cards */}
            {content?.weekend?.activities && content.weekend.activities.length > 0 && (
              <div className="space-y-4">
                {content.weekend.activities.map((act) => (
                  <ActivityCard key={act.id} activity={act} variant="weekend" />
                ))}
              </div>
            )}

            {/* Prebook teaser */}
            {content && prebookingCount > 0 && (
              <button
                onClick={() => setActiveTab("prebooking")}
                className="w-full flex items-center justify-between bg-warm-gold/10 border border-warm-gold/30 rounded-2xl px-5 py-4 hover:bg-warm-gold/15 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎟️</span>
                  <div className="text-left">
                    <div className="font-semibold text-foreground text-sm">À réserver dès maintenant</div>
                    <div className="text-xs text-muted-foreground">{prebookingCount} activité{prebookingCount > 1 ? "s" : ""} à ne pas manquer</div>
                  </div>
                </div>
                <span className="text-warm-amber font-bold text-lg group-hover:translate-x-1 transition-transform">→</span>
              </button>
            )}
          </div>
        )}

        {/* ── Tab: Mon agenda ── */}
        {activeTab === "agenda" && (
          <div className="animate-fade-in">
            <AgendaSection
              userId={userId}
              events={agendaEvents}
              onEventsChange={onAgendaChange}
            />
          </div>
        )}

        {/* ── Tab: À réserver ── */}
        {activeTab === "prebooking" && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">À pré-réserver</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Ces activités se remplissent vite — prenez les places !</p>
            </div>

            {!content && (
              <div className="flex flex-col items-center py-12 space-y-4 text-center">
                <div className="text-5xl">🎟️</div>
                <p className="font-display text-lg font-semibold text-foreground">Générez d'abord vos activités</p>
                <p className="text-sm text-muted-foreground">On détectera automatiquement ce qui nécessite une réservation</p>
                <Button
                  onClick={() => { setActiveTab("weekend"); }}
                  variant="outline"
                  className="rounded-xl"
                >
                  Voir les activités du week-end
                </Button>
              </div>
            )}

            {content && content.prebooking?.activities?.length === 0 && (
              <div className="flex flex-col items-center py-12 space-y-3 text-center">
                <div className="text-4xl">✅</div>
                <p className="text-sm text-muted-foreground">Aucune activité urgente à réserver cette semaine</p>
              </div>
            )}

            {content?.prebooking?.activities && content.prebooking.activities.length > 0 && (
              <div className="space-y-4">
                {content.prebooking.activities.map((act) => (
                  <ActivityCard key={act.id} activity={act} variant="prebooking" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
