import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hxumfreeuqqehflcaekv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_r3brMWyT6Po55QI8lrNwHA_tJQ0N1bQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
