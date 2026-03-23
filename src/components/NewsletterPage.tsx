import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import WeatherWidget from "./WeatherWidget";
import AgendaSection from "./AgendaSection";
import { RefreshCw, LogOut, Sparkles, Settings, ChevronDown, ChevronUp, Tag } from "lucide-react";

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

interface NewsletterContent {
  greeting: string;
  weather_comment: string;
  sections: NewsletterSection[];
  tip_of_week?: { emoji: string; title: string; content: string };
  agenda_preview?: { title: string; note: string };
}

interface NewsletterSection {
  id: string;
  title: string;
  emoji: string;
  color: string;
  items: NewsletterItem[];
}

interface NewsletterItem {
  title: string;
  subtitle: string;
  description: string;
  details: string;
  tags: string[];
  highlighted: boolean;
}

interface WeatherData {
  saturday: { description: string; tempMax: number } | null;
  sunday: { description: string; tempMax: number } | null;
  city: string;
}

interface NewsletterPageProps {
  userId: string;
  profile: FamilyProfile;
  children: Child[];
  agendaEvents: AgendaEvent[];
  onAgendaChange: () => void;
}

const COLOR_MAP: Record<string, { bg: string; badge: string; border: string }> = {
  blue: { bg: "from-sky-blue/5 to-transparent", badge: "bg-sky-blue/15 text-sky-blue", border: "border-sky-blue/20" },
  green: { bg: "from-soft-sage/10 to-transparent", badge: "bg-soft-sage/15 text-soft-sage", border: "border-soft-sage/20" },
  purple: { bg: "from-purple-400/5 to-transparent", badge: "bg-purple-100 text-purple-700", border: "border-purple-200" },
  orange: { bg: "from-warm-amber/10 to-transparent", badge: "bg-warm-amber/15 text-warm-amber", border: "border-warm-amber/20" },
  pink: { bg: "from-blush/10 to-transparent", badge: "bg-blush/15 text-blush", border: "border-blush/20" },
};

