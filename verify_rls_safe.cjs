/**
 * Script de vérification de sécurité pour fix_rls_cloud_safe.sql
 * Analyse si le script est vraiment safe
 */

const fs = require('fs');

const sqlContent = fs.readFileSync('./fix_rls_cloud_safe.sql', 'utf8');

console.log('🔍 ANALYSE DE SÉCURITÉ: fix_rls_cloud_safe.sql\n');

const issues = [];
const warnings = [];
const safe = [];

// 1. Vérifier qu'on NE supprime PAS les views admin
const dangerousDrops = [
  'DROP VIEW.*v_dashboard_stats',
  'DROP VIEW.*v_frozen_discrepancies',
  'DROP VIEW.*v_service_health',
  'DROP VIEW.*v_frozen_balance_health',
  'DROP VIEW.*activation_stats',
  'DROP VIEW.*v_provider_stats',
  'DROP VIEW.*v_country_health'
];

console.log('1️⃣ VÉRIFICATION: Views Admin (NE DOIVENT PAS être supprimées)\n');
let hasAdminViewDrops = false;
dangerousDrops.forEach(pattern => {
  const regex = new RegExp(pattern, 'gi');
  if (regex.test(sqlContent)) {
    issues.push(`❌ DANGER: Script supprime une view admin: ${pattern}`);
    hasAdminViewDrops = true;
  }
});

if (!hasAdminViewDrops) {
  safe.push('✅ SAFE: Aucune view admin supprimée');
  console.log('✅ SAFE: Aucune view admin supprimée\n');
} else {
  console.log('❌ DANGER: Des views admin sont supprimées!\n');
}

// 2. Vérifier qu'on active bien RLS sur les tables
console.log('2️⃣ VÉRIFICATION: Activation RLS sur tables\n');
const requiredTables = [
  'activations',
  'rental_logs',
  'balance_operations',
  'pricing_rules_archive',
  'email_campaigns',
  'email_logs'
];

const enabledRLS = requiredTables.filter(table => {
  const regex = new RegExp(`ALTER TABLE.*${table}.*ENABLE ROW LEVEL SECURITY`, 'i');
  return regex.test(sqlContent);
});

console.log(`RLS activé sur: ${enabledRLS.join(', ')}`);
if (enabledRLS.length === requiredTables.length) {
  safe.push(`✅ SAFE: RLS activé sur ${enabledRLS.length}/6 tables`);
  console.log(`✅ SAFE: ${enabledRLS.length}/6 tables\n`);
} else {
  const missing = requiredTables.filter(t => !enabledRLS.includes(t));
  warnings.push(`⚠️  ATTENTION: RLS manquant sur ${missing.join(', ')}`);
  console.log(`⚠️  ATTENTION: Manque ${missing.join(', ')}\n`);
}

// 3. Vérifier les policies
console.log('3️⃣ VÉRIFICATION: Policies RLS\n');
const policyCount = (sqlContent.match(/CREATE POLICY/gi) || []).length;
console.log(`Policies créées: ${policyCount}`);

if (policyCount >= 12) { // 2 par table minimum
  safe.push(`✅ SAFE: ${policyCount} policies créées`);
  console.log(`✅ SAFE: ${policyCount} policies (attendu >= 12)\n`);
} else {
  warnings.push(`⚠️  ATTENTION: Seulement ${policyCount} policies (attendu >= 12)`);
  console.log(`⚠️  ATTENTION: Seulement ${policyCount} policies\n`);
}

// 4. Vérifier qu'on convertit SEULEMENT available_services
console.log('4️⃣ VÉRIFICATION: Conversion SECURITY INVOKER\n');
const securityInvokerViews = (sqlContent.match(/WITH \(security_invoker = true\)/gi) || []).length;
console.log(`Views converties en SECURITY INVOKER: ${securityInvokerViews}`);

if (securityInvokerViews === 1) {
  const hasAvailableServices = /available_services.*WITH \(security_invoker = true\)/si.test(sqlContent);
  if (hasAvailableServices) {
    safe.push('✅ SAFE: Seule available_services convertie (public view, OK)');
    console.log('✅ SAFE: Seule available_services convertie\n');
  } else {
    warnings.push('⚠️  ATTENTION: Une autre view a été convertie');
    console.log('⚠️  ATTENTION: View convertie n\'est pas available_services\n');
  }
} else if (securityInvokerViews > 1) {
  issues.push(`❌ DANGER: ${securityInvokerViews} views converties (dashboard admin va casser!)`);
  console.log(`❌ DANGER: ${securityInvokerViews} views converties!\n`);
} else {
  warnings.push('⚠️  ATTENTION: Aucune view convertie');
  console.log('⚠️  ATTENTION: Aucune conversion\n');
}

// 5. Vérifier la vérification atomic_*
console.log('5️⃣ VÉRIFICATION: Fonctions atomic_*\n');
const hasAtomicCheck = /proname LIKE 'atomic_%'/i.test(sqlContent);
const hasProsecdefCheck = /prosecdef/i.test(sqlContent);

if (hasAtomicCheck && hasProsecdefCheck) {
  safe.push('✅ SAFE: Vérification atomic_* présente');
  console.log('✅ SAFE: Script vérifie SECURITY DEFINER sur atomic_*\n');
} else {
  warnings.push('⚠️  ATTENTION: Pas de vérification atomic_*');
  console.log('⚠️  ATTENTION: Pas de vérification des fonctions\n');
}

