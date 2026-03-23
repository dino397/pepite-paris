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
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">

      {/* Illustration — bassin immense qui continue sous la card */}
      <div className="relative flex-shrink-0" style={{ height: "66vh" }}>
        <img
          src={pepiteIllustration}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-top"
          width={1024}
          height={1280}
        />
        {/* Fondu très progressif — le bassin reste perceptible en dessous */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </div>

      {/* Brand + form */}
      <div className="flex-1 flex flex-col items-center px-6 pb-8 pt-4 relative z-10">

        {/* Brand — Cormorant Garamond, intemporel */}
        <div className="text-center mb-6">
          <h1
            className="text-[64px] leading-none mb-3 text-foreground"
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 300,
              fontStyle: "normal",
              letterSpacing: "0.04em",
              fontVariationSettings: "'opsz' 72, 'SOFT' 100, 'WONK' 0"
            }}
          >
            Pépite
          </h1>
          <p
            className="text-[11px] text-muted-foreground/60 tracking-widest uppercase max-w-[260px] mx-auto"
            style={{ fontFamily: "'Nunito', sans-serif", letterSpacing: "0.18em" }}
          >
            chaque week-end, une pépite pour vos enfants
          </p>
        </div>

        {/* Card */}
        <div className="w-full max-w-xs bg-card/90 backdrop-blur-sm rounded-3xl border border-border/50 shadow-card p-7">

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

            {/* CTA — vert pêche doré → teal, en harmonie avec les tons chauds de l'illustration */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-1 rounded-2xl text-white font-semibold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(152 36% 46%), hsl(168 42% 32%))" }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                mode === "signup" ? "Créer mon compte" : "Se connecter"
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-[11px] text-muted-foreground/40 text-center tracking-widest uppercase"
           style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: "0.14em" }}>
          Idées activités · Météo · Agenda famille
        </p>
      </div>

    </div>
  );
}
