
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

async function setup() {
  console.log('Checking buckets...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError);
    return;
  }

  console.log('Existing buckets:', buckets.map(b => b.name));

  const bucketName = 'pdfs';
  const exists = buckets.some(b => b.name === bucketName);

  if (!exists) {
    console.log(`Creating bucket "${bucketName}"...`);
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: false,
      allowedMimeTypes: ['application/pdf'],
      fileSizeLimit: 52428800 // 50MB
    });

    if (error) {
      console.error(`Error creating bucket "${bucketName}":`, error);
    } else {
      console.log(`Bucket "${bucketName}" created successfully!`);
    }
  } else {
    console.log(`Bucket "${bucketName}" already exists.`);
    
    // Ensure it's private
    const { data, error } = await supabase.storage.updateBucket(bucketName, {
      public: false
    });
    if (error) console.error('Error updating bucket to private:', error);
    else console.log('Bucket updated to private.');
  }
}

setup();