// 6. Vérifier les transactions
console.log('6️⃣ VÉRIFICATION: Gestion des transactions\n');
const hasBegin = /BEGIN;/i.test(sqlContent);
const hasCommit = /COMMIT;/i.test(sqlContent);

if (hasBegin && hasCommit) {
  safe.push('✅ SAFE: Transaction BEGIN/COMMIT présente');
  console.log('✅ SAFE: BEGIN/COMMIT présents (atomic)\n');
} else {
  warnings.push('⚠️  ATTENTION: Pas de transaction');
  console.log('⚠️  ATTENTION: Pas de BEGIN/COMMIT\n');
}

// 7. Vérifier les commentaires de sécurité
console.log('7️⃣ VÉRIFICATION: Documentation\n');
const hasWarnings = /⚠️/.test(sqlContent);
const hasEdgeFunctionNotes = /Edge Functions/i.test(sqlContent);
const hasSecurityDefinerNotes = /SECURITY DEFINER/i.test(sqlContent);

if (hasWarnings && hasEdgeFunctionNotes && hasSecurityDefinerNotes) {
  safe.push('✅ SAFE: Documentation complète présente');
  console.log('✅ SAFE: Warnings et documentation présents\n');
} else {
  warnings.push('⚠️  ATTENTION: Documentation incomplète');
  console.log('⚠️  ATTENTION: Documentation pourrait être améliorée\n');
}

// 8. Vérifier qu'on ne DROP pas de fonctions
console.log('8️⃣ VÉRIFICATION: Fonctions SQL\n');
const dropsFunctions = (sqlContent.match(/DROP FUNCTION/gi) || []).length;

if (dropsFunctions === 0) {
  safe.push('✅ SAFE: Aucune fonction supprimée');
  console.log('✅ SAFE: Aucune fonction SQL supprimée\n');
} else {
  issues.push(`❌ DANGER: ${dropsFunctions} fonctions supprimées`);
  console.log(`❌ DANGER: ${dropsFunctions} fonctions supprimées\n`);
}

// 9. Vérifier les service_role policies
console.log('9️⃣ VÉRIFICATION: Service Role Policies\n');
const serviceRolePolicies = (sqlContent.match(/TO service_role/gi) || []).length;

if (serviceRolePolicies >= 6) { // Au moins 1 par table
  safe.push(`✅ SAFE: ${serviceRolePolicies} policies service_role`);
  console.log(`✅ SAFE: ${serviceRolePolicies} policies service_role\n`);
} else {
  warnings.push(`⚠️  ATTENTION: Seulement ${serviceRolePolicies} policies service_role`);
  console.log(`⚠️  ATTENTION: ${serviceRolePolicies} policies service_role (attendu >= 6)\n`);
}

// 10. Vérifier les requêtes de vérification finale
console.log('🔟 VÉRIFICATION: Requêtes de validation\n');
const hasVerificationQueries = /-- Vérifier RLS activé/i.test(sqlContent);
const hasPolicyCheck = /FROM pg_policies/i.test(sqlContent);

if (hasVerificationQueries && hasPolicyCheck) {
  safe.push('✅ SAFE: Requêtes de vérification incluses');
  console.log('✅ SAFE: Requêtes de vérification incluses\n');
} else {
  warnings.push('⚠️  ATTENTION: Pas de requêtes de vérification');
  console.log('⚠️  ATTENTION: Pas de requêtes de vérification\n');
}

// Résumé final
console.log('\n' + '='.repeat(70));
console.log('📊 RÉSUMÉ DE L\'ANALYSE');
console.log('='.repeat(70) + '\n');

console.log(`✅ POINTS SÛRS: ${safe.length}`);
safe.forEach(s => console.log(`   ${s}`));
console.log('');

if (warnings.length > 0) {
  console.log(`⚠️  AVERTISSEMENTS: ${warnings.length}`);
  warnings.forEach(w => console.log(`   ${w}`));
  console.log('');
}

if (issues.length > 0) {
  console.log(`❌ PROBLÈMES CRITIQUES: ${issues.length}`);
  issues.forEach(i => console.log(`   ${i}`));
  console.log('');
}

// Verdict final
console.log('='.repeat(70));
if (issues.length === 0) {
  if (warnings.length === 0) {
    console.log('✅ VERDICT: SCRIPT 100% SAFE - AUCUN PROBLÈME DÉTECTÉ');
  } else {
    console.log('✅ VERDICT: SCRIPT SAFE - Warnings mineurs seulement');
  }
  console.log('='.repeat(70));
  console.log('\n💡 RECOMMANDATION: Vous pouvez appliquer ce script en production.\n');
} else {
  console.log('❌ VERDICT: SCRIPT DANGEREUX - NE PAS APPLIQUER');
  console.log('='.repeat(70));
  console.log('\n🚨 RECOMMANDATION: Corriger les problèmes critiques avant application!\n');
}

// Export JSON
const report = {
  timestamp: new Date().toISOString(),
  file: 'fix_rls_cloud_safe.sql',
  safe: safe,
  warnings: warnings,
  issues: issues,
  verdict: issues.length === 0 ? 'SAFE' : 'DANGEROUS',
  recommendation: issues.length === 0 ? 'Can apply' : 'DO NOT APPLY'
};

fs.writeFileSync('./rls_safety_report.json', JSON.stringify(report, null, 2));
console.log('📄 Rapport détaillé exporté: rls_safety_report.json\n');
