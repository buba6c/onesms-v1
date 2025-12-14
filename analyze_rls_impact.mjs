#!/usr/bin/env node

/**
 * ANALYSE D'IMPACT DES CHANGEMENTS RLS SUR LES FONCTIONNALITÉS
 * 
 * Vérifie si les modifications RLS vont casser certaines fonctionnalités
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 ANALYSE D\'IMPACT RLS SUR LES FONCTIONNALITÉS\n');
console.log('='.repeat(80));

const analysis = {
  timestamp: new Date().toISOString(),
  tables_affected: [],
  views_affected: [],
  potential_issues: [],
  edge_functions_impact: [],
  frontend_impact: [],
  recommendations: []
};

// ============================================================================
// 1. ANALYSE DES TABLES ET LEURS USAGES
// ============================================================================
console.log('\n📊 1. ANALYSE DES TABLES AFFECTÉES PAR RLS\n');

const tablesAnalysis = [
  {
    table: 'activations',
    rls_change: 'RLS activé (policies existaient déjà)',
    current_policies: [
      'Admins can read all activations',
      'Users can read own activations',
      'Users insert own activations',
      'Service role can manage activations'
    ],
    usage: [
      'Création d\'activation (buy-sms-activate-number)',
      'Vérification status (check-sms-activate-status)',
      'Dashboard utilisateur',
      'Page d\'historique',
      'Stats admin'
    ],
    impact: '🟢 AUCUN - Policies déjà en place',
    risk: 'LOW'
  },
  {
    table: 'rental_logs',
    rls_change: 'RLS activé + nouvelles policies',
    new_policies: [
      'Users can read own rental logs',
      'Service role full access rental logs'
    ],
    usage: [
      'Location de numéros (rent functions)',
      'Historique locations',
      'Calcul frozen_balance',
      'Vérification status rent',
      'Cron jobs (check expirations)'
    ],
    impact: '🟡 MOYEN - Edge Functions doivent utiliser service_role',
    risk: 'MEDIUM',
    potential_break: [
      'Si Edge Functions utilisent anon key au lieu de service_role',
      'Si cron jobs n\'ont pas les bonnes permissions'
    ]
  },
  {
    table: 'balance_operations',
    rls_change: 'RLS activé + nouvelles policies',
    new_policies: [
      'Users can read own balance operations',
      'Service role full access balance operations'
    ],
    usage: [
      'Ajout/retrait de balance',
      'Historique transactions',
      'Dashboard wallet',
      'Vérifications comptables',
      'Atomic operations (freeze/unfreeze)'
    ],
    impact: '🔴 ÉLEVÉ - Opérations critiques du wallet',
    risk: 'HIGH',
    potential_break: [
      'atomic_freeze_balance() si pas SECURITY DEFINER',
      'atomic_unfreeze_balance() si pas SECURITY DEFINER',
      'atomic_commit() et atomic_refund()',
      'Paiements (PayDunya, MoneyFusion, etc.)'
    ]
  },
  {
    table: 'pricing_rules_archive',
    rls_change: 'RLS activé + lecture publique',
    new_policies: [
      'Public read pricing rules',
      'Service role full access pricing'
    ],
    usage: [
      'Affichage des prix',
      'Calcul du coût',
      'Page services',
      'Validation prix avant achat'
    ],
    impact: '🟢 AUCUN - Lecture publique autorisée',
    risk: 'LOW'
  },
  {
    table: 'email_campaigns',
    rls_change: 'RLS activé + accès admin seulement',
    new_policies: [
      'Admins can manage email campaigns',
      'Service role full access campaigns'
    ],
    usage: [
      'Panel admin - gestion campagnes',
      'Envoi d\'emails marketing'
    ],
    impact: '🟢 AUCUN - Uniquement pour admins',
    risk: 'LOW'
  },
  {
    table: 'email_logs',
    rls_change: 'RLS activé + accès admin seulement',
    new_policies: [
      'Admins can read email logs',
      'Service role full access email logs'
    ],
    usage: [
      'Panel admin - logs emails',
      'Debugging envois emails'
    ],
    impact: '🟢 AUCUN - Uniquement pour admins',
    risk: 'LOW'
  }
];

tablesAnalysis.forEach(t => {
  console.log(`\n📋 Table: ${t.table}`);
  console.log(`   Changement: ${t.rls_change}`);
  console.log(`   Impact: ${t.impact}`);
  console.log(`   Risque: ${t.risk}`);
  
  if (t.potential_break) {
    console.log(`\n   ⚠️  Peut casser:`);
    t.potential_break.forEach(issue => console.log(`      - ${issue}`));
  }
  
  analysis.tables_affected.push(t);
});

// ============================================================================
// 2. ANALYSE DES VIEWS SECURITY DEFINER → SECURITY INVOKER
// ============================================================================
console.log('\n\n📊 2. ANALYSE DES VIEWS (SECURITY DEFINER → INVOKER)\n');

const viewsAnalysis = [
  {
    view: 'activation_stats',
    usage: 'Dashboard stats globales',
    impact: '🔴 ÉLEVÉ - Peut devenir vide si user non admin',
    fix_needed: 'OUI - Garder SECURITY DEFINER ou créer fonction',
    recommendation: 'Créer fonction get_activation_stats() avec SECURITY DEFINER'
  },
  {
    view: 'v_frozen_discrepancies',
    usage: 'Admin panel - vérification frozen_balance',
    impact: '🔴 ÉLEVÉ - Admins ne verront plus les users',
    fix_needed: 'OUI - Doit rester SECURITY DEFINER',
    recommendation: 'Garder SECURITY DEFINER + ajouter check admin'
  },
  {
    view: 'v_service_health',
    usage: 'Admin monitoring - santé des services',
    impact: '🔴 ÉLEVÉ - Admins perdent visibilité',
    fix_needed: 'OUI - Doit rester SECURITY DEFINER',
    recommendation: 'Garder SECURITY DEFINER + check admin'
  },
  {
    view: 'v_frozen_balance_health',
    usage: 'Admin - vérification comptable',
    impact: '🔴 ÉLEVÉ - Critique pour comptabilité',
    fix_needed: 'OUI - Doit rester SECURITY DEFINER',
    recommendation: 'Garder SECURITY DEFINER'
  },
  {
    view: 'v_dashboard_stats',
    usage: 'Dashboard principal admin',
    impact: '🔴 CRITIQUE - Dashboard admin cassé',
    fix_needed: 'OUI - ABSOLUMENT NÉCESSAIRE',
    recommendation: 'Garder SECURITY DEFINER + check admin strict'
  },
  {
    view: 'available_services',
    usage: 'Liste services disponibles (public)',
    impact: '🟢 AUCUN - Accès public OK',
    fix_needed: 'NON',
    recommendation: 'SECURITY INVOKER acceptable'
  }
];

viewsAnalysis.forEach(v => {
  console.log(`\n📊 View: ${v.view}`);
  console.log(`   Usage: ${v.usage}`);
  console.log(`   Impact: ${v.impact}`);
  console.log(`   Fix needed: ${v.fix_needed}`);
  console.log(`   ✅ ${v.recommendation}`);
  
  analysis.views_affected.push(v);
});

// ============================================================================
// 3. ANALYSE DES EDGE FUNCTIONS
// ============================================================================
console.log('\n\n⚡ 3. ANALYSE DE L\'IMPACT SUR LES EDGE FUNCTIONS\n');

const edgeFunctionsImpact = [
  {
    function: 'buy-sms-activate-number',
    tables_used: ['activations', 'balance_operations', 'users'],
    current_key: 'service_role (supposé)',
    impact: '🟡 MOYEN',
    will_break: false,
    reason: 'Si utilise service_role key, OK. Si anon key, va casser.',
    fix: 'Vérifier que SUPABASE_SERVICE_ROLE_KEY est utilisé'
  },
  {
    function: 'check-sms-activate-status',
    tables_used: ['activations'],
    current_key: 'service_role (supposé)',
    impact: '🟢 FAIBLE',
    will_break: false,
    reason: 'Lecture des activations avec policies existantes'
  },
  {
    function: 'paydunya-webhook / moneyfusion-webhook',
    tables_used: ['balance_operations', 'users', 'transactions'],
    current_key: 'service_role',
    impact: '🔴 ÉLEVÉ',
    will_break: true,
    reason: 'Webhooks externes DOIVENT utiliser service_role pour écrire dans balance_operations',
    fix: 'CRITIQUE - Vérifier service_role key dans tous les webhooks'
  },
  {
    function: 'get-rent-status / set-rent-status',
    tables_used: ['rental_logs', 'activations', 'users'],
    current_key: 'service_role (supposé)',
    impact: '🔴 ÉLEVÉ',
    will_break: true,
    reason: 'Doit lire/écrire rental_logs de tous les users',
    fix: 'CRITIQUE - Utiliser service_role key'
  },
  {
    function: 'cron-atomic-reliable / cron-check-pending-sms',
    tables_used: ['activations', 'rental_logs', 'balance_operations'],
    current_key: 'service_role',
    impact: '🔴 CRITIQUE',
    will_break: true,
    reason: 'Cron jobs doivent accéder à toutes les données',
    fix: 'CRITIQUE - Vérifier Authorization header avec service_role'
  }
];

edgeFunctionsImpact.forEach(f => {
  console.log(`\n⚡ ${f.function}`);
  console.log(`   Tables: ${f.tables_used.join(', ')}`);
  console.log(`   Impact: ${f.impact}`);
  console.log(`   Va casser: ${f.will_break ? '❌ OUI' : '✅ NON'}`);
  console.log(`   Raison: ${f.reason}`);
  if (f.fix) {
    console.log(`   🔧 Fix: ${f.fix}`);
  }
  
  analysis.edge_functions_impact.push(f);
});

// ============================================================================
// 4. ANALYSE DES FONCTIONS SQL CRITIQUES
// ============================================================================
console.log('\n\n🔧 4. ANALYSE DES FONCTIONS SQL CRITIQUES\n');

const sqlFunctions = [
  {
    function: 'atomic_freeze_balance()',
    tables: ['users', 'balance_operations'],
    security: 'DOIT ÊTRE SECURITY DEFINER',
    impact: '🔴 CRITIQUE',
    will_break: true,
    reason: 'Doit bypass RLS pour freeze/unfreeze balance',
    fix: 'Vérifier que SECURITY DEFINER est présent'
  },
  {
    function: 'atomic_unfreeze_balance()',
    tables: ['users', 'balance_operations'],
    security: 'DOIT ÊTRE SECURITY DEFINER',
    impact: '🔴 CRITIQUE',
    will_break: true,
    reason: 'Doit bypass RLS pour operations atomiques',
    fix: 'Vérifier SECURITY DEFINER'
  },
  {
    function: 'atomic_commit() / atomic_refund()',
    tables: ['users', 'balance_operations', 'activations'],
    security: 'DOIT ÊTRE SECURITY DEFINER',
    impact: '🔴 CRITIQUE',
    will_break: true,
    reason: 'Opérations atomiques critiques pour wallet',
    fix: 'Vérifier SECURITY DEFINER sur toutes les fonctions atomic_*'
  },
  {
    function: 'process_expired_activations()',
    tables: ['activations', 'users', 'balance_operations'],
    security: 'DOIT ÊTRE SECURITY DEFINER',
    impact: '🔴 CRITIQUE',
    will_break: true,
    reason: 'Cron job traite toutes les activations expirées',
    fix: 'Vérifier SECURITY DEFINER'
  }
];

sqlFunctions.forEach(f => {
  console.log(`\n🔧 ${f.function}`);
  console.log(`   Security: ${f.security}`);
  console.log(`   Impact: ${f.impact}`);
  console.log(`   Va casser: ${f.will_break ? '❌ OUI' : '✅ NON'}`);
  console.log(`   🔧 Fix: ${f.fix}`);
});

// ============================================================================
// 5. ANALYSE DE L'IMPACT FRONTEND
// ============================================================================
console.log('\n\n💻 5. ANALYSE DE L\'IMPACT FRONTEND\n');

const frontendImpact = [
  {
    page: 'Dashboard User',
    queries: ['activations', 'balance_operations', 'rental_logs'],
    impact: '🟡 MOYEN',
    will_break: false,
    reason: 'Users verront uniquement leurs données (OK)',
    user_experience: 'Inchangé'
  },
  {
    page: 'Services / Buy SMS',
    queries: ['services', 'pricing_rules_archive', 'countries'],
    impact: '🟢 AUCUN',
    will_break: false,
    reason: 'Lecture publique autorisée',
    user_experience: 'Inchangé'
  },
  {
    page: 'Admin Dashboard',
    queries: ['v_dashboard_stats', 'v_service_health', 'all tables'],
    impact: '🔴 CRITIQUE',
    will_break: true,
    reason: 'Views SECURITY INVOKER ne retourneront rien',
    user_experience: 'Dashboard vide ou erreurs',
    fix: 'URGENT - Garder SECURITY DEFINER sur views admin'
  },
  {
    page: 'Admin Users Management',
    queries: ['users', 'balance_operations'],
    impact: '🔴 ÉLEVÉ',
    will_break: false,
    reason: 'Dépend de comment les requêtes sont faites',
    user_experience: 'Peut voir uniquement son propre user',
    fix: 'Utiliser service_role key côté serveur ou Edge Functions'
  },
  {
    page: 'Wallet / Recharge',
    queries: ['balance_operations', 'transactions', 'users'],
    impact: '🟡 MOYEN',
    will_break: false,
    reason: 'Users voient leur historique uniquement (OK)',
    user_experience: 'Inchangé'
  }
];

frontendImpact.forEach(p => {
  console.log(`\n💻 ${p.page}`);
  console.log(`   Impact: ${p.impact}`);
  console.log(`   Va casser: ${p.will_break ? '❌ OUI' : '✅ NON'}`);
  console.log(`   UX: ${p.user_experience}`);
  if (p.fix) {
    console.log(`   🔧 Fix: ${p.fix}`);
  }
  
  analysis.frontend_impact.push(p);
});

// ============================================================================
// 6. RÉSUMÉ ET RECOMMANDATIONS
// ============================================================================
console.log('\n\n');
console.log('='.repeat(80));
console.log('📊 RÉSUMÉ DE L\'ANALYSE D\'IMPACT');
console.log('='.repeat(80));

const criticalIssues = [
  {
    issue: 'Views Admin (SECURITY INVOKER)',
    severity: 'CRITIQUE',
    impact: 'Dashboard admin complètement cassé',
    affected: [
      'v_dashboard_stats',
      'v_frozen_discrepancies',
      'v_service_health',
      'v_frozen_balance_health'
    ],
    solution: 'NE PAS convertir en SECURITY INVOKER - Garder SECURITY DEFINER + check admin'
  },
  {
    issue: 'Fonctions SQL atomic_* sans SECURITY DEFINER',
    severity: 'CRITIQUE',
    impact: 'Wallet complètement cassé',
    affected: [
      'atomic_freeze_balance()',
      'atomic_unfreeze_balance()',
      'atomic_commit()',
      'atomic_refund()'
    ],
    solution: 'Vérifier que toutes ont SECURITY DEFINER'
  },
  {
    issue: 'Edge Functions avec anon key',
    severity: 'CRITIQUE',
    impact: 'Webhooks paiements cassés',
    affected: [
      'paydunya-webhook',
      'moneyfusion-webhook',
      'get-rent-status',
      'cron-atomic-reliable'
    ],
    solution: 'Utiliser service_role key dans TOUS les webhooks et crons'
  },
  {
    issue: 'RLS sur balance_operations',
    severity: 'ÉLEVÉ',
    impact: 'Paiements peuvent échouer',
    affected: ['Tous les paiements', 'Recharges', 'Atomic operations'],
    solution: 'Edge Functions DOIVENT utiliser service_role key'
  }
];

console.log('\n🔴 PROBLÈMES CRITIQUES IDENTIFIÉS:\n');
criticalIssues.forEach((issue, i) => {
  console.log(`${i + 1}. ${issue.issue}`);
  console.log(`   Sévérité: ${issue.severity}`);
  console.log(`   Impact: ${issue.impact}`);
  console.log(`   Affecté: ${issue.affected.join(', ')}`);
  console.log(`   ✅ Solution: ${issue.solution}\n`);
  
  analysis.potential_issues.push(issue);
});

// ============================================================================
// RECOMMANDATIONS FINALES
// ============================================================================
const recommendations = [
  {
    priority: '🔴 CRITIQUE',
    action: 'NE PAS appliquer le script fix_rls_cloud_complete.sql tel quel',
    reason: 'Va casser le dashboard admin et les fonctions atomiques',
    alternative: 'Utiliser fix_rls_cloud_safe.sql (à créer)'
  },
  {
    priority: '🔴 CRITIQUE',
    action: 'Garder SECURITY DEFINER sur les views admin',
    views: [
      'v_dashboard_stats',
      'v_frozen_discrepancies',
      'v_service_health',
      'v_frozen_balance_health',
      'v_frozen_balance_health_reconciliation',
      'v_provider_stats_24h',
      'v_country_health'
    ],
    add_check: 'Ajouter WHERE EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = \'admin\')'
  },
  {
    priority: '🔴 CRITIQUE',
    action: 'Vérifier toutes les fonctions SQL atomic_*',
    command: `SELECT proname, prosecdef FROM pg_proc WHERE proname LIKE 'atomic_%';`,
    ensure: 'prosecdef = true (SECURITY DEFINER)'
  },
  {
    priority: '🟠 ÉLEVÉ',
    action: 'Auditer toutes les Edge Functions',
    check: 'Vérifier qu\'elles utilisent SUPABASE_SERVICE_ROLE_KEY pour balance_operations et rental_logs',
    files: 'supabase/functions/*/index.ts'
  },
  {
    priority: '🟡 MOYEN',
    action: 'Appliquer RLS de manière progressive',
    steps: [
      '1. Activer RLS sur pricing_rules_archive, email_campaigns, email_logs (safe)',
      '2. Tester',
      '3. Activer RLS sur activations (policies déjà là)',
      '4. Tester',
      '5. Activer RLS sur rental_logs avec monitoring',
      '6. Activer RLS sur balance_operations en dernier'
    ]
  },
  {
    priority: '🟢 FAIBLE',
    action: 'Convertir available_services en SECURITY INVOKER',
    safe: true,
    reason: 'Accès public, pas de risque'
  }
];

