import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Try to delete a flashcard that has user_progress
  const { data, error } = await supabase
    .from('flashcards')
    .delete()
    .eq('course', '1ten')
    .limit(1);
    
  console.log('Delete result:', { data, error });
}

check();
