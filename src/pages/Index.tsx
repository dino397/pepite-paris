import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthForm from "@/components/AuthForm";
import OnboardingForm from "@/components/OnboardingForm";
import AppPage from "@/components/AppPage";
import type { User } from "@supabase/supabase-js";

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

type AppState = "loading" | "auth" | "onboarding" | "newsletter";

export default function Index() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FamilyProfile | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);

  const loadUserData = async (userId: string) => {
    // Load profile
    const { data: profileData } = await supabase
      .from("family_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!profileData) {
      setAppState("onboarding");
      return;
    }

    setProfile(profileData);

    // Load children
    const { data: childrenData } = await supabase
      .from("children")
      .select("*")
      .eq("family_id", profileData.id)
      .order("age_years");

    setChildren(childrenData || []);

    // Load upcoming agenda events (next 30 days)
    const today = new Date().toISOString().split("T")[0];
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const { data: eventsData } = await supabase
      .from("agenda_events")
      .select("*")
      .eq("user_id", userId)
      .gte("event_date", today)
      .lte("event_date", future)
      .order("event_date");

    setAgendaEvents(eventsData || []);
    setAppState("newsletter");
  };

  const refreshAgenda = async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const { data } = await supabase
      .from("agenda_events")
      .select("*")
      .eq("user_id", user.id)
      .gte("event_date", today)
      .lte("event_date", future)
      .order("event_date");
    setAgendaEvents(data || []);
  };

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user.id);
      } else {
        setAppState("auth");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setChildren([]);
        setAppState("auth");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (appState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="text-5xl">🗓️</div>
          <div className="font-display text-xl font-semibold text-foreground">Weekend Famille</div>
          <div className="flex justify-center">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (appState === "auth") {
    return <AuthForm onSuccess={() => {}} />;
  }

  if (appState === "onboarding" && user) {
    return (
      <OnboardingForm
        userId={user.id}
        onComplete={() => loadUserData(user.id)}
      />
    );
  }

  if (appState === "newsletter" && user && profile) {
    return (
      <NewsletterPage
        userId={user.id}
        profile={profile}
        children={children}
        agendaEvents={agendaEvents}
        onAgendaChange={refreshAgenda}
      />
    );
  }

  return null;
}