console.log('📋 RECOMMANDATIONS:\n');
recommendations.forEach((rec, i) => {
  console.log(`${i + 1}. ${rec.priority} - ${rec.action}`);
  if (rec.reason) console.log(`   Raison: ${rec.reason}`);
  if (rec.views) console.log(`   Views: ${rec.views.length} views concernées`);
  if (rec.steps) {
    console.log(`   Étapes:`);
    rec.steps.forEach(step => console.log(`      ${step}`));
  }
  console.log('');
  
  analysis.recommendations.push(rec);
});

// ============================================================================
// SAUVEGARDER LE RAPPORT
// ============================================================================
fs.writeFileSync(
  'rls_impact_analysis.json',
  JSON.stringify(analysis, null, 2)
);

console.log('='.repeat(80));
console.log('📄 Rapport complet sauvegardé: rls_impact_analysis.json');
console.log('='.repeat(80));

console.log(`
⚠️  CONCLUSION:

🔴 NE PAS APPLIQUER fix_rls_cloud_complete.sql TEL QUEL !

Il faut créer un script RLS SAFE qui:
  1. Active RLS sur les tables (OK)
  2. GARDE SECURITY DEFINER sur les views admin (CRITIQUE)
  3. Vérifie les fonctions SQL (CRITIQUE)
  4. Ne casse rien (IMPORTANT)

Un nouveau script va être généré: fix_rls_cloud_safe.sql
`);
