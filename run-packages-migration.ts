import { supabase } from './lib/supabase';

async function runMigration() {
  console.log('🚀 Exécution de la migration des packages...');

  try {
    // Créer la table activation_packages
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS public.activation_packages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        activations INTEGER NOT NULL,
        price_xof DECIMAL(10, 2) NOT NULL,
        price_eur DECIMAL(10, 2) NOT NULL,
        price_usd DECIMAL(10, 2) NOT NULL,
        is_popular BOOLEAN DEFAULT false,
        savings_percentage INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(activations)
      );
    `;

    console.log('Création de la table...');
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTableQuery });
    if (tableError) console.error('Erreur table:', tableError);
    else console.log('✅ Table créée');

    // Insérer les données par défaut
    console.log('Insertion des packages par défaut...');
    const { error: insertError } = await supabase.from('activation_packages').insert([
      { activations: 5, price_xof: 2000, price_eur: 2.99, price_usd: 3.29, is_popular: false, savings_percentage: 0, display_order: 1 },
      { activations: 10, price_xof: 3500, price_eur: 4.99, price_usd: 5.49, is_popular: true, savings_percentage: 10, display_order: 2 },
      { activations: 20, price_xof: 6000, price_eur: 8.99, price_usd: 9.89, is_popular: false, savings_percentage: 15, display_order: 3 },
      { activations: 50, price_xof: 13000, price_eur: 19.99, price_usd: 21.99, is_popular: false, savings_percentage: 20, display_order: 4 },
      { activations: 100, price_xof: 23000, price_eur: 34.99, price_usd: 38.49, is_popular: false, savings_percentage: 25, display_order: 5 },
      { activations: 200, price_xof: 40000, price_eur: 59.99, price_usd: 65.99, is_popular: false, savings_percentage: 30, display_order: 6 },
    ]);

    if (insertError) {
      console.error('Erreur insertion:', insertError);
    } else {
      console.log('✅ Packages insérés avec succès!');
    }

    console.log('\n🎉 Migration terminée!');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  }
}

runMigration();
