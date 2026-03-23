import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import WeatherWidget from "./WeatherWidget";
import AgendaSection from "./AgendaSection";
import ActivityCard, { Activity } from "./ActivityCard";
import { RefreshCw, LogOut, Sparkles, CalendarDays, Ticket, Sun } from "lucide-react";

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

const CATEGORY_LABELS: Record<string, string> = {
  cinema: "🎬 Cinéma",
  theatre: "🎭 Théâtre",
  expo: "🖼️ Expositions",
  activite: "🌿 Activités",
  sortie: "🌳 Sorties",
  maison: "🏠 À la maison",
  culture: "🏛️ Culture",
  sport: "⚽ Sport",
  créatif: "🎨 Créatif",
  spectacle: "🎪 Spectacles",
};

function groupByCategory(activities: Activity[]): { category: string; items: Activity[] }[] {
  const map = new Map<string, Activity[]>();
  for (const act of activities) {
    const cat = act.category || "activite";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(act);
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}

export default function AppPage({ userId, profile, children, agendaEvents, onAgendaChange }: AppPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("weekend");
  const [content, setContent] = useState<ActivitiesContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  // Extra activities preloaded per category (ready to reveal instantly)
  const [extraActivities, setExtraActivities] = useState<Record<string, Activity[]>>({});
  // Which categories have "Voir plus" expanded
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  // Which categories are currently preloading in background
  const [preloadingCategories, setPreloadingCategories] = useState<Set<string>>(new Set());
  // Dismissed activity IDs
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const weatherDataRef = useRef<WeatherData | null>(null);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  const saturday = new Date(startOfWeek);
  saturday.setDate(startOfWeek.getDate() + 5);
  const sunday = new Date(startOfWeek);
  sunday.setDate(startOfWeek.getDate() + 6);
  const weekendLabel = `${saturday.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} & ${sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;

  const handleWeatherLoaded = useCallback((data: WeatherData) => {
    setWeatherData(data);
    weatherDataRef.current = data;
  }, []);

  const callGenerateActivities = useCallback(async (opts: {
    forceRegenerate?: boolean;
    categoryToRefresh?: string;
    currentWeather?: WeatherData | null;
  } = {}): Promise<ActivitiesContent | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Non connecté");

    const weather = opts.currentWeather !== undefined ? opts.currentWeather : weatherDataRef.current;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-activities`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          weatherData: weather,
          forceRegenerate: opts.forceRegenerate ?? false,
          categoryToRefresh: opts.categoryToRefresh,
        }),
      }
    );

    if (res.status === 429) { toast.error("Trop de requêtes. Réessayez dans quelques instants."); return null; }
    if (res.status === 402) { toast.error("Crédits insuffisants."); return null; }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur de génération");
    return data.content;
  }, []);

  /** Preload extra activities for a category silently in background */
  const preloadCategoryExtras = useCallback(async (category: string, currentWeather?: WeatherData | null) => {
    setPreloadingCategories((prev) => new Set(prev).add(category));
    try {
      const result = await callGenerateActivities({
        forceRegenerate: true,
        categoryToRefresh: category,
        currentWeather,
      });
      if (result) {
        const newExtras = (result.weekend?.activities ?? []).filter(
          (a) => (a.category || "activite") === category
        );
        if (newExtras.length > 0) {
          setExtraActivities((prev) => ({ ...prev, [category]: newExtras }));
        }
      }
    } catch {
      // Silent fail — extras just won't be preloaded
    } finally {
      setPreloadingCategories((prev) => {
        const next = new Set(prev);
        next.delete(category);
        return next;
      });
    }
  }, [callGenerateActivities]);

  const generateActivities = useCallback(async (forceRegenerate = false) => {
    setLoading(true);
    try {
      const result = await callGenerateActivities({ forceRegenerate, currentWeather: weatherDataRef.current });
      if (result) {
        setContent(result);
        setExtraActivities({});
        setExpandedCategories(new Set());
        setDismissedIds(new Set());
        if (forceRegenerate) toast.success("Activités régénérées ! 🎉");
        else toast.success("Activités générées ! 🎉");

        // Preload extras for each category in background
        const categories = [...new Set((result.weekend?.activities ?? []).map((a) => a.category || "activite"))];
        for (const cat of categories) {
          setTimeout(() => preloadCategoryExtras(cat, weatherDataRef.current), 200);
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur de génération");
    } finally {
      setLoading(false);
    }
  }, [callGenerateActivities, preloadCategoryExtras]);

  /** Show preloaded extras; if not ready yet, fetch now */
  const handleShowMore = useCallback(async (category: string) => {
    setExpandedCategories((prev) => new Set(prev).add(category));

    if (!extraActivities[category] && !preloadingCategories.has(category)) {
      // Not preloaded yet → fetch now (visible loading)
      await preloadCategoryExtras(category);
    }
  }, [extraActivities, preloadingCategories, preloadCategoryExtras]);

  const handleDismiss = useCallback((activityId: string) => {
    setDismissedIds((prev) => new Set(prev).add(activityId));
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const childrenLabel = children.length > 0
    ? children.map((c) => `${c.name || "Enfant"} ${c.age_years ? `(${c.age_years}ans)` : ""}`).join(", ")
    : null;

  const prebookingCount = content?.prebooking?.activities?.length ?? 0;
  const categoryGroups = content?.weekend?.activities ? groupByCategory(content.weekend.activities) : [];

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
              onWeatherLoaded={handleWeatherLoaded}
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

            {/* Activity cards grouped by category */}
            {categoryGroups.length > 0 && (
              <div className="space-y-6">
                {categoryGroups.map(({ category, items }) => {
                  const visibleMain = items.filter((a) => !dismissedIds.has(a.id));
                  const extras = extraActivities[category] ?? [];
                  const visibleExtras = expandedCategories.has(category)
                    ? extras.filter((a) => !dismissedIds.has(a.id))
                    : [];
                  const isPreloading = preloadingCategories.has(category);
                  const isExpanded = expandedCategories.has(category);
                  const hasExtras = extras.length > 0;

                  return (
                    <div key={category} className="space-y-3">
                      {/* Category header */}
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                          {CATEGORY_LABELS[category] ?? category}
                        </h3>
                        <div className="flex-1 h-px bg-border/60" />
                      </div>

                      {/* Main cards */}
                      {visibleMain.map((act) => (
                        <ActivityCard
                          key={act.id}
                          activity={act}
                          variant="weekend"
                          onDismiss={() => handleDismiss(act.id)}
                        />
                      ))}

                      {/* Extra cards (revealed on "Voir plus") */}
                      {visibleExtras.map((act) => (
                        <ActivityCard
                          key={act.id}
                          activity={act}
                          variant="weekend"
                          onDismiss={() => handleDismiss(act.id)}
                          isExtra
                        />
                      ))}

                      {/* "Voir plus" CTA */}
                      {!isExpanded && (
                        <button
                          onClick={() => handleShowMore(category)}
                          disabled={isPreloading && !hasExtras}
                          className="flex items-center gap-2 text-xs text-primary font-medium hover:text-primary/80 transition-colors w-full py-1.5 disabled:opacity-50"
                        >
                          {isPreloading && !hasExtras ? (
                            <>
                              <span className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin flex-shrink-0" />
                              Chargement d'autres idées…
                            </>
                          ) : (
                            <>
                              <span className="flex items-center justify-center w-4 h-4 rounded-full border border-primary/40 text-primary text-[10px] font-bold flex-shrink-0">+</span>
                              Voir plus d'idées {CATEGORY_LABELS[category] ?? category}
                            </>
                          )}
                        </button>
                      )}

                      {/* Collapse back if expanded and extras shown */}
                      {isExpanded && visibleExtras.length > 0 && (
                        <button
                          onClick={() => setExpandedCategories((prev) => { const s = new Set(prev); s.delete(category); return s; })}
                          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1.5"
                        >
                          <span className="flex items-center justify-center w-4 h-4 rounded-full border border-border text-[10px] font-bold flex-shrink-0">−</span>
                          Réduire
                        </button>
                      )}

                      {/* Expanded but still loading */}
                      {isExpanded && isPreloading && !hasExtras && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-3 bg-muted/40 rounded-xl">
                          <span className="w-3 h-3 border border-muted-foreground/40 border-t-muted-foreground rounded-full animate-spin flex-shrink-0" />
                          Génération de nouvelles idées…
                        </div>
                      )}
                    </div>
                  );
                })}
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
                {content.prebooking.activities
                  .filter((act) => !dismissedIds.has(act.id))
                  .map((act) => (
                    <ActivityCard
                      key={act.id}
                      activity={act}
                      variant="prebooking"
                      onDismiss={() => handleDismiss(act.id)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
