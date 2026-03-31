
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function list() {
  console.log('Listing materials...');
  const { data, error } = await supabase.from('materials').select('*').limit(5);
  
  if (error) {
    console.error('Error listing materials:', error);
    return;
  }

  console.log('Materials:', JSON.stringify(data, null, 2));
}

list();
