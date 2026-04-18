import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.https://qgztivyxegjggcspuuqj.supabase.co!;
const supabaseAnonKey = process.env.sb_publishable_9e_LpZxMdKhVgtmoRefARA_3j-itnWX!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
