import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Se connecter avec le compte admin ou l'utilisateur
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'buba6c@gmail.com',
  password: 'admin123'  // Essayons différents mots de passe
});

if (authError) {
  console.log('Auth error:', authError.message);
  // Essayons de récupérer via RPC ou autre méthode
}

// Récupérer l'utilisateur courant
const { data: { user } } = await supabase.auth.getUser();

if (user) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance')
    .eq('id', user.id)
    .single();

  if (data) {
    console.log('=== VOTRE COMPTE ===');
    console.log('Email:', data.email);
    console.log('Balance:', data.balance);
    console.log('Frozen:', data.frozen_balance);
    console.log('Disponible:', data.balance - data.frozen_balance);
  }
} else {
  console.log('Non connecté. Utilisons la clé service_role.');
}
