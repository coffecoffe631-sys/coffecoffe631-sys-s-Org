import { createClient } from '@supabase/supabase-js';

const getValidConfig = () => {
  const defaultUrl = 'https://hxumfreeuqqehflcaekv.supabase.co';
  const defaultKey = 'sb_publishable_r3brMWyT6Po55QI8lrNwHA_tJQ0N1bQ';

  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const isInvalid = (val: string | undefined) => {
    if (!val) return true;
    const v = val.trim().toLowerCase();
    return (
      v === '' ||
      v.includes('placeholder') ||
      v.includes('your_') ||
      v.includes('exemplo') ||
      v.includes('example') ||
      v === 'true' ||
      v === 'false'
    );
  };

  const finalUrl = isInvalid(envUrl) ? defaultUrl : envUrl!.trim();
  const finalKey = isInvalid(envKey) ? defaultKey : envKey!.trim();

  return { url: finalUrl, key: finalKey };
};

const { url, key } = getValidConfig();

export const supabase = createClient(url, key);

