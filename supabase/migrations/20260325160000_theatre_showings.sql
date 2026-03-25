CREATE TABLE theatre_showings (
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
  showtimes TEXT,
  tags TEXT[],
  week_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(title, venue, week_key)
);

CREATE INDEX idx_theatre_showings_week ON theatre_showings(week_key);
CREATE INDEX idx_theatre_showings_age ON theatre_showings(age_min);
