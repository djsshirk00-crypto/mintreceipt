-- Add marketing opt-in column to user_settings
ALTER TABLE public.user_settings
ADD COLUMN marketing_opt_in boolean NOT NULL DEFAULT false;