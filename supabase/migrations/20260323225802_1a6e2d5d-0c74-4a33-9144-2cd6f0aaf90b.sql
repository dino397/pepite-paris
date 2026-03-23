CREATE TABLE public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT,
  email TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  opt_in BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscribers"
  ON public.newsletter_subscribers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscribers"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscribers"
  ON public.newsletter_subscribers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscribers"
  ON public.newsletter_subscribers FOR DELETE
  USING (auth.uid() = user_id);