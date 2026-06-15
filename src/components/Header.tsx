import { LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import appHeaderBg from "@/assets/app-header-bg.jpg";

function getWeekendLabel(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSaturday = dayOfWeek === 0 ? 6 : dayOfWeek === 6 ? 0 : 6 - dayOfWeek;
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + daysUntilSaturday);
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return `${fmt(saturday)} & ${fmt(sunday)}`;
}

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={appHeaderBg} alt="" aria-hidden className="w-full h-full object-cover object-[center_70%]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
      </div>

      <div className="relative z-10 px-4 pt-6 pb-8 text-center">
        <div className="flex justify-end mb-4">
          {user ? (
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground transition-colors px-3 py-1.5 rounded-full"
              style={{ background: "hsl(40 35% 99% / 0.7)", backdropFilter: "blur(8px)" }}
            >
              <LogOut className="h-3 w-3" />
              Déconnexion
            </button>
          ) : (
            <a
              href="#login"
              className="flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground transition-colors px-3 py-1.5 rounded-full"
              style={{ background: "hsl(40 35% 99% / 0.7)", backdropFilter: "blur(8px)" }}
            >
              <User className="h-3 w-3" />
              Connexion
            </a>
          )}
        </div>

        <h1
          className="text-4xl md:text-5xl text-foreground mb-1"
          style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 300, letterSpacing: "0.04em" }}
        >
          Pépite
        </h1>
        <p
          className="text-xs text-muted-foreground/60 tracking-widest uppercase"
          style={{ fontFamily: "'Nunito', sans-serif", letterSpacing: "0.18em" }}
        >
          activités famille · Paris · {getWeekendLabel()}
        </p>
      </div>
    </header>
  );
}
