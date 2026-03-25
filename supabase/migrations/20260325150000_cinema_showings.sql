CREATE TABLE cinema_showings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER,
  title TEXT NOT NULL,
  overview TEXT,
  poster_url TEXT,
  certification TEXT,
  age_min INTEGER DEFAULT 0,
  genres TEXT[],
  duration_min INTEGER,
  vote_average NUMERIC,
  cinemas JSONB DEFAULT '[]',
  source_url TEXT,
  week_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(title, week_key)
);

CREATE INDEX idx_cinema_showings_week ON cinema_showings(week_key);
CREATE INDEX idx_cinema_showings_age ON cinema_showings(age_min);
