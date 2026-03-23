import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, ChevronRight, MapPin, User, Baby, Heart, Car } from "lucide-react";

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
  { label: "🚌 Transports en commun", value: "transports" },
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
const GENDER_OPTIONS = [
  { label: "👦 Garçon", value: "garçon" },
  { label: "👧 Fille", value: "fille" },
  { label: "🧒 Autre", value: "autre" },
];

export default function OnboardingForm({ userId, onComplete }: OnboardingFormProps) {
  const [step, setStep] = useState(0);
  const [parentName, setParentName] = useState("");
  const [city, setCity] = useState("");
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

  const togglePref = (val: string) => {
    setPreferences((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]
    );
  };

  const toggleTransport = (val: string) => {
    setTransportModes((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]
    );
  };

  const toggleWeekendPick = (val: string) => {
    setWeekendPicks((prev) => {
      if (prev.includes(val)) return prev.filter((p) => p !== val);
      if (prev.length >= 4) {
        toast.info("Sélectionnez au maximum 4 activités 🎯");
        return prev;
      }
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

  const stepEmojis = ["👋", "👶", "🚀", "🗓️", "❤️"];

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">

      {/* Top strip — brand + step indicator */}
      <div className="pt-10 pb-6 px-6 flex flex-col items-center gap-5">
        {/* Brand */}
        <div className="text-center">
          <h1
            className="text-4xl font-bold tracking-tight text-foreground leading-none mb-1"
            style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: "italic" }}
          >
            Pépite
          </h1>
          <p
            className="text-xs text-muted-foreground/70 tracking-wide"
            style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: "italic" }}
          >
            les meilleures activités du week-end pour toute la famille
          </p>
        </div>

        {/* Step pills */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
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
                <div className={`h-0.5 w-6 rounded-full transition-all ${i < step ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card content */}
      <div className="flex-1 flex flex-col px-5 pb-8">
        <div className="w-full max-w-lg mx-auto bg-card/90 rounded-3xl border border-border/60 shadow-card p-7 animate-fade-in">
          {/* Step 0: Profil parent */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <div className="text-4xl mb-3">👋</div>
                <h2 className="font-display text-2xl font-bold text-foreground">Bienvenue !</h2>
                <p className="text-muted-foreground mt-1">Quelques infos pour personnaliser votre newsletter</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    Votre prénom
                  </Label>
                  <Input
                    id="name"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="Ex : Lucie"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city" className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    Votre ville
                  </Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex : Paris, Lyon, Bordeaux…"
                    required
                  />
                </div>
              </div>

              <Button
                onClick={() => setStep(1)}
                disabled={!city}
                className="w-full gradient-hero text-primary-foreground font-semibold rounded-xl"
              >
                Continuer <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 1: Enfants */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="text-4xl mb-3">👶</div>
                <h2 className="font-display text-2xl font-bold text-foreground">Vos enfants</h2>
                <p className="text-muted-foreground mt-1">Pour adapter les activités à leur âge et à leurs envies</p>
              </div>

              <div className="space-y-4">
                {children.map((child, i) => (
                  <div key={i} className="bg-muted/50 rounded-xl p-4 space-y-3">
                    <div className="flex gap-2 items-center">
                      <Baby className="h-4 w-4 text-primary flex-shrink-0" />
                      <Input
                        value={child.name}
                        onChange={(e) => updateChild(i, "name", e.target.value)}
                        placeholder="Prénom"
                        className="flex-1 bg-transparent border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
                      />
                      <Input
                        value={String(child.age_years)}
                        onChange={(e) => updateChild(i, "age_years", e.target.value)}
                        placeholder="Âge"
                        type="number"
                        min={0}
                        max={18}
                        className="w-20 bg-transparent border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-center"
                      />
                      <span className="text-muted-foreground text-sm shrink-0">ans</span>
                      {children.length > 1 && (
                        <button onClick={() => removeChild(i)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {/* Genre */}
                    <div className="flex gap-2 flex-wrap">
                      {GENDER_OPTIONS.map((g) => (
                        <button
                          key={g.value}
                          onClick={() => updateChild(i, "gender", child.gender === g.value ? "" : g.value)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                            child.gender === g.value
                              ? "gradient-hero text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:border-primary"
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
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un enfant
                </button>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                  Retour
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  className="flex-1 gradient-hero text-primary-foreground font-semibold rounded-xl"
                >
                  Continuer <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Mobilité */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="text-4xl mb-3">🚀</div>
                <h2 className="font-display text-2xl font-bold text-foreground">Votre mobilité</h2>
                <p className="text-muted-foreground mt-1">Pour vous proposer des activités accessibles</p>
              </div>

              {/* Moyens de transport */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5 text-primary" />
                  Moyens de transport disponibles
                </Label>
                <div className="flex flex-wrap gap-2">
                  {TRANSPORT_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => toggleTransport(t.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        transportModes.includes(t.value)
                          ? "gradient-hero text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temps de trajet max */}
              <div className="space-y-3">
                <Label>⏱️ Temps de trajet maximum accepté</Label>
                <div className="flex gap-2 flex-wrap">
                  {TRAVEL_TIME_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setMaxTravelMinutes(t.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                        maxTravelMinutes === t.value
                          ? "gradient-hero text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Retour
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={transportModes.length === 0}
                  className="flex-1 gradient-hero text-primary-foreground font-semibold rounded-xl"
                >
                  Continuer <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Activités du week-end */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <div className="text-4xl mb-3">🗓️</div>
                <h2 className="font-display text-2xl font-bold text-foreground">Ce week-end…</h2>
                <p className="text-muted-foreground mt-1">
                  Choisissez <span className="font-semibold text-primary">4 activités</span> que vous adoreriez faire
                </p>
                <div className="mt-2 flex gap-1">
                  {[0,1,2,3].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        i < weekendPicks.length ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {WEEKEND_ACTIVITIES.map((act) => (
                  <button
                    key={act.value}
                    onClick={() => toggleWeekendPick(act.value)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                      weekendPicks.includes(act.value)
                        ? "gradient-hero text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-foreground border-border hover:border-primary hover:bg-muted/30"
                    }`}
                  >
                    {act.label}
                    {weekendPicks.includes(act.value) && (
                      <span className="float-right">✓</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Retour
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={weekendPicks.length < 4}
                  className="flex-1 gradient-hero text-primary-foreground font-semibold rounded-xl"
                >
                  Continuer <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Préférences générales */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <div className="text-4xl mb-3">❤️</div>
                <h2 className="font-display text-2xl font-bold text-foreground">Vos envies</h2>
                <p className="text-muted-foreground mt-1">Quelles activités vous plaisent le plus en général ?</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {PREFERENCES.map((pref) => (
                  <button
                    key={pref.value}
                    onClick={() => togglePref(pref.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      preferences.includes(pref.value)
                        ? "gradient-hero text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:border-primary"
                    }`}
                  >
                    {pref.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                  Retour
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 gradient-hero text-primary-foreground font-semibold rounded-xl"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Création…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Créer ma newsletter
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
