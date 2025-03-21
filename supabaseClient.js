import { createClient } from '@supabase/supabase-js';

// Substitua pelos seus dados do Supabase
const SUPABASE_URL = 'https://axofggykwirdyjekapns.supabase.co'; // https://financasustm.vercel.app
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4b2ZnZ3lrd2lyZHlqZWthcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNDY5MzAsImV4cCI6MjA1NzgyMjkzMH0.aa3wgoH3RfdfOjU9moL8HEWLZMbTNSxxftbCcYmT2E0eyJhbGciOiJIUzI1NiIsInR...'; // Chave Anônima

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
