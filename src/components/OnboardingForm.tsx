import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, ChevronRight, MapPin, User, Baby, Heart } from "lucide-react";

interface Child {
  name: string;
  age_years: number | string;
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

const STEPS = ["Bonjour !", "Vos enfants", "Vos envies"];

export default function OnboardingForm({ userId, onComplete }: OnboardingFormProps) {
  const [step, setStep] = useState(0);
  const [parentName, setParentName] = useState("");
  const [city, setCity] = useState("");
  const [children, setChildren] = useState<Child[]>([{ name: "", age_years: "" }]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addChild = () => setChildren([...children, { name: "", age_years: "" }]);
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

  const handleFinish = async () => {
    setLoading(true);
    try {
      // Create family profile
      const { data: profile, error: profileError } = await supabase
        .from("family_profiles")
        .insert({
          user_id: userId,
          parent_name: parentName,
          city,
          preferences,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Insert children
      const validChildren = children.filter((c) => c.name || c.age_years);
      if (validChildren.length > 0) {
        const { error: childrenError } = await supabase.from("children").insert(
          validChildren.map((c) => ({
            family_id: profile.id,
            name: c.name,
            age_years: c.age_years ? Number(c.age_years) : null,
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all ${
                  i <= step
                    ? "gradient-hero text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-12 transition-all ${i < step ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-card p-8 animate-fade-in">
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
                <p className="text-muted-foreground mt-1">Pour adapter les activités à leur âge</p>
              </div>

              <div className="space-y-3">
                {children.map((child, i) => (
                  <div key={i} className="flex gap-2 items-center bg-muted/50 rounded-xl p-3">
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
                    <span className="text-muted-foreground text-sm">ans</span>
                    {children.length > 1 && (
                      <button onClick={() => removeChild(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
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
                  className="flex-2 gradient-hero text-primary-foreground font-semibold rounded-xl flex-1"
                >
                  Continuer <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Préférences */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="text-4xl mb-3">❤️</div>
                <h2 className="font-display text-2xl font-bold text-foreground">Vos envies</h2>
                <p className="text-muted-foreground mt-1">Quelles activités vous plaisent le plus ?</p>
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
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
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
