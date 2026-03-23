import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
    <div className="min-h-screen bg-background flex flex-col">

      {/* Top accent strip */}
      <div className="h-1 w-full gradient-meadow" />

      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">

        {/* Brand */}
        <div className="text-center mb-16 space-y-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-3xl animate-sway inline-block">🌿</span>
            <span className="text-3xl animate-float inline-block" style={{ animationDelay: "0.5s" }}>✨</span>
            <span className="text-3xl animate-sway inline-block" style={{ animationDelay: "1s" }}>🌸</span>
          </div>
          <h1 className="font-display text-6xl font-bold tracking-tight text-foreground leading-none">
            Pépite
          </h1>
          <p className="text-muted-foreground text-base font-light tracking-wide max-w-xs mx-auto leading-relaxed">
            Vos week-ends en famille,<br />sublimés à Paris
          </p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm">

          {/* Mode toggle — minimal pills */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              onClick={() => setMode("signin")}
              className={`text-sm font-semibold pb-1 border-b-2 transition-all ${
                mode === "signin"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Connexion
            </button>
            <span className="text-border">·</span>
            <button
              onClick={() => setMode("signup")}
              className={`text-sm font-semibold pb-1 border-b-2 transition-all ${
                mode === "signup"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
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
              className="h-12 bg-card border-border/60 rounded-2xl px-4 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/30 focus-visible:border-primary/50"
            />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              required
              minLength={6}
              className="h-12 bg-card border-border/60 rounded-2xl px-4 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/30 focus-visible:border-primary/50"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-2xl gradient-meadow text-primary-foreground font-semibold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-hover"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                mode === "signup" ? "Créer mon compte →" : "Se connecter →"
              )}
            </button>
          </form>

        </div>

        {/* Footer note */}
        <p className="mt-12 text-xs text-muted-foreground/60 text-center">
          Idées activités · Météo · Agenda famille
        </p>
      </div>

    </div>
  );
}
