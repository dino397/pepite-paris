
-- Enable the update_updated_at_column function if not existing
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Family profiles table
CREATE TABLE public.family_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  parent_name TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  preferences TEXT[] DEFAULT '{}',
  newsletter_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.family_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.family_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
  ON public.family_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.family_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_family_profiles_updated_at
  BEFORE UPDATE ON public.family_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Children table
CREATE TABLE public.children (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES public.family_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  birth_date DATE,
  age_years INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own children"
  ON public.children FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.family_profiles fp
    WHERE fp.id = children.family_id AND fp.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own children"
  ON public.children FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.family_profiles fp
    WHERE fp.id = children.family_id AND fp.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own children"
  ON public.children FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.family_profiles fp
    WHERE fp.id = children.family_id AND fp.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own children"
  ON public.children FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.family_profiles fp
    WHERE fp.id = children.family_id AND fp.user_id = auth.uid()
  ));

-- Agenda events table
CREATE TABLE public.agenda_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_type TEXT DEFAULT 'event',
  notes TEXT,
  emoji TEXT DEFAULT '📅',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events"
  ON public.agenda_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events"
  ON public.agenda_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
  ON public.agenda_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
  ON public.agenda_events FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_agenda_events_updated_at
  BEFORE UPDATE ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Newsletter cache table
CREATE TABLE public.newsletter_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_key TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own newsletter"
  ON public.newsletter_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own newsletter"
  ON public.newsletter_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_newsletter_cache_user_week
  ON public.newsletter_cache(user_id, week_key);
