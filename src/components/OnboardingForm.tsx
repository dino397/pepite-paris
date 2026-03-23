import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, ChevronRight, Heart } from "lucide-react";
import onboardingExpo from "@/assets/onboarding-expo.png";
import onboardingTheatre from "@/assets/onboarding-theatre.png";
import onboardingCinema from "@/assets/onboarding-cinema.png";
import onboardingAquarium from "@/assets/onboarding-aquarium.png";
import onboardingParis from "@/assets/onboarding-paris.png";

interface Child {
  name: string;
  age_years: number | string;
  gender: "garçon" | "fille" | "autre" | "";
}

interface OnboardingFormProps {
  userId: string;
  onComplete: () => void;
}

const PREFERENCES = [
  { label: "🎬 Cinéma", value: "cinéma" },
  { label: "🏛️ Musées", value: "musées" },
  { label: "🌳 Nature", value: "nature" },
  { label: "🎭 Spectacles", value: "spectacles" },
  { label: "🎨 Arts créatifs", value: "arts créatifs" },
  { label: "⚽ Sport", value: "sport" },
  { label: "📚 Livres & Bibliothèques", value: "bibliothèques" },
  { label: "🍳 Cuisine", value: "cuisine" },
  { label: "🎮 Jeux", value: "jeux" },
  { label: "🏖️ Plein air", value: "plein air" },
];

const TRANSPORT_OPTIONS = [
  { label: "🚶 À pied", value: "pied" },
  { label: "🚲 Vélo", value: "vélo" },
  { label: "🚗 Voiture", value: "voiture" },
  { label: "🚌 Transports", value: "transports" },
  { label: "🚆 Train", value: "train" },
];

const TRAVEL_TIME_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1h+", value: 60 },
];

const WEEKEND_ACTIVITIES = [
  { label: "🏞️ Sortie au parc ou dans la nature", value: "parc" },
  { label: "🎨 Atelier créatif (dessin, poterie…)", value: "atelier_créatif" },
  { label: "🎬 Cinéma en famille", value: "cinéma" },
  { label: "🏊 Piscine ou baignade", value: "piscine" },
  { label: "🦁 Zoo ou ferme pédagogique", value: "zoo" },
  { label: "🏛️ Visite de musée", value: "musée" },
  { label: "🥾 Randonnée ou balade", value: "randonnée" },
  { label: "🎲 Jeux de société à la maison", value: "jeux_société" },
  { label: "🍕 Cuisiner ensemble", value: "cuisine" },
  { label: "🎭 Spectacle ou théâtre", value: "spectacle" },
];

const STEPS = ["Bienvenue", "Vos enfants", "Mobilité", "Ce week-end", "Vos envies"];
const STEP_EMOJIS = ["👋", "👶", "🚀", "🗓️", "❤️"];
const STEP_SUBTITLES = [
  "Quelques infos pour personnaliser votre newsletter",
  "Pour adapter les activités à leur âge",
  "Pour vous proposer des activités accessibles",
  "Choisissez 4 activités que vous adoreriez faire",
  "Quelles activités vous plaisent le plus ?",
];
const STEP_TITLES = ["Bienvenue !", "Vos enfants", "Votre mobilité", "Ce week-end…", "Vos envies"];

const GENDER_OPTIONS = [
  { label: "👦 Garçon", value: "garçon" },
  { label: "👧 Fille", value: "fille" },
  { label: "🧒 Autre", value: "autre" },
];

