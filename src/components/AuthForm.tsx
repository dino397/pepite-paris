import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import pepiteIllustration from "@/assets/pepite-illustration-v6.jpg";

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
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Email is auto-confirmed — session is returned immediately
        if (data.session) {
          onSuccess();
        } else {
          toast.success("Compte créé ! Vérifiez vos emails pour confirmer.");
        }
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

      {/* Illustration — pleine largeur, plus haute pour voir les bateaux */}
      <div className="relative flex-shrink-0 overflow-hidden w-full" style={{ height: "72vh" }}>
        <img
          src={pepiteIllustration}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-[center_75%] md:object-[center_85%]"
          width={1024}
          height={1024}
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

        {/* Fondu bas vers le fond */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </div>

      {/* Brand + form */}
      <div className="flex flex-col items-center px-6 pb-8 -mt-16 relative z-10">

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
            className="text-[11px] text-muted-foreground/60 tracking-widest uppercase max-w-[320px] mx-auto"
            style={{ fontFamily: "'Nunito', sans-serif", letterSpacing: "0.18em" }}
          >
            chaque week-end,<br />des activités pépites à faire en famille
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

          {/* Google SSO */}
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (result?.error) throw result.error;
                if (!result?.redirected) onSuccess();
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Une erreur est survenue";
                toast.error(msg);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full h-11 mb-4 rounded-2xl border border-border/60 bg-background/80 flex items-center justify-center gap-3 text-sm font-medium text-foreground hover:bg-muted/60 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </button>

          {/* Séparateur */}
          <div className="flex items-center gap-3 mb-1">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-[11px] text-muted-foreground/50 uppercase tracking-widest">ou</span>
            <div className="flex-1 h-px bg-border/40" />
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
