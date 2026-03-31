import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  let flashcardQuery = supabase
    .from('flashcards')
    .select('*', { count: 'exact' })
    .eq('course', '1ten')
    .or('type.eq.flashcard,type.is.null')
    .limit(1);

  let { count: flashcardCount, error: flashcardError, data } = await flashcardQuery;
  
  console.log('Initial:', { flashcardCount, flashcardError });
  console.log('Error details:', JSON.stringify(flashcardError, null, 2));
}

check();
