import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, X, Calendar } from "lucide-react";

interface AgendaEvent {
  id: string;
  title: string;
  event_date: string;
  emoji: string | null;
  event_type: string | null;
  notes: string | null;
}

interface AgendaSectionProps {
  userId: string;
  events: AgendaEvent[];
  onEventsChange: () => void;
}

const EMOJIS = ["🎂", "🎉", "🏋️", "📚", "🎭", "🎬", "🍕", "✈️", "🏖️", "🎁", "👨‍👩‍👧", "📅"];

export default function AgendaSection({ userId, events, onEventsChange }: AgendaSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("📅");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("agenda_events").insert({
        user_id: userId,
        title,
        event_date: date,
        emoji: selectedEmoji,
        notes: notes || null,
      });
      if (error) throw error;
      toast.success("Événement ajouté !");
      setTitle("");
      setDate("");
      setNotes("");
      setSelectedEmoji("📅");
      setShowForm(false);
      onEventsChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("agenda_events").delete().eq("id", id);
    if (!error) {
      onEventsChange();
    }
  };

  // Group events by month
  const grouped = events.reduce<Record<string, AgendaEvent[]>>((acc, ev) => {
    const key = new Date(ev.event_date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold text-foreground">Mon Agenda</h2>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
          className={!showForm ? "gradient-hero text-primary-foreground rounded-lg" : ""}
        >
          {showForm ? <X className="h-4 w-4" /> : <><Plus className="h-4 w-4 mr-1" /> Ajouter</>}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-card rounded-xl border border-border p-4 space-y-3 animate-fade-in">
          <div className="space-y-1.5">
            <Label className="text-sm">Titre</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Anniv Léa, Concert, Sortie scolaire…"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Emoji</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setSelectedEmoji(em)}
                  className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                    selectedEmoji === em ? "bg-primary/20 ring-2 ring-primary" : "bg-muted hover:bg-secondary"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Note (optionnel)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex : Prévoir cadeau"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full gradient-hero text-primary-foreground rounded-lg font-semibold"
          >
            {loading ? "Ajout…" : "Ajouter à l'agenda"}
          </Button>
        </form>
      )}

      {events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun événement à venir</p>
          <p className="text-xs mt-1">Ajoutez anniversaires, sorties, rendez-vous…</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([month, monthEvents]) => (
            <div key={month}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                {month}
              </h3>
              <div className="space-y-1.5">
                {monthEvents.map((ev) => {
                  const d = new Date(ev.event_date);
                  const isToday = new Date().toDateString() === d.toDateString();
                  const isSoon = (d.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;
                  return (
                    <div
                      key={ev.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${
                        isToday
                          ? "bg-primary/10 border-primary/30"
                          : isSoon
                          ? "bg-warm-gold/10 border-warm-gold/30"
                          : "bg-card border-border/60"
                      }`}
                    >
                      <span className="text-xl flex-shrink-0">{ev.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">{ev.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                          {isToday && <span className="ml-2 text-primary font-semibold">Aujourd'hui !</span>}
                          {!isToday && isSoon && <span className="ml-2 text-warm-amber font-semibold">Dans {Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))}j</span>}
                        </div>
                        {ev.notes && <div className="text-xs text-muted-foreground italic truncate">{ev.notes}</div>}
                      </div>
                      <button
                        onClick={() => handleDelete(ev.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
