import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgztivyxegjggcspuuqj.supabase.co';
const supabaseAnonKey = 'sb_publishable_9e_LpZxMdKhVgtmoRefARA_3j-itnWX';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
