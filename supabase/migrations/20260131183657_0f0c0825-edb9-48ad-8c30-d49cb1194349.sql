-- Add onboarding tracking fields to user_settings
ALTER TABLE public.user_settings
ADD COLUMN onboarding_completed_at timestamp with time zone,
ADD COLUMN onboarding_version_seen integer NOT NULL DEFAULT 0;