
-- Add gender to children table
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS gender text;

-- Add transport & mobility fields to family_profiles
ALTER TABLE public.family_profiles ADD COLUMN IF NOT EXISTS transport_modes text[] DEFAULT '{}';
ALTER TABLE public.family_profiles ADD COLUMN IF NOT EXISTS max_travel_minutes integer DEFAULT 30;
ALTER TABLE public.family_profiles ADD COLUMN IF NOT EXISTS weekend_picks text[] DEFAULT '{}';
