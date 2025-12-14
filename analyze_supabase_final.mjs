#!/usr/bin/env node

/**
 * 🎯 ANALYSE FINALE SUPABASE - VERSION CORRIGÉE
 * ==============================================
 * Analyse ultra-détaillée avec les bons noms de colonnes
 */

import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'aws-1-eu-central-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.htfqmamvmhdoixqcbbbw',
  password: 'Workeverytime@4##',
  ssl: { rejectUnauthorized: false }
});

console.log('🎯 ANALYSE FINALE SUPABASE');
console.log('='.repeat(70));
console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
console.log('='.repeat(70));
console.log('');

// ============================================
// 1. USERS DÉTAILLÉS
// ============================================
async function analyzeUsersDetailed() {
  console.log('👥 1. UTILISATEURS DÉTAILLÉS');
  console.log('-'.repeat(70));

  try {
    const query = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.balance,
        u.frozen_balance,
        u.language,
        u.created_at,
        (SELECT COUNT(*) FROM activations WHERE user_id = u.id) as total_activations,
        (SELECT COUNT(*) FROM activations WHERE user_id = u.id AND status = 'completed') as completed_activations,
        (SELECT COUNT(*) FROM rentals WHERE user_id = u.id) as total_rentals,
        (SELECT SUM(amount) FROM transactions WHERE user_id = u.id AND status = 'completed') as total_spent
      FROM users u
      ORDER BY u.balance DESC, u.created_at DESC;
    `;

    const result = await client.query(query);
    
    console.log(`📊 Total utilisateurs: ${result.rows.length}\n`);

    // Stats globales
    let totalBalance = 0;
    let totalFrozen = 0;
    let adminCount = 0;
    let withActivations = 0;

    result.rows.forEach(user => {
      totalBalance += parseFloat(user.balance || 0);
      totalFrozen += parseFloat(user.frozen_balance || 0);
      if (user.role === 'admin') adminCount++;
      if (user.total_activations > 0) withActivations++;
    });

    console.log(`💰 Total balance: ${totalBalance.toLocaleString('fr-FR')} XOF`);
    console.log(`🧊 Total frozen: ${totalFrozen.toLocaleString('fr-FR')} XOF`);
    console.log(`💵 Balance disponible: ${(totalBalance - totalFrozen).toLocaleString('fr-FR')} XOF`);
    console.log(`👑 Admins: ${adminCount}`);
    console.log(`📱 Users avec activations: ${withActivations}`);

    // Top 15 users
    console.log(`\n🏆 Top 15 utilisateurs:\n`);
    result.rows.slice(0, 15).forEach((user, i) => {
      const roleIcon = user.role === 'admin' ? '👑' : '👤';
      const balance = parseFloat(user.balance || 0);
      const frozen = parseFloat(user.frozen_balance || 0);
      const available = balance - frozen;
      
      console.log(`${i + 1}. ${roleIcon} ${user.email}`);
      console.log(`   ├─ Nom: ${user.name || 'N/A'}`);
      console.log(`   ├─ Balance: ${balance.toLocaleString('fr-FR')} XOF (${frozen.toLocaleString('fr-FR')} gelé)`);
      console.log(`   ├─ Disponible: ${available.toLocaleString('fr-FR')} XOF`);
      console.log(`   ├─ Activations: ${user.total_activations} (${user.completed_activations} OK)`);
      console.log(`   ├─ Rentals: ${user.total_rentals}`);
      console.log(`   ├─ Langue: ${user.language}`);
      console.log(`   └─ Inscrit: ${new Date(user.created_at).toLocaleDateString('fr-FR')}`);
    });

    // Users problématiques
    console.log(`\n⚠️  USERS PROBLÉMATIQUES:\n`);
    
    // Frozen > balance
    const frozenIssues = result.rows.filter(u => parseFloat(u.frozen_balance) > parseFloat(u.balance));
    if (frozenIssues.length > 0) {
      console.log(`❌ ${frozenIssues.length} users avec frozen > balance:`);
      frozenIssues.forEach(u => {
        console.log(`   - ${u.email}: balance=${u.balance}, frozen=${u.frozen_balance}`);
      });
    } else {
      console.log(`✅ Pas d'incohérence frozen/balance`);
    }

    // Balance négative
    const negativeBalance = result.rows.filter(u => parseFloat(u.balance) < 0);
    if (negativeBalance.length > 0) {
      console.log(`\n❌ ${negativeBalance.length} users avec balance négative:`);
      negativeBalance.forEach(u => {
        console.log(`   - ${u.email}: ${u.balance} XOF`);
      });
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 2. ACTIVATIONS DÉTAILLÉES
// ============================================
async function analyzeActivationsDetailed() {
  console.log('📱 2. ACTIVATIONS DÉTAILLÉES');
  console.log('-'.repeat(70));

  try {
    // Stats globales
    const statsQuery = `
      SELECT 
        status,
        provider,
        COUNT(*) as count,
        SUM(price) as total_revenue,
        AVG(price) as avg_price,
        SUM(frozen_amount) as total_frozen
      FROM activations
      GROUP BY status, provider
      ORDER BY status, count DESC;
    `;

    const statsResult = await client.query(statsQuery);
    
    console.log('📊 Répartition par statut et provider:\n');
    statsResult.rows.forEach(row => {
      console.log(`${row.status} - ${row.provider}:`);
      console.log(`   ├─ Nombre: ${row.count}`);
      console.log(`   ├─ Revenu: ${parseFloat(row.total_revenue || 0).toLocaleString('fr-FR')} XOF`);
      console.log(`   ├─ Prix moyen: ${parseFloat(row.avg_price || 0).toLocaleString('fr-FR')} XOF`);
      console.log(`   └─ Frozen: ${parseFloat(row.total_frozen || 0).toLocaleString('fr-FR')} XOF`);
    });

    // Top services
    const servicesQuery = `
      SELECT 
        service_code,
        COUNT(*) as count,
        SUM(price) as revenue,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as success_rate
      FROM activations
      GROUP BY service_code
      ORDER BY count DESC
      LIMIT 15;
    `;

    const servicesResult = await client.query(servicesQuery);
    
    console.log('\n🔥 Top 15 services utilisés:\n');
    servicesResult.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.service_code}: ${row.count} activations (${row.success_rate}% succès)`);
      console.log(`   ├─ Revenu: ${parseFloat(row.revenue).toLocaleString('fr-FR')} XOF`);
      console.log(`   └─ Complétées: ${row.completed}/${row.count}`);
    });

    // Top pays
    const countriesQuery = `
      SELECT 
        country_code,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM activations
      GROUP BY country_code
      ORDER BY count DESC
      LIMIT 10;
    `;

    const countriesResult = await client.query(countriesQuery);
    
    console.log('\n🌍 Top 10 pays:\n');
    countriesResult.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.country_code}: ${row.count} activations (${row.completed} complétées)`);
    });

    // Activations avec SMS
    const smsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN sms_code IS NOT NULL THEN 1 END) as with_code,
        ROUND(COUNT(CASE WHEN sms_code IS NOT NULL THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as code_rate
      FROM activations
      WHERE status = 'completed';
    `;

    const smsResult = await client.query(smsQuery);
    
    console.log('\n📨 SMS reçus:\n');
    const sms = smsResult.rows[0];
    console.log(`Total completed: ${sms.total}`);
    console.log(`Avec code: ${sms.with_code}`);
    console.log(`Taux de réception: ${sms.code_rate}%`);

    // Activations problématiques
    console.log('\n⚠️  ACTIVATIONS PROBLÉMATIQUES:\n');
    
    // Charged=false mais completed
    const notChargedQuery = `
      SELECT COUNT(*) as count
      FROM activations
      WHERE status = 'completed' AND charged = false;
    `;
    const notCharged = await client.query(notChargedQuery);
    
    if (notCharged.rows[0].count > 0) {
      console.log(`❌ ${notCharged.rows[0].count} activations completed mais pas charged`);
    } else {
      console.log(`✅ Toutes les activations completed sont charged`);
    }

    // Frozen non relâché pour activations terminées
    const frozenStuckQuery = `
      SELECT COUNT(*) as count, SUM(frozen_amount) as total
      FROM activations
      WHERE status IN ('completed', 'cancelled') AND frozen_amount > 0;
    `;
    const frozenStuck = await client.query(frozenStuckQuery);
    
    if (frozenStuck.rows[0].count > 0) {
      console.log(`⚠️  ${frozenStuck.rows[0].count} activations terminées avec frozen non relâché`);
      console.log(`   Total bloqué: ${parseFloat(frozenStuck.rows[0].total).toLocaleString('fr-FR')} XOF`);
    } else {
      console.log(`✅ Pas de frozen bloqué sur activations terminées`);
    }

    // Activations récentes
    const recentQuery = `
      SELECT 
        a.id,
        a.service_code,
        a.country_code,
        a.status,
        a.price,
        a.frozen_amount,
        a.charged,
        a.created_at,
        u.email
      FROM activations a
      JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT 10;
    `;

    const recentResult = await client.query(recentQuery);
    
    console.log('\n📅 10 dernières activations:\n');
    recentResult.rows.forEach((act, i) => {
      const date = new Date(act.created_at).toLocaleString('fr-FR');
      const chargedIcon = act.charged ? '✅' : '❌';
      console.log(`${i + 1}. ${act.service_code} (${act.country_code}) - ${act.status}`);
      console.log(`   ├─ User: ${act.email}`);
      console.log(`   ├─ Prix: ${parseFloat(act.price || 0).toLocaleString('fr-FR')} XOF`);
      console.log(`   ├─ Frozen: ${parseFloat(act.frozen_amount || 0).toLocaleString('fr-FR')} XOF`);
      console.log(`   ├─ Charged: ${chargedIcon}`);
      console.log(`   └─ Date: ${date}`);
    });

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 3. RENTALS DÉTAILLÉS
// ============================================
async function analyzeRentalsDetailed() {
  console.log('🏠 3. RENTALS DÉTAILLÉS');
  console.log('-'.repeat(70));

  try {
    const query = `
      SELECT 
        r.*,
        u.email as user_email
      FROM rentals r
      JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC;
    `;

    const result = await client.query(query);
    
    console.log(`📊 Total rentals: ${result.rows.length}\n`);

    if (result.rows.length === 0) {
      console.log('ℹ️  Aucun rental trouvé');
    } else {
      // Stats par statut
      const statuses = {};
      let totalRevenue = 0;
      let totalFrozen = 0;

      result.rows.forEach(r => {
        statuses[r.status] = (statuses[r.status] || 0) + 1;
        totalRevenue += parseFloat(r.total_cost || 0);
        totalFrozen += parseFloat(r.frozen_amount || 0);
      });

      console.log('📊 Par statut:');
      Object.entries(statuses).forEach(([status, count]) => {
        console.log(`   ├─ ${status}: ${count}`);
      });

      console.log(`\n💰 Revenu total: ${totalRevenue.toLocaleString('fr-FR')} XOF`);
      console.log(`🧊 Frozen total: ${totalFrozen.toLocaleString('fr-FR')} XOF`);

      // Liste tous les rentals
      console.log('\n📋 Tous les rentals:\n');
      result.rows.forEach((rental, i) => {
        const start = new Date(rental.start_date).toLocaleString('fr-FR');
        const end = new Date(rental.end_date).toLocaleString('fr-FR');
        
        console.log(`${i + 1}. ${rental.service_code || rental.service} (${rental.country_code || rental.country}) - ${rental.status}`);
        console.log(`   ├─ User: ${rental.user_email}`);
        console.log(`   ├─ Phone: ${rental.phone || rental.phone_number}`);
        console.log(`   ├─ Durée: ${rental.rent_hours}h`);
        console.log(`   ├─ Coût: ${parseFloat(rental.total_cost || rental.price || 0).toLocaleString('fr-FR')} XOF`);
        console.log(`   ├─ Frozen: ${parseFloat(rental.frozen_amount || 0).toLocaleString('fr-FR')} XOF`);
        console.log(`   ├─ Messages: ${rental.message_count || 0}`);
        console.log(`   ├─ Début: ${start}`);
        console.log(`   └─ Fin: ${end}`);
      });

      // Rentals expirés non traités
      const expiredQuery = `
        SELECT COUNT(*) as count
        FROM rentals
        WHERE status = 'active' AND expires_at < NOW();
      `;
      const expired = await client.query(expiredQuery);
      
      if (expired.rows[0].count > 0) {
        console.log(`\n⚠️  ${expired.rows[0].count} rentals expirés non traités`);
      }
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 4. TRANSACTIONS
// ============================================
async function analyzeTransactions() {
  console.log('💳 4. TRANSACTIONS');
  console.log('-'.repeat(70));

  try {
    const statsQuery = `
      SELECT 
        type,
        status,
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total
      FROM transactions
      GROUP BY type, status, payment_method
      ORDER BY type, status, count DESC;
    `;

    const result = await client.query(statsQuery);
    
    console.log('📊 Répartition:\n');
    result.rows.forEach(row => {
      console.log(`${row.type} - ${row.status} (${row.payment_method || 'N/A'}):`);
      console.log(`   ├─ Nombre: ${row.count}`);
      console.log(`   └─ Total: ${parseFloat(row.total || 0).toLocaleString('fr-FR')} XOF`);
    });

    // Total revenus
    const revenueQuery = `
      SELECT 
        SUM(CASE WHEN type = 'payment' AND status = 'completed' THEN amount ELSE 0 END) as payments,
        SUM(CASE WHEN type = 'refund' AND status = 'completed' THEN amount ELSE 0 END) as refunds
      FROM transactions;
    `;

    const revenue = await client.query(revenueQuery);
    const payments = parseFloat(revenue.rows[0].payments || 0);
    const refunds = parseFloat(revenue.rows[0].refunds || 0);
    
    console.log(`\n💰 REVENUS:`);
    console.log(`   ├─ Paiements: ${payments.toLocaleString('fr-FR')} XOF`);
    console.log(`   ├─ Remboursements: ${refunds.toLocaleString('fr-FR')} XOF`);
    console.log(`   └─ Net: ${(payments - refunds).toLocaleString('fr-FR')} XOF`);

    // Dernières transactions
    const recentQuery = `
      SELECT 
        t.*,
        u.email
      FROM transactions t
      JOIN users u ON u.id = t.user_id
      ORDER BY t.created_at DESC
      LIMIT 10;
    `;

    const recent = await client.query(recentQuery);
    
    console.log('\n📅 10 dernières transactions:\n');
    recent.rows.forEach((tx, i) => {
      const date = new Date(tx.created_at).toLocaleString('fr-FR');
      console.log(`${i + 1}. ${tx.type} - ${tx.status}`);
      console.log(`   ├─ User: ${tx.email}`);
      console.log(`   ├─ Montant: ${parseFloat(tx.amount).toLocaleString('fr-FR')} XOF`);
      console.log(`   ├─ Méthode: ${tx.payment_method || 'N/A'}`);
      console.log(`   └─ Date: ${date}`);
    });

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 5. BALANCE OPERATIONS
// ============================================
async function analyzeBalanceOperations() {
  console.log('💼 5. BALANCE OPERATIONS');
  console.log('-'.repeat(70));

  try {
    const statsQuery = `
      SELECT 
        operation_type,
        status,
        COUNT(*) as count,
        SUM(amount) as total
      FROM balance_operations
      GROUP BY operation_type, status
      ORDER BY operation_type, status;
    `;

    const result = await client.query(statsQuery);
    
    console.log('📊 Répartition:\n');
    result.rows.forEach(row => {
      console.log(`${row.operation_type} - ${row.status}:`);
      console.log(`   ├─ Nombre: ${row.count}`);
      console.log(`   └─ Total: ${parseFloat(row.total || 0).toLocaleString('fr-FR')} XOF`);
    });

    // Opérations récentes
    const recentQuery = `
      SELECT 
        bo.*,
        u.email
      FROM balance_operations bo
      JOIN users u ON u.id = bo.user_id
      ORDER BY bo.created_at DESC
      LIMIT 10;
    `;

    const recent = await client.query(recentQuery);
    
    console.log('\n📅 10 dernières opérations:\n');
    recent.rows.forEach((op, i) => {
      const date = new Date(op.created_at).toLocaleString('fr-FR');
      console.log(`${i + 1}. ${op.operation_type} - ${op.status}`);
      console.log(`   ├─ User: ${op.email}`);
      console.log(`   ├─ Montant: ${parseFloat(op.amount).toLocaleString('fr-FR')} XOF`);
      console.log(`   ├─ Balance avant: ${parseFloat(op.balance_before || 0).toLocaleString('fr-FR')} XOF`);
      console.log(`   ├─ Balance après: ${parseFloat(op.balance_after || 0).toLocaleString('fr-FR')} XOF`);
      console.log(`   └─ Date: ${date}`);
    });

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 6. SERVICES & COUNTRIES
// ============================================
async function analyzeServicesCountries() {
  console.log('🎯 6. SERVICES & PAYS');
  console.log('-'.repeat(70));

  try {
    // Services actifs
    const servicesQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN active = true THEN 1 END) as active_count
      FROM services;
    `;

    const services = await client.query(servicesQuery);
    console.log(`🎯 Services: ${services.rows[0].total} (${services.rows[0].active_count} actifs)`);

    // Countries actifs
    const countriesQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN active = true THEN 1 END) as active_count
      FROM countries;
    `;

    const countries = await client.query(countriesQuery);
    console.log(`🌍 Pays: ${countries.rows[0].total} (${countries.rows[0].active_count} actifs)`);

    // Service icons
    const iconsQuery = `SELECT COUNT(*) as count FROM service_icons;`;
    const icons = await client.query(iconsQuery);
    console.log(`🎨 Icons: ${icons.rows[0].count}`);

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// EXÉCUTION PRINCIPALE
// ============================================
async function main() {
  try {
    console.log('🔌 Connexion...\n');
    await client.connect();
    console.log('✅ Connecté !\n');

    await analyzeUsersDetailed();
    await analyzeActivationsDetailed();
    await analyzeRentalsDetailed();
    await analyzeTransactions();
    await analyzeBalanceOperations();
    await analyzeServicesCountries();

    console.log('='.repeat(70));
    console.log('✅ ANALYSE TERMINÉE');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
  } finally {
    await client.end();
  }
}

main();
