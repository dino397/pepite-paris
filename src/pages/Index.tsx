import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthForm from "@/components/AuthForm";
import OnboardingForm from "@/components/OnboardingForm";
import WeekendNewsletter from "@/components/WeekendNewsletter";

type AppState = "loading" | "auth" | "onboarding" | "app";

export default function Index() {
  const [state, setState] = useState<AppState>("loading");
  const [userId, setUserId] = useState<string | null>(null);

  const checkUserState = async (uid: string) => {
    const { data: profile } = await supabase
      .from("family_profiles")
      .select("id")
      .eq("user_id", uid)
      .maybeSingle();

    if (profile) {
      setState("app");
    } else {
      setState("onboarding");
    }
  };

  useEffect(() => {
    // Listen to auth state changes BEFORE getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUserId(session.user.id);
          await checkUserState(session.user.id);
        } else {
          setUserId(null);
          setState("auth");
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        checkUserState(session.user.id);
      } else {
        setState("auth");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    return <AuthForm onSuccess={() => userId && checkUserState(userId)} />;
  }

  if (state === "onboarding" && userId) {
    return (
      <OnboardingForm
        userId={userId}
        onComplete={() => setState("app")}
      />
    );
  }

  return <WeekendNewsletter onSignOut={() => setState("auth")} />;
}