export default function OnboardingForm({ userId, onComplete }: OnboardingFormProps) {
  const [step, setStep] = useState(0);
  const [parentName, setParentName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [children, setChildren] = useState<Child[]>([{ name: "", age_years: "", gender: "" }]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [transportModes, setTransportModes] = useState<string[]>([]);
  const [maxTravelMinutes, setMaxTravelMinutes] = useState<number>(30);
  const [weekendPicks, setWeekendPicks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addChild = () => setChildren([...children, { name: "", age_years: "", gender: "" }]);
  const removeChild = (i: number) => setChildren(children.filter((_, idx) => idx !== i));
  const updateChild = (i: number, field: keyof Child, value: string) => {
    const updated = [...children];
    updated[i] = { ...updated[i], [field]: value };
    setChildren(updated);
  };

  const togglePref = (val: string) =>
    setPreferences((prev) => prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]);

  const toggleTransport = (val: string) =>
    setTransportModes((prev) => prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]);

  const toggleWeekendPick = (val: string) => {
    setWeekendPicks((prev) => {
      if (prev.includes(val)) return prev.filter((p) => p !== val);
      if (prev.length >= 4) { toast.info("Sélectionnez au maximum 4 activités 🎯"); return prev; }
      return [...prev, val];
    });
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from("family_profiles")
        .insert({
          user_id: userId,
          parent_name: parentName,
          city,
          preferences,
          transport_modes: transportModes,
          max_travel_minutes: maxTravelMinutes,
          weekend_picks: weekendPicks,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      const validChildren = children.filter((c) => c.name || c.age_years);
      if (validChildren.length > 0) {
        const { error: childrenError } = await supabase.from("children").insert(
          validChildren.map((c) => ({
            family_id: profile.id,
            name: c.name,
            age_years: c.age_years ? Number(c.age_years) : null,
            gender: c.gender || null,
          }))
        );
        if (childrenError) throw childrenError;
      }

      toast.success("Profil créé ! Votre newsletter est prête 🎉");
      onComplete();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la sauvegarde";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">

      {/* Top illustration — changes per step */}
      <div className="relative flex-shrink-0 overflow-hidden" style={{ height: "32vh", minHeight: "180px" }}>
        {[onboardingExpo, onboardingTheatre, onboardingCinema, onboardingAquarium, onboardingParis].map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            aria-hidden="true"
            loading={i === 0 ? undefined : "lazy"}
            className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-700 ${step === i ? "opacity-100" : "opacity-0"}`}
            width={1024}
            height={1280}
          />
        ))}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      {/* Brand */}
      <div className="text-center pt-2 pb-4 px-6">
        <h1
          className="text-3xl font-bold tracking-tight text-foreground leading-none mb-1"
          style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: "italic" }}
        >
          Pépite
        </h1>
        <p
          className="text-xs text-muted-foreground/60 tracking-wide"
          style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: "italic" }}
        >
          les meilleures activités du week-end pour toute la famille
        </p>
      </div>

      {/* Step pills */}
      <div className="flex items-center gap-1.5 justify-center mb-4">
        {STEPS.map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold transition-all ${
                i < step
                  ? "gradient-meadow text-primary-foreground"
                  : i === step
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-5 rounded-full transition-all ${i < step ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col px-5 pb-8">
        <div className="w-full max-w-lg mx-auto bg-card/90 rounded-3xl border border-border/60 shadow-card p-6 animate-fade-in">

          {/* Step header */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl">{STEP_EMOJIS[step]}</span>
            <div>
              <h2
                className="text-lg font-bold text-foreground leading-tight"
                style={{ fontFamily: "'Lora', Georgia, serif" }}
              >
                {STEP_TITLES[step]}
              </h2>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{STEP_SUBTITLES[step]}</p>
            </div>
          </div>

          {/* Step 0 */}
          {step === 0 && (
            <div className="space-y-3">
              <Input
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Votre prénom (ex : Lucie)"
                className="h-11 bg-background/70 border-border/50 rounded-2xl px-4 text-sm placeholder:text-muted-foreground/50"
              />
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Votre ville (ex : Paris, Lyon…)"
                required
                className="h-11 bg-background/70 border-border/50 rounded-2xl px-4 text-sm placeholder:text-muted-foreground/50"
              />
              <button
                onClick={() => setStep(1)}
                disabled={!city}
                className="w-full h-11 rounded-2xl gradient-meadow text-primary-foreground font-semibold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 mt-1"
              >
                Continuer <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-3">
              {children.map((child, i) => (
                <div key={i} className="bg-muted/40 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex gap-2 items-center">
                    <Input
                      value={child.name}
                      onChange={(e) => updateChild(i, "name", e.target.value)}
                      placeholder="Prénom"
                      className="flex-1 h-9 bg-background/70 border-border/50 rounded-xl px-3 text-sm"
                    />
                    <Input
                      value={String(child.age_years)}
                      onChange={(e) => updateChild(i, "age_years", e.target.value)}
                      placeholder="Âge"
                      type="number"
                      min={0}
                      max={18}
                      className="w-16 h-9 bg-background/70 border-border/50 rounded-xl px-2 text-sm text-center"
                    />
                    <span className="text-muted-foreground text-xs shrink-0">ans</span>
                    {children.length > 1 && (
                      <button onClick={() => removeChild(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {GENDER_OPTIONS.map((g) => (
                      <button
                        key={g.value}
                        onClick={() => updateChild(i, "gender", child.gender === g.value ? "" : g.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          child.gender === g.value
                            ? "gradient-meadow text-primary-foreground border-primary"
                            : "bg-background/70 text-foreground border-border/50 hover:border-primary"
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={addChild}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium pl-1"
              >
                <Plus className="h-4 w-4" /> Ajouter un enfant
              </button>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(0)} className="flex-1 h-11 rounded-2xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
                  Retour
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-[2] h-11 rounded-2xl gradient-meadow text-primary-foreground font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Continuer <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transports disponibles</p>
                <div className="flex flex-wrap gap-2">
                  {TRANSPORT_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => toggleTransport(t.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        transportModes.includes(t.value)
                          ? "gradient-meadow text-primary-foreground border-primary"
                          : "bg-background/70 text-foreground border-border/50 hover:border-primary"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">⏱ Trajet maximum</p>
                <div className="flex gap-2 flex-wrap">
                  {TRAVEL_TIME_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setMaxTravelMinutes(t.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                        maxTravelMinutes === t.value
                          ? "gradient-meadow text-primary-foreground border-primary"
                          : "bg-background/70 text-foreground border-border/50 hover:border-primary"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(1)} className="flex-1 h-11 rounded-2xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
                  Retour
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={transportModes.length === 0}
                  className="flex-[2] h-11 rounded-2xl gradient-meadow text-primary-foreground font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  Continuer <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="flex gap-1">
                {[0,1,2,3].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < weekendPicks.length ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>
              <div className="space-y-1.5">
                {WEEKEND_ACTIVITIES.map((act) => (
                  <button
                    key={act.value}
                    onClick={() => toggleWeekendPick(act.value)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium border transition-all flex justify-between items-center ${
                      weekendPicks.includes(act.value)
                        ? "gradient-meadow text-primary-foreground border-primary shadow-sm"
                        : "bg-background/70 text-foreground border-border/50 hover:border-primary"
                    }`}
                  >
                    {act.label}
                    {weekendPicks.includes(act.value) && <span className="text-xs ml-2">✓</span>}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(2)} className="flex-1 h-11 rounded-2xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
                  Retour
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={weekendPicks.length < 4}
                  className="flex-[2] h-11 rounded-2xl gradient-meadow text-primary-foreground font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  Continuer <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {PREFERENCES.map((pref) => (
                  <button
                    key={pref.value}
                    onClick={() => togglePref(pref.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      preferences.includes(pref.value)
                        ? "gradient-meadow text-primary-foreground border-primary"
                        : "bg-background/70 text-foreground border-border/50 hover:border-primary"
                    }`}
                  >
                    {pref.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(3)} className="flex-1 h-11 rounded-2xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
                  Retour
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-[2] h-11 rounded-2xl gradient-meadow text-primary-foreground font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <><Heart className="h-4 w-4" /> Créer ma newsletter</>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
