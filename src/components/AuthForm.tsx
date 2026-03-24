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
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden">

      {/* Illustration — visible on both mobile and desktop */}
      <div className="relative flex-shrink-0 overflow-hidden md:w-1/2 md:h-screen" style={{ height: "66vh" }}>
        <img
          src={pepiteIllustration}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-[center_40%] md:object-center"
          width={1024}
          height={1280}
        />

        {/* Nuages animés — dérivent doucement via keyframes Tailwind */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Nuage gauche — dérive vers la droite */}
          <div
            className="absolute rounded-full blur-sm opacity-50"
            style={{
              width: 160, height: 48,
              background: "radial-gradient(ellipse, #fff8ee 60%, transparent 100%)",
              top: "7%", left: "8%",
              animation: "cloudDrift1 20s ease-in-out infinite",
            }}
          />
          <div
            className="absolute rounded-full blur-sm opacity-40"
            style={{
              width: 110, height: 34,
              background: "radial-gradient(ellipse, #fdebd0 60%, transparent 100%)",
              top: "10%", left: "5%",
              animation: "cloudDrift1 20s ease-in-out infinite",
            }}
          />

          {/* Nuage centre — dérive vers la gauche */}
          <div
            className="absolute rounded-full blur-sm opacity-45"
            style={{
              width: 200, height: 52,
              background: "radial-gradient(ellipse, #fff8ee 60%, transparent 100%)",
              top: "5%", left: "52%",
              animation: "cloudDrift2 26s ease-in-out infinite",
            }}
          />
          <div
            className="absolute rounded-full blur-sm opacity-35"
            style={{
              width: 130, height: 36,
              background: "radial-gradient(ellipse, #fdebd0 60%, transparent 100%)",
              top: "9%", left: "58%",
              animation: "cloudDrift2 26s ease-in-out infinite",
            }}
          />

          {/* Petit nuage droite — dérive légèrement */}
          <div
            className="absolute rounded-full blur-sm opacity-40"
            style={{
              width: 140, height: 40,
              background: "radial-gradient(ellipse, #fff8ee 60%, transparent 100%)",
              top: "3%", left: "78%",
              animation: "cloudDrift3 16s ease-in-out infinite",
            }}
          />
        </div>

        {/* Keyframes injectées globalement */}
        <style>{`
          @keyframes cloudDrift1 {
            0%, 100% { transform: translateX(0px); }
            50%       { transform: translateX(32px); }
          }
          @keyframes cloudDrift2 {
            0%, 100% { transform: translateX(0px); }
            50%       { transform: translateX(-24px); }
          }
          @keyframes cloudDrift3 {
            0%, 100% { transform: translateX(0px); }
            50%       { transform: translateX(18px); }
          }
        `}</style>

        {/* Fondu bas sur mobile, fondu droite sur desktop */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/70 to-transparent md:hidden" />
        <div className="hidden md:block absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-l from-background via-background/60 to-transparent" />
      </div>

      {/* Brand + form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 pt-4 md:pt-8 relative z-10">

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
