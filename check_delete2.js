import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Try to delete a flashcard that has user_progress
  const { data: itemsToDelete, error: getIdsError } = await supabase
    .from('flashcards')
    .select('id')
    .eq('course', '1ten')
    .limit(10);
    
  if (itemsToDelete && itemsToDelete.length > 0) {
    const ids = itemsToDelete.map(item => item.id);
    console.log('IDs to delete:', ids);
    
    const { error: progressError } = await supabase
      .from('user_progress')
      .delete()
      .in('flashcard_id', ids);
      
    console.log('Progress delete result:', progressError);
    
    const { data, error } = await supabase
      .from('flashcards')
      .delete()
      .in('id', ids);
      
    console.log('Flashcard delete result:', { data, error });
  }
}

check();
