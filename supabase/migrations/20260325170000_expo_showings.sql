CREATE TABLE expo_showings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  venue TEXT NOT NULL,
  arrondissement TEXT,
  age_min INTEGER DEFAULT 0,
  age_max INTEGER DEFAULT 12,
  duration TEXT,
  price TEXT,
  booking_url TEXT,
  poster_url TEXT,
  dates TEXT,
  tags TEXT[],
  week_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(title, venue, week_key)
);

CREATE INDEX idx_expo_showings_week ON expo_showings(week_key);
CREATE INDEX idx_expo_showings_age ON expo_showings(age_min);
