import { createClient } from '@supabase/supabase-js';

// Credentials provided for frontend access
const SUPABASE_URL = "https://jiorvtskypelmdpffddc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nOntZZ5N5h5l_r_ZVsJb-Q_JiUh3yhS";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
