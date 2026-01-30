import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache for signed URLs to avoid regenerating them frequently
const urlCache = new Map<string, { url: string; expiresAt: number }>();

// Signed URLs expire after 1 hour, refresh 5 minutes before expiry
const EXPIRY_SECONDS = 3600;
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export function useSignedUrl(imagePath: string | null) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!imagePath) {
      setSignedUrl(null);
      return;
    }

    const fetchSignedUrl = async () => {
      // Check cache first
      const cached = urlCache.get(imagePath);
      const now = Date.now();
      
      if (cached && cached.expiresAt > now + REFRESH_BUFFER_MS) {
        setSignedUrl(cached.url);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: urlError } = await supabase.storage
          .from('receipts')
          .createSignedUrl(imagePath, EXPIRY_SECONDS);

        if (urlError) {
          throw urlError;
        }

        if (data?.signedUrl) {
          // Cache the URL
          urlCache.set(imagePath, {
            url: data.signedUrl,
            expiresAt: now + EXPIRY_SECONDS * 1000,
          });
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Failed to get signed URL:', err);
        setError(err instanceof Error ? err : new Error('Failed to get signed URL'));
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [imagePath]);

  return { signedUrl, loading, error };
}

// Utility function to get a signed URL for a given image path (for non-hook usage)
export async function getSignedUrl(imagePath: string): Promise<string | null> {
  // Check cache first
  const cached = urlCache.get(imagePath);
  const now = Date.now();
  
  if (cached && cached.expiresAt > now + REFRESH_BUFFER_MS) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(imagePath, EXPIRY_SECONDS);

    if (error) {
      console.error('Failed to get signed URL:', error);
      return null;
    }

    if (data?.signedUrl) {
      // Cache the URL
      urlCache.set(imagePath, {
        url: data.signedUrl,
        expiresAt: now + EXPIRY_SECONDS * 1000,
      });
      return data.signedUrl;
    }

    return null;
  } catch (err) {
    console.error('Failed to get signed URL:', err);
    return null;
  }
}
