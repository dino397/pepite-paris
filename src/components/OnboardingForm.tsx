import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, ChevronRight, Sparkles, MapPin, Mail } from "lucide-react";
import onboardingExpo from "@/assets/onboarding-expo.png";
import onboardingTheatre from "@/assets/onboarding-theatre.png";
import onboardingCinema from "@/assets/onboarding-cinema.png";
import onboardingAquarium from "@/assets/onboarding-aquarium.png";
import onboardingParis from "@/assets/onboarding-paris.png";

interface NominatimResult {
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
  };
}

interface Child {
  name: string;
  age_years: number | string;
  gender: "garçon" | "fille" | "autre" | "";
}

interface OnboardingFormProps {
  userId: string;
  onComplete: () => void;
}

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

const STEPS = ["Bienvenue", "Vos enfants", "Mobilité", "Ce week-end", "C'est parti !"];
const STEP_EMOJIS = ["🗼", "👶", "🚀", "🗓️", "✨"];
const STEP_SUBTITLES = [
  "Pour personnaliser Pépite à votre famille",
  "Pour adapter les activités à leur âge",
  "Pour vous proposer des activités accessibles",
  "Choisissez 4 activités que vous adoreriez faire",
  "Vous êtes presque là !",
];
const STEP_TITLES = ["Bienvenue !", "Vos enfants", "Votre mobilité", "Ce week-end…", "C'est parti !"];

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
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [children, setChildren] = useState<Child[]>([{ name: "", age_years: "", gender: "" }]);
  const [transportModes, setTransportModes] = useState<string[]>([]);
  const [maxTravelMinutes, setMaxTravelMinutes] = useState<number>(30);
  const [weekendPicks, setWeekendPicks] = useState<string[]>([]);
  const [weekendDislikes, setWeekendDislikes] = useState<string[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [familyMembers, setFamilyMembers] = useState<{ name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const addFamilyMember = () => setFamilyMembers((prev) => [...prev, { name: "", email: "" }]);
  const removeFamilyMember = (i: number) => setFamilyMembers((prev) => prev.filter((_, idx) => idx !== i));
  const updateFamilyMember = (i: number, field: "name" | "email", value: string) => {
    setFamilyMembers((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  useEffect(() => {
    if (addressQuery.length < 3) { setAddressSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setAddressLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressQuery)}&format=json&limit=5&countrycodes=fr&addressdetails=1`,
          { headers: { "Accept-Language": "fr" } }
        );
        const data: NominatimResult[] = await res.json();
        setAddressSuggestions(data);
        setShowSuggestions(true);
      } catch { /* silent */ } finally {
        setAddressLoading(false);
      }
    }, 350);
  }, [addressQuery]);

  const selectAddress = (result: NominatimResult) => {
    const { road, house_number, city: c, town, village } = result.address;
    const street = [house_number, road].filter(Boolean).join(" ");
    const detectedCity = c || town || village || "";
    setAddress(street || result.display_name.split(",")[0]);
    setCity(detectedCity);
    setAddressQuery(street || result.display_name.split(",")[0]);
    setShowSuggestions(false);
  };

  const addChild = () => setChildren([...children, { name: "", age_years: "", gender: "" }]);
  const removeChild = (i: number) => setChildren(children.filter((_, idx) => idx !== i));
  const updateChild = (i: number, field: keyof Child, value: string) => {
    const updated = [...children];
    updated[i] = { ...updated[i], [field]: value };
    setChildren(updated);
  };

  const toggleTransport = (val: string) =>
    setTransportModes((prev) => prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]);

  const toggleWeekendPick = (val: string) => {
    setWeekendPicks((prev) => {
      if (prev.includes(val)) return prev.filter((p) => p !== val);
      if (prev.length >= 4) { toast.info("Sélectionnez au maximum 4 activités 🎯"); return prev; }
      return [...prev, val];
    });
  };

  const toggleWeekendDislike = (val: string) => {
    setWeekendDislikes((prev) => {
      if (prev.includes(val)) return prev.filter((p) => p !== val);
      if (prev.length >= 3) { toast.info("Sélectionnez au maximum 3 activités à éviter 🙅"); return prev; }
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
          postal_code: address,
          preferences: weekendPicks,
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

      // Save newsletter subscribers
      const subscribers: { user_id: string; name: string | null; email: string; is_primary: boolean; opt_in: boolean }[] = [];

      // Primary subscriber (account owner)
      if (newsletterEmail && newsletterEmail.trim()) {
        subscribers.push({
          user_id: userId,
          name: parentName || null,
          email: newsletterEmail.trim(),
          is_primary: true,
          opt_in: newsletterOptIn,
        });
      }

      // Family members
      const validMembers = familyMembers.filter((m) => m.email && m.email.trim());
      for (const member of validMembers) {
        subscribers.push({
          user_id: userId,
          name: member.name || null,
          email: member.email.trim(),
          is_primary: false,
          opt_in: true,
        });
      }

      if (subscribers.length > 0) {
        const { error: subsError } = await supabase
          .from("newsletter_subscribers")
          .insert(subscribers);
        if (subsError) throw subsError;
      }

      toast.success("Bienvenue sur Pépite ! 🎉");
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

              {/* Address autofill */}
              <div className="relative" ref={suggestionsRef}>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                  <Input
                    value={addressQuery}
                    onChange={(e) => { setAddressQuery(e.target.value); setAddress(e.target.value); setCity(""); }}
                    onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Votre adresse (ex : 12 rue de Rivoli, Paris)"
                    required
                    className="h-11 bg-background/70 border-border/50 rounded-2xl pl-9 pr-4 text-sm placeholder:text-muted-foreground/50"
                    autoComplete="off"
                  />
                  {addressLoading && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  )}
                </div>

                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-card border border-border/50 rounded-2xl shadow-lg overflow-hidden">
                    {addressSuggestions.map((s, i) => {
                      const parts = s.display_name.split(", ");
                      const main = parts.slice(0, 2).join(", ");
                      const sub = parts.slice(2, 4).join(", ");
                      return (
                        <button
                          key={i}
                          type="button"
                          onMouseDown={() => selectAddress(s)}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/60 transition-colors border-b border-border/30 last:border-0 flex flex-col gap-0.5"
                        >
                          <span className="text-sm font-medium text-foreground truncate">{main}</span>
                          {sub && <span className="text-xs text-muted-foreground truncate">{sub}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* City auto-filled or manual */}
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ville (remplie automatiquement)"
                className="h-11 bg-background/70 border-border/50 rounded-2xl px-4 text-sm placeholder:text-muted-foreground/50"
              />

              <button
                onClick={() => setStep(1)}
                disabled={!city || !address}
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
            <div className="space-y-4">
              {/* Section 1 — Favoris */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">❤️ Ce qu'on adorerait faire</p>
                  <span className="text-xs text-muted-foreground/60">{weekendPicks.length}/4</span>
                </div>
                <div className="flex gap-1 mb-1">
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
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/40" /></div>
                <div className="relative flex justify-center">
                  <span className="bg-card/90 px-3 text-xs text-muted-foreground/60 italic">et à l'inverse…</span>
                </div>
              </div>

              {/* Section 2 — À éviter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🙅 Ce qu'on éviterait plutôt</p>
                  <span className="text-xs text-muted-foreground/60">{weekendDislikes.length}/3</span>
                </div>
                <div className="flex gap-1 mb-1">
                  {[0,1,2].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < weekendDislikes.length ? "bg-destructive/60" : "bg-muted"}`} />
                  ))}
                </div>
                <div className="space-y-1.5">
                  {WEEKEND_ACTIVITIES.filter((act) => !weekendPicks.includes(act.value)).map((act) => (
                    <button
                      key={act.value}
                      onClick={() => toggleWeekendDislike(act.value)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium border transition-all flex justify-between items-center ${
                        weekendDislikes.includes(act.value)
                          ? "bg-destructive/10 text-destructive border-destructive/40 shadow-sm"
                          : "bg-background/70 text-foreground border-border/50 hover:border-destructive/40"
                      }`}
                    >
                      {act.label}
                      {weekendDislikes.includes(act.value) && <span className="text-xs ml-2">✗</span>}
                    </button>
                  ))}
                </div>
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

          {/* Step 4 — Newsletter & CTA final */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Value props */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 bg-muted/40 rounded-2xl px-4 py-3">
                  <span className="text-lg shrink-0">📱</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Accès aux pépites</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">Retrouvez toutes vos activités personnalisées sur l'app et le site, quand vous voulez.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-muted/40 rounded-2xl px-4 py-3">
                  <span className="text-lg shrink-0">📩</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Newsletter du week-end</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">Recevez chaque mercredi vos meilleures idées d'activités, adaptées à la météo et à vos enfants.</p>
                  </div>
                </div>
              </div>

              {/* Newsletter opt-in */}
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                  <Input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Votre email pour la newsletter"
                    className="h-11 bg-background/70 border-border/50 rounded-2xl pl-9 pr-4 text-sm placeholder:text-muted-foreground/50"
                  />
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer px-1">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={newsletterOptIn}
                    onClick={() => setNewsletterOptIn(!newsletterOptIn)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                      newsletterOptIn ? "gradient-meadow border-primary" : "border-border/60 bg-background/70"
                    }`}
                  >
                    {newsletterOptIn && <span className="text-primary-foreground text-[10px] font-bold">✓</span>}
                  </button>
                  <span className="text-xs text-muted-foreground leading-snug">
                    Je veux recevoir la newsletter Pépite chaque mercredi 🌿
                  </span>
                </label>
              </div>

              {/* Family members newsletter */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  👨‍👩‍👧 Autres membres de la famille
                </p>
                {familyMembers.map((member, i) => (
                  <div key={i} className="flex gap-2 items-center bg-muted/40 rounded-2xl px-3 py-2.5">
                    <Input
                      value={member.name}
                      onChange={(e) => updateFamilyMember(i, "name", e.target.value)}
                      placeholder="Prénom"
                      className="flex-1 h-9 bg-background/70 border-border/50 rounded-xl px-3 text-sm min-w-0"
                    />
                    <div className="relative flex-[2] min-w-0">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
                      <Input
                        type="email"
                        value={member.email}
                        onChange={(e) => updateFamilyMember(i, "email", e.target.value)}
                        placeholder="Email"
                        className="h-9 bg-background/70 border-border/50 rounded-xl pl-7 pr-2 text-sm w-full"
                      />
                    </div>
                    <button
                      onClick={() => removeFamilyMember(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addFamilyMember}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium pl-1"
                >
                  <Plus className="h-4 w-4" /> Ajouter un membre de la famille
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(3)} className="flex-1 h-11 rounded-2xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
                  Retour
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-[2] h-12 rounded-2xl gradient-meadow text-primary-foreground font-semibold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 shadow-md"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Découvrir mes pépites</>
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
