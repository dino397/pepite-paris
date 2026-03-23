-- Table to store scraped activities
CREATE TABLE public.scraped_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_key TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  arrondissement TEXT,
  duration TEXT,
  booking_url TEXT,
  travel_walk TEXT,
  travel_bike TEXT,
  travel_car TEXT,
  is_exceptional BOOLEAN DEFAULT false,
  badge TEXT,
  date_start TEXT,
  date_end TEXT,
  showtimes TEXT,
  cinema_name TEXT,
  cinema_url TEXT,
  source_url TEXT,
  raw_data JSONB,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scraped_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for scraped activities"
  ON public.scraped_activities FOR SELECT USING (true);

CREATE POLICY "Service role can insert scraped activities"
  ON public.scraped_activities FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can delete scraped activities"
  ON public.scraped_activities FOR DELETE USING (true);

CREATE INDEX idx_scraped_activities_week_key ON public.scraped_activities (week_key);
CREATE INDEX idx_scraped_activities_category ON public.scraped_activities (category);

-- Table to track scrape runs
CREATE TABLE public.scrape_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sources_scraped TEXT[] DEFAULT '{}',
  activities_found INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.scrape_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for scrape runs"
  ON public.scrape_runs FOR SELECT USING (true);

CREATE POLICY "Service role can manage scrape runs"
  ON public.scrape_runs FOR ALL USING (true) WITH CHECK (true);

-- Extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;