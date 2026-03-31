import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: progressData } = await supabase
    .from('user_progress')
    .select('flashcard_id')
    .limit(1);
    
  if (progressData && progressData.length > 0) {
    const flashcardId = progressData[0].flashcard_id;
    console.log('Flashcard ID with progress:', flashcardId);
    
    const { error: progressError } = await supabase
      .from('user_progress')
      .delete()
      .eq('flashcard_id', flashcardId);
      
    console.log('Progress delete result:', progressError);
    
    const { data, error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', flashcardId);
      
    console.log('Flashcard delete result:', { data, error });
  }
}

check();