function SectionBlock({ section }: { section: NewsletterSection }) {
  const [expanded, setExpanded] = useState(true);
  const colors = COLOR_MAP[section.color] || COLOR_MAP.blue;

  return (
    <div className={`rounded-xl border ${colors.border} overflow-hidden`}>
      <button
        className={`w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r ${colors.bg} hover:opacity-80 transition-opacity`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{section.emoji}</span>
          <span className="font-display font-semibold text-foreground">{section.title.replace(/^[^\s]+\s/, "")}</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="divide-y divide-border/40">
          {section.items.map((item, i) => (
            <div
              key={i}
              className={`p-4 ${item.highlighted ? "bg-warm-gold/8" : "bg-card"}`}
            >
              {item.highlighted && (
                <div className="flex items-center gap-1 text-xs font-semibold text-warm-amber mb-1.5">
                  <Sparkles className="h-3 w-3" />
                  À ne pas manquer
                </div>
              )}
              <div className="font-semibold text-foreground">{item.title}</div>
              {item.subtitle && (
                <div className="text-xs text-muted-foreground mt-0.5 italic">{item.subtitle}</div>
              )}
              {item.description && (
                <div className="text-sm text-foreground/80 mt-1.5 leading-relaxed">{item.description}</div>
              )}
              {item.details && (
                <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.details}</div>
              )}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.tags.map((tag, ti) => (
                    <span
                      key={ti}
                      className={`section-badge ${colors.badge}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewsletterPage({ userId, profile, children, agendaEvents, onAgendaChange }: NewsletterPageProps) {
  const [newsletter, setNewsletter] = useState<NewsletterContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [showAgenda, setShowAgenda] = useState(false);

  // Get current weekend dates
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  const saturday = new Date(startOfWeek);
  saturday.setDate(startOfWeek.getDate() + 5);
  const sunday = new Date(startOfWeek);
  sunday.setDate(startOfWeek.getDate() + 6);
  const weekendLabel = `${saturday.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} & ${sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;

  const generateNewsletter = async (forceRegenerate = false) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-newsletter`,
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
        toast.error("Crédits insuffisants pour générer la newsletter.");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de génération");

      setNewsletter(data.content);
      if (data.fromCache) {
        toast.success("Newsletter chargée depuis le cache ✨");
      } else {
        toast.success("Newsletter générée avec succès ! 🎉");
      }
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
    ? children.map((c) => `${c.name || "Enfant"} (${c.age_years}ans)`).join(", ")
    : "";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-display font-bold text-foreground leading-tight">
              🗓️ Weekend Famille
            </div>
            <div className="text-xs text-muted-foreground">{profile.city}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAgenda(!showAgenda)}
              className="text-muted-foreground"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSignOut}
              className="text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Agenda panel */}
        {showAgenda && (
          <div className="bg-card rounded-2xl border border-border shadow-card p-5 animate-fade-in">
            <AgendaSection
              userId={userId}
              events={agendaEvents}
              onEventsChange={onAgendaChange}
            />
          </div>
        )}

        {/* Weather */}
        <WeatherWidget
          city={profile.city}
          latitude={profile.latitude}
          longitude={profile.longitude}
          onWeatherLoaded={setWeatherData}
        />

        {/* Newsletter header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="h-px w-8 bg-border" />
            Week-end du {weekendLabel}
            <span className="h-px w-8 bg-border" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Activités Famille 🎉
          </h1>
          {childrenLabel && (
            <p className="text-sm text-muted-foreground">Pour {childrenLabel}</p>
          )}
        </div>

        {/* Generate button */}
        {!newsletter && (
          <div className="text-center">
            <Button
              onClick={() => generateNewsletter(false)}
              disabled={loading}
              className="gradient-hero text-primary-foreground font-semibold px-8 py-3 rounded-2xl text-base shadow-hover"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Génération en cours…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Générer ma newsletter
                </span>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Personnalisée pour votre famille en quelques secondes</p>
          </div>
        )}

        {/* Newsletter content */}
        {newsletter && (
          <div className="space-y-5 animate-fade-in">
            {/* Greeting */}
            <div className="bg-gradient-to-r from-primary/10 to-warm-gold/10 rounded-xl border border-primary/20 p-5">
              <p className="font-display text-lg text-foreground leading-relaxed">
                Bonjour {profile.parent_name || ""} ! 👋
              </p>
              <p className="text-foreground/80 mt-1">{newsletter.greeting}</p>
              {newsletter.weather_comment && (
                <p className="text-sm text-muted-foreground mt-2 italic">✨ {newsletter.weather_comment}</p>
              )}
            </div>

            {/* Sections */}
            {newsletter.sections?.map((section) => (
              <SectionBlock key={section.id} section={section} />
            ))}

            {/* Tip of week */}
            {newsletter.tip_of_week && (
              <div className="bg-warm-gold/10 rounded-xl border border-warm-gold/30 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{newsletter.tip_of_week.emoji}</span>
                  <div>
                    <div className="font-semibold text-foreground">{newsletter.tip_of_week.title}</div>
                    <div className="text-sm text-foreground/80 mt-1">{newsletter.tip_of_week.content}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Agenda preview */}
            {newsletter.agenda_preview && agendaEvents.length > 0 && (
              <div className="bg-secondary rounded-xl border border-border p-4">
                <div className="font-semibold text-foreground mb-2">📅 Dans votre agenda</div>
                <div className="space-y-1">
                  {agendaEvents.slice(0, 3).map((ev) => (
                    <div key={ev.id} className="text-sm text-foreground/80 flex items-center gap-2">
                      <span>{ev.emoji}</span>
                      <span className="font-medium">{ev.title}</span>
                      <span className="text-muted-foreground">
                        — {new Date(ev.event_date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
                {newsletter.agenda_preview.note && (
                  <p className="text-xs text-muted-foreground italic mt-2">{newsletter.agenda_preview.note}</p>
                )}
              </div>
            )}

            {/* Regenerate */}
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateNewsletter(true)}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Regénérer
              </Button>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 pb-8 newsletter-divider">
              <p className="text-xs text-muted-foreground">
                Généré avec ✨ pour votre famille • Week-end du {weekendLabel}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
