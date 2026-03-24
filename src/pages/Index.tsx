import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthForm from "@/components/AuthForm";
import OnboardingForm from "@/components/OnboardingForm";
import WeekendNewsletter from "@/components/WeekendNewsletter";

type AppState = "loading" | "auth" | "onboarding" | "app";

interface FamilyProfile {
  id: string;
  parent_name: string;
  city: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  preferences: string[];
}

interface Child {
  id: string;
  name: string;
  age_years: number | null;
}

interface AgendaEvent {
  id: string;
  title: string;
  event_date: string;
  emoji: string | null;
  event_type: string | null;
  notes: string | null;
}

export default function Index() {
  const [state, setState] = useState<AppState>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<FamilyProfile | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);

  const loadAppData = useCallback(async (uid: string) => {
    const { data: profileData } = await supabase
      .from("family_profiles")
      .select("id, parent_name, city, postal_code, latitude, longitude, preferences")
      .eq("user_id", uid)
      .maybeSingle();

    if (!profileData) {
      setState("onboarding");
      return;
    }

    setProfile({
      ...profileData,
      preferences: profileData.preferences ?? [],
    });

    const { data: childrenData } = await supabase
      .from("children")
      .select("id, name, age_years")
      .eq("family_id", profileData.id);

    setChildren(childrenData ?? []);

    const { data: agendaData } = await supabase
      .from("agenda_events")
      .select("*")
      .eq("user_id", uid)
      .order("event_date");

    setAgendaEvents(agendaData ?? []);
    setState("app");
  }, []);

  const loadAgendaEvents = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("agenda_events")
      .select("*")
      .eq("user_id", uid)
      .order("event_date");
    if (data) setAgendaEvents(data);
  }, []);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    const handleSession = async (session: { user: { id: string } } | null) => {
      if (!mounted || initialized) return;
      initialized = true;
      if (session?.user) {
        setUserId(session.user.id);
        await loadAppData(session.user.id);
      } else {
        setUserId(null);
        setProfile(null);
        setChildren([]);
        setAgendaEvents([]);
        setState("auth");
      }
    };

    // 1. Vérifier immédiatement la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // 2. Écouter les changements d'auth (login, logout, signup)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        // Pour les events post-init (SIGNED_IN, SIGNED_OUT, etc.)
        if (initialized && (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED")) {
          initialized = false; // reset pour autoriser le prochain handle
          handleSession(session);
        } else if (!initialized) {
          handleSession(session);
        }
      }
    );

    // 3. Timeout de sécurité — si rien ne répond en 6s, aller vers auth
    const timeout = setTimeout(() => {
      if (mounted && !initialized) {
        initialized = true;
        setState("auth");
      }
    }, 6000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [loadAppData]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <span className="text-4xl animate-sway inline-block">🌿</span>
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (state === "auth") {
    return <AuthForm onSuccess={() => {}} />;
  }

  if (state === "onboarding" && userId) {
    return (
      <OnboardingForm
        userId={userId}
        onComplete={() => userId && loadAppData(userId)}
      />
    );
  }

  if (state === "app" && userId && profile) {
    return (
      <AppPage
        userId={userId}
        profile={profile}
        children={children}
        agendaEvents={agendaEvents}
        onAgendaChange={() => loadAgendaEvents(userId)}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <span className="text-4xl animate-sway inline-block">🌿</span>
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    </div>
  );
}
