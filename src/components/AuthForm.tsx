import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import pepiteIllustration from "@/assets/pepite-illustration.png";

interface AuthFormProps {
  onSuccess: () => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Compte créé ! Vérifiez vos emails pour confirmer.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden px-6">

      {/* Full-bleed illustration as background */}
      <img
        src={pepiteIllustration}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none select-none"
      />

      {/* Content — centered, above illustration */}
      <div className="relative z-10 w-full max-w-xs flex flex-col items-center">

        {/* Brand */}
        <div className="text-center mb-10">
          <h1
            className="text-[52px] font-bold tracking-tight text-foreground leading-none mb-3"
            style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: "italic" }}
          >
            Pépite
          </h1>
          <p
            className="text-sm text-muted-foreground tracking-wide leading-relaxed"
            style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: "italic" }}
          >
            vos week-ends sublimés
          </p>
        </div>

        {/* Glass card */}
        <div className="w-full bg-card/80 backdrop-blur-sm rounded-3xl border border-border/50 shadow-card p-7">

          {/* Mode toggle */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <button
              onClick={() => setMode("signin")}
              className={`text-sm font-semibold pb-0.5 border-b-2 transition-all ${
                mode === "signin"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground/70 hover:text-foreground"
              }`}
            >
              Connexion
            </button>
            <span className="text-border/60 text-xs">·</span>
            <button
              onClick={() => setMode("signup")}
              className={`text-sm font-semibold pb-0.5 border-b-2 transition-all ${
                mode === "signup"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground/70 hover:text-foreground"
              }`}
            >
              Créer un compte
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Votre email"
              required
              className="h-11 bg-background/70 border-border/50 rounded-2xl px-4 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/25 focus-visible:border-primary/40"
            />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              required
              minLength={6}
              className="h-11 bg-background/70 border-border/50 rounded-2xl px-4 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/25 focus-visible:border-primary/40"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-1 rounded-2xl gradient-meadow text-primary-foreground font-semibold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                mode === "signup" ? "Créer mon compte →" : "Se connecter →"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground/50 text-center tracking-wide">
          Idées activités · Météo · Agenda famille
        </p>
      </div>

    </div>
  );
}
