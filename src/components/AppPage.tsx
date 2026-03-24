import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import WeatherWidget from "./WeatherWidget";
import AgendaSection from "./AgendaSection";
import ActivityCard, { Activity } from "./ActivityCard";
import MapPage from "./MapPage";
import { RefreshCw, LogOut, Sparkles, CalendarDays, Ticket, Sun, Map } from "lucide-react";
import parisParkBg from "@/assets/paris-park-bg.jpg";

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

type Tab = "weekend" | "agenda" | "prebooking" | "map";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "weekend", label: "Ce week-end", icon: <Sun className="h-4 w-4" /> },
  { id: "agenda", label: "Mon agenda", icon: <CalendarDays className="h-4 w-4" /> },
  { id: "prebooking", label: "À réserver", icon: <Ticket className="h-4 w-4" /> },
  { id: "map", label: "Carte", icon: <Map className="h-4 w-4" /> },
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
  const [extraActivities, setExtraActivities] = useState<Record<string, Activity[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set<string>());
  const [preloadingCategories, setPreloadingCategories] = useState<Set<string>>(() => new Set<string>());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set<string>());

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
      // Silent fail
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

  const handleShowMore = useCallback(async (category: string) => {
    setExpandedCategories((prev) => new Set(prev).add(category));
    if (!extraActivities[category] && !preloadingCategories.has(category)) {
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
    ? children.map((c) => `${c.name || "Enfant"}${c.age_years ? ` (${c.age_years}ans)` : ""}`).join(", ")
    : null;

  const prebookingCount = content?.prebooking?.activities?.length ?? 0;
  const categoryGroups = content?.weekend?.activities ? groupByCategory(content.weekend.activities) : [];
  const allActivities = [
    ...(content?.weekend?.activities ?? []),
    ...(content?.prebooking?.activities ?? []),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">

      {/* Ghibli park background — subtle, fixed */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img
          src={parisParkBg}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-bottom opacity-[0.07]"
          width={1920}
          height={640}
        />
        {/* Warm parchment overlay */}
        <div className="absolute inset-0 bg-background/80" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md border-b border-border/60"
        style={{ background: "hsl(42 38% 96% / 0.92)" }}>
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div
              className="text-xl leading-tight text-foreground"
              style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 300, letterSpacing: "0.04em" }}
            >
              Pépite
            </div>
            <div className="text-xs text-muted-foreground/70 flex items-center gap-1"
              style={{ fontFamily: "'Nunito', sans-serif" }}>
              <span>{profile.city}</span>
              {childrenLabel && <><span className="opacity-40">·</span><span>{childrenLabel}</span></>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="container max-w-2xl mx-auto px-4 pb-0">
          <div className="flex border-b border-border/40 -mb-px gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px relative ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground/70 hover:text-foreground"
                }`}
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.id === "prebooking" && prebookingCount > 0 && (
                  <span className="ml-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {prebookingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 container max-w-2xl mx-auto px-4 py-5 space-y-5 relative z-10">

        {/* ── Tab: Ce week-end ── */}
        {activeTab === "weekend" && (
          <div className="space-y-5 animate-fade-in">
            <WeatherWidget
              city={profile.city}
              latitude={profile.latitude}
              longitude={profile.longitude}
              onWeatherLoaded={handleWeatherLoaded}
            />

            {/* Weekend heading */}
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className="text-xl text-foreground"
                  style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
                >
                  Activités du week-end
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5"
                  style={{ fontFamily: "'Nunito', sans-serif" }}>{weekendLabel}</p>
              </div>
              {content && (
                <button
                  onClick={() => generateActivities(true)}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-xl border border-border/60 hover:border-primary/30 bg-card/70 disabled:opacity-50"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Actualiser
                </button>
              )}
            </div>

            {/* Generate CTA */}
            {!content && (
              <div className="flex flex-col items-center py-12 space-y-5">
                {/* Decorative illustration strip */}
                <div className="relative w-full max-w-xs h-28 rounded-2xl overflow-hidden shadow-card">
                  <img src={parisParkBg} alt="" aria-hidden className="w-full h-full object-cover object-[center_30%]" width={400} height={112} />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                    <span className="text-3xl">✨</span>
                  </div>
                </div>

                <div className="text-center space-y-1.5">
                  <p
                    className="text-lg text-foreground"
                    style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
                  >
                    Prêt pour ce week-end ?
                  </p>
                  <p className="text-sm text-muted-foreground/80"
                    style={{ fontFamily: "'Nunito', sans-serif" }}>
                    On vous prépare des idées adaptées à votre famille
                  </p>
                </div>

                <button
                  onClick={() => generateActivities(false)}
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 rounded-2xl text-primary-foreground font-semibold text-sm shadow-hover transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, hsl(152 36% 46%), hsl(168 42% 32%))",
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Génération…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Générer mes activités
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Weather summary */}
            {content?.weekend?.weather_summary && (
              <div
                className="flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm border"
                style={{
                  background: "hsl(168 42% 38% / 0.06)",
                  borderColor: "hsl(168 42% 38% / 0.18)",
                  color: "hsl(168 42% 28%)",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                <span>🌤️</span>
                <span>{content.weekend.weather_summary}</span>
              </div>
            )}

            {/* Activity cards grouped by category */}
            {categoryGroups.length > 0 && (
              <div className="space-y-7">
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
                      <div className="flex items-center gap-3">
                        <h3
                          className="text-xs uppercase tracking-[0.15em] text-muted-foreground/70 whitespace-nowrap"
                          style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}
                        >
                          {CATEGORY_LABELS[category] ?? category}
                        </h3>
                        <div className="flex-1 h-px" style={{ background: "hsl(38 22% 84% / 0.7)" }} />
                      </div>

                      {visibleMain.map((act) => (
                        <ActivityCard
                          key={act.id}
                          activity={act}
                          variant="weekend"
                          onDismiss={() => handleDismiss(act.id)}
                        />
                      ))}

                      {visibleExtras.map((act) => (
                        <ActivityCard
                          key={act.id}
                          activity={act}
                          variant="weekend"
                          onDismiss={() => handleDismiss(act.id)}
                          isExtra
                        />
                      ))}

                      {!isExpanded && (
                        <button
                          onClick={() => handleShowMore(category)}
                          disabled={isPreloading && !hasExtras}
                          className="flex items-center gap-2 text-xs font-medium transition-colors w-full py-1.5 disabled:opacity-50"
                          style={{ color: "hsl(168 42% 38%)", fontFamily: "'Nunito', sans-serif" }}
                        >
                          {isPreloading && !hasExtras ? (
                            <>
                              <span className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin flex-shrink-0" />
                              Chargement d'autres idées…
                            </>
                          ) : (
                            <>
                              <span
                                className="flex items-center justify-center w-4 h-4 rounded-full border text-[10px] font-bold flex-shrink-0"
                                style={{ borderColor: "hsl(168 42% 38% / 0.4)", color: "hsl(168 42% 38%)" }}
                              >+</span>
                              Voir plus d'idées
                            </>
                          )}
                        </button>
                      )}

                      {isExpanded && visibleExtras.length > 0 && (
                        <button
                          onClick={() => setExpandedCategories((prev) => { const s = new Set(prev); s.delete(category); return s; })}
                          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1.5"
                          style={{ fontFamily: "'Nunito', sans-serif" }}
                        >
                          <span className="flex items-center justify-center w-4 h-4 rounded-full border border-border text-[10px] font-bold flex-shrink-0">−</span>
                          Réduire
                        </button>
                      )}

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
                className="w-full flex items-center justify-between rounded-2xl px-5 py-4 transition-colors group border"
                style={{
                  background: "hsl(35 80% 60% / 0.08)",
                  borderColor: "hsl(35 80% 60% / 0.25)",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎟️</span>
                  <div className="text-left">
                    <div className="font-semibold text-foreground text-sm"
                      style={{ fontFamily: "'Nunito', sans-serif" }}>
                      À réserver dès maintenant
                    </div>
                    <div className="text-xs text-muted-foreground"
                      style={{ fontFamily: "'Nunito', sans-serif" }}>
                      {prebookingCount} activité{prebookingCount > 1 ? "s" : ""} à ne pas manquer
                    </div>
                  </div>
                </div>
                <span className="font-bold text-lg group-hover:translate-x-1 transition-transform"
                  style={{ color: "hsl(35 80% 50%)" }}>→</span>
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
              <h2
                className="text-xl text-foreground"
                style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
              >
                À pré-réserver
              </h2>
              <p className="text-xs text-muted-foreground/70 mt-0.5"
                style={{ fontFamily: "'Nunito', sans-serif" }}>
                Ces activités se remplissent vite — prenez les places !
              </p>
            </div>

            {!content && (
              <div className="flex flex-col items-center py-12 space-y-4 text-center">
                <div className="text-5xl">🎟️</div>
                <p
                  className="text-lg text-foreground"
                  style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
                >
                  Générez d'abord vos activités
                </p>
                <p className="text-sm text-muted-foreground"
                  style={{ fontFamily: "'Nunito', sans-serif" }}>
                  On détectera automatiquement ce qui nécessite une réservation
                </p>
                <Button
                  onClick={() => setActiveTab("weekend")}
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
                <p className="text-sm text-muted-foreground"
                  style={{ fontFamily: "'Nunito', sans-serif" }}>
                  Aucune activité urgente à réserver cette semaine
                </p>
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

        {/* ── Tab: Carte ── */}
        {activeTab === "map" && (
          <div className="animate-fade-in -mx-4 -my-5">
            <MapPage activities={allActivities} />
          </div>
        )}
      </div>
    </div>
  );
}
