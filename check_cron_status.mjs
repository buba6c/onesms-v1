import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkCronStatus() {
    console.log('='.repeat(80));
    console.log('🔍 VÉRIFICATION DES CRON JOBS');
    console.log('='.repeat(80));
    
    // 1. Vérifier si pg_cron est activé
    console.log('\n' + '─'.repeat(80));
    console.log('📋 1. LISTE DES CRON JOBS (via RPC)');
    console.log('─'.repeat(80));
    
    try {
        const { data, error } = await supabase.rpc('get_cron_jobs');
        if (error) {
            console.log('  ❌ Erreur:', error.message);
            console.log('  → La fonction RPC get_cron_jobs n\'existe peut-être pas');
        } else if (data) {
            console.log('  ✅ Cron jobs trouvés:', data);
        }
    } catch (e) {
        console.log('  ⚠️ Impossible de récupérer les cron jobs');
    }
    
    // 2. Vérifier directement avec SQL
    console.log('\n' + '─'.repeat(80));
    console.log('📋 2. VÉRIFICATION DIRECTE');
    console.log('─'.repeat(80));
    
    // Query les activations récentes pour voir leurs status
    const { data: recentActivations } = await supabase
        .from('activations')
        .select('id, status, frozen_amount, expires_at, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(5);
    
    console.log('\n  Dernières activations:');
    recentActivations?.forEach((act, i) => {
        const isExpired = new Date(act.expires_at) < new Date();
        console.log(`\n  ${i + 1}. ID: ${act.id.substring(0, 8)}...`);
        console.log(`     Status: ${act.status}`);
        console.log(`     Frozen: ${act.frozen_amount}`);
        console.log(`     Expiré: ${isExpired ? '✅ Oui' : '❌ Non'}`);
        console.log(`     Expires: ${act.expires_at}`);
    });
    
    // 3. Compter les activations par status
    console.log('\n' + '─'.repeat(80));
    console.log('📊 3. STATISTIQUES DES ACTIVATIONS');
    console.log('─'.repeat(80));
    
    const statuses = ['pending', 'waiting', 'received', 'timeout', 'cancelled', 'refunded', 'expired'];
    for (const status of statuses) {
        const { count } = await supabase
            .from('activations')
            .select('*', { count: 'exact', head: true })
            .eq('status', status);
        
        console.log(`  - ${status}: ${count || 0}`);
    }
    
    // 4. Vérifier les activations expirées non traitées
    console.log('\n' + '─'.repeat(80));
    console.log('⚠️ 4. ACTIVATIONS EXPIRÉES NON REMBOURSÉES');
    console.log('─'.repeat(80));
    
    const { data: problematic } = await supabase
        .from('activations')
        .select('*')
        .lt('expires_at', new Date().toISOString())
        .gt('frozen_amount', 0);
    
    if (problematic && problematic.length > 0) {
        console.log(`\n  🚨 ${problematic.length} activation(s) expirée(s) avec frozen_amount > 0!`);
        problematic.forEach((act, i) => {
            console.log(`\n  ${i + 1}. ${act.service_code} - ${act.phone || 'N/A'}`);
            console.log(`     Status: ${act.status}`);
            console.log(`     Frozen: ${act.frozen_amount} FCFA`);
            console.log(`     User: ${act.user_id}`);
        });
    } else {
        console.log('\n  ✅ Aucune activation expirée avec fonds bloqués');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DIAGNOSTIC FINAL');
    console.log('='.repeat(80));
    
    console.log('\n  Le problème est probablement:');
    console.log('  1. ❌ Le cron job cleanup-expired-activations n\'est pas actif');
    console.log('  2. ❌ Ou il cherche status="pending" mais le frontend met "timeout"');
    console.log('  3. ❌ Ou frozen_amount est déjà à 0 au moment du cleanup');
    
    console.log('\n' + '='.repeat(80));
}

checkCronStatus().catch(console.error);
