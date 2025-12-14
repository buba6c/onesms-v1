import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debug() {
  // Récupérer TOUS les utilisateurs pour voir leurs soldes
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance')
    .order('balance', { ascending: false });

  if (error) {
    console.log('Erreur users:', error.message);
  } else {
    console.log('=== TOUS LES UTILISATEURS ===');
    users?.forEach(u => {
      const dispo = u.balance - (u.frozen_balance || 0);
      console.log(`${u.email}: Balance=${u.balance}, Frozen=${u.frozen_balance || 0}, Dispo=${dispo}`);
    });
  }

  // Vérifier les activations en cours (status pending/waiting)
  const { data: activations, error: actError } = await supabase
    .from('activations')
    .select('id, phone, status, price, created_at, user_id')
    .in('status', ['pending', 'waiting', 'active'])
    .order('created_at', { ascending: false })
    .limit(20);

  if (actError) {
    console.log('\nErreur activations:', actError.message);
  } else {
    console.log('\n=== ACTIVATIONS EN COURS (pending/waiting/active) ===');
    activations?.forEach(a => {
      console.log(`ID: ${a.id}, Phone: ${a.phone}, Status: ${a.status}, Price: ${a.price}, User: ${a.user_id}`);
    });
    if (!activations?.length) {
      console.log('Aucune activation en cours');
    }
  }

  // Vérifier les rentals en cours
  const { data: rentals, error: rentError } = await supabase
    .from('rentals')
    .select('id, phone, status, price, created_at, user_id')
    .in('status', ['pending', 'waiting', 'active'])
    .order('created_at', { ascending: false })
    .limit(20);

  if (rentError) {
    console.log('\nErreur rentals:', rentError.message);
  } else {
    console.log('\n=== RENTALS EN COURS (pending/waiting/active) ===');
    rentals?.forEach(r => {
      console.log(`ID: ${r.id}, Phone: ${r.phone}, Status: ${r.status}, Price: ${r.price}, User: ${r.user_id}`);
    });
    if (!rentals?.length) {
      console.log('Aucun rental en cours');
    }
  }

  // Vérifier les transactions pending
  const { data: txs, error: txError } = await supabase
    .from('transactions')
    .select('id, type, amount, status, created_at, user_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  if (txError) {
    console.log('\nErreur transactions:', txError.message);
  } else {
    console.log('\n=== TRANSACTIONS PENDING ===');
    txs?.forEach(t => {
      console.log(`ID: ${t.id}, Type: ${t.type}, Amount: ${t.amount}, User: ${t.user_id}`);
    });
    if (!txs?.length) {
      console.log('Aucune transaction pending');
    }
  }
}

debug().catch(console.error);
