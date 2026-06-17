import appHeaderBg from "@/assets/app-header-bg.jpg";

function getWeekendLabel(): string {
  const now = new Date();
  const day = now.getDay();
  const sat = new Date(now);
  sat.setDate(now.getDate() + (day === 0 ? 6 : day === 6 ? 0 : 6 - day));
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return `${fmt(sat)} & ${fmt(sun)}`;
}

export default function Header() {
  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={appHeaderBg} alt="" aria-hidden className="w-full h-full object-cover object-[center_70%]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/50 to-background" />
      </div>
      <div className="relative z-10 px-4 pt-8 pb-10 text-center">
        <h1
          className="text-5xl md:text-6xl text-foreground mb-2"
          style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 300, letterSpacing: "0.04em" }}
        >
          Pépite
        </h1>
        <p
          className="text-[11px] text-muted-foreground/60 tracking-widest uppercase"
          style={{ fontFamily: "'Nunito', sans-serif", letterSpacing: "0.18em" }}
        >
          activités famille · Paris · {getWeekendLabel()}
        </p>
      </div>
    </header>
  );
}
