import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gqvxrvxmfvlnhukbpdjb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxdnhydnhtZnZsbmh1a2JwZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NzA0MzcsImV4cCI6MjA0ODA0NjQzN30.WYzZF1UOHLS5OXrv5LHs26H-3pD1b8uAUn1K-3gXXvA'
);

// Mapping correct des codes SMS-Activate vers vrais noms
const CORRECT_SERVICE_NAMES = {
  'ts': 'PayPal',
  'oi': 'Tinder',
  'lf': 'TikTok',
  're': 'Coinbase',
  'aon': 'Binance',
  'ka': 'Shopee',
  'tn': 'LinkedIn',
  'qv': 'Badoo',
  'bd': 'Bumble',
  'fu': 'Snapchat',
  'sn': 'Snapchat',
  'bnl': 'Reddit',
  'ij': 'Revolut',
  'alj': 'Spotify',
  'mg': 'Mercado Libre',
  'mt': 'Mercado Libre',
  'zn': 'Dzen',
  'me': 'LINE',
  'mm': 'Mamba',
  'mb': 'Mamba',
  'wx': 'WeChat',
  'kt': 'KakaoTalk',
  'im': 'IMO',
  'ym': 'Yandex',
  'uk': 'UKR.NET',
  'ma': 'Mail.ru',
  'mr': 'Mail.ru',
  'kp': 'KP.RU',
  'av': 'Avito',
  'yz': 'Youla',
  'wb': 'Wildberries',
  'zr': 'Zara',
  'bl': 'Blizzard',
  'dr': 'Dribbble',
  'tx': 'Tencent',
  'pf': 'PostFinance',
  'pm': 'Payeer',
};

// Mapping des logos (depuis logo-service.ts)
const SERVICE_LOGO_DOMAINS = {
  'ts': 'paypal.com',
  'oi': 'tinder.com',
  'lf': 'tiktok.com',
  're': 'coinbase.com',
  'aon': 'binance.com',
  'ka': 'shopee.com',
  'tn': 'linkedin.com',
  'qv': 'badoo.com',
  'bd': 'bumble.com',
  'fu': 'snapchat.com',
  'sn': 'snapchat.com',
  'bnl': 'reddit.com',
  'ij': 'revolut.com',
  'alj': 'spotify.com',
  'mg': 'mercadolibre.com',
  'mt': 'mercadolibre.com',
  'zn': 'dzen.ru',
  'me': 'line.me',
  'mm': 'mamba.ru',
  'mb': 'mamba.ru',
  'wx': 'wechat.com',
  'kt': 'kakao.com',
  'im': 'imo.im',
};

async function checkInconsistencies() {
  console.log('\n🔍 ANALYSE DES INCOHÉRENCES NOM/LOGO/CODE\n');
  console.log('═'.repeat(80));
  
  // Récupérer tous les services actifs
  const { data: services, error } = await supabase
    .from('services')
    .select('*')
    .eq('provider', 'sms-activate')
    .eq('available', true)
    .order('name');

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log(`\n📊 Total services analysés: ${services.length}\n`);

  const issues = {
    wrongName: [],
    logoOkNameWrong: [],
    noLogoMapping: [],
    perfect: []
  };

  for (const service of services) {
    const code = service.code.toLowerCase();
    const currentName = service.name;
    const correctName = CORRECT_SERVICE_NAMES[code];
    const hasLogoMapping = SERVICE_LOGO_DOMAINS[code] !== undefined;

    // Cas 1: Nom incorrect (le problème que vous avez vu)
    if (correctName && currentName !== correctName) {
      issues.wrongName.push({
        code,
        currentName,
        correctName,
        hasLogo: hasLogoMapping,
        logoDomain: SERVICE_LOGO_DOMAINS[code] || 'none'
      });

      // Sous-cas: Logo OK mais nom faux (comme TypeScript Services avec logo PayPal)
      if (hasLogoMapping) {
        issues.logoOkNameWrong.push({
          code,
          currentName,
          correctName,
          logoDomain: SERVICE_LOGO_DOMAINS[code]
        });
      }
    }
    // Cas 2: Nom peut-être OK mais pas de logo mappé
    else if (!hasLogoMapping && !correctName) {
      issues.noLogoMapping.push({
        code,
        name: currentName
      });
    }
    // Cas 3: Tout est parfait
    else if (hasLogoMapping && (!correctName || currentName === correctName)) {
      issues.perfect.push({
        code,
        name: currentName,
        logo: SERVICE_LOGO_DOMAINS[code]
      });
    }
  }

  // RAPPORT 1: Services avec LOGO CORRECT mais NOM INCORRECT (le problème principal)
  console.log('\n�� CRITIQUE: LOGO CORRECT MAIS NOM INCORRECT\n');
  console.log('═'.repeat(80));
  console.log('Ces services affichent le bon logo mais le mauvais nom!\n');
  
  if (issues.logoOkNameWrong.length > 0) {
    console.log(`Trouvés: ${issues.logoOkNameWrong.length} services\n`);
    issues.logoOkNameWrong.forEach((s, i) => {
      console.log(`${i + 1}. Code: "${s.code}"`);
      console.log(`   ❌ Nom actuel: "${s.currentName}"`);
      console.log(`   ✅ Logo affiché: ${s.logoDomain}`);
      console.log(`   ✅ Nom correct: "${s.correctName}"`);
      console.log(`   ⚠️  PROBLÈME: L'utilisateur voit le logo "${s.logoDomain}" avec le nom "${s.currentName}"!\n`);
    });
  } else {
    console.log('✅ Aucun service avec ce problème!\n');
  }

  // RAPPORT 2: Tous les services avec nom incorrect
  console.log('\n⚠️  TOUS LES SERVICES AVEC NOM INCORRECT\n');
  console.log('═'.repeat(80));
  
  if (issues.wrongName.length > 0) {
    console.log(`Trouvés: ${issues.wrongName.length} services\n`);
    
    const withLogo = issues.wrongName.filter(s => s.hasLogo);
    const withoutLogo = issues.wrongName.filter(s => !s.hasLogo);
    
    console.log(`📊 Avec logo mappé: ${withLogo.length}`);
    console.log(`📊 Sans logo mappé: ${withoutLogo.length}\n`);
    
    issues.wrongName.forEach((s, i) => {
      const status = s.hasLogo ? '🎨' : '📱';
      console.log(`${i + 1}. ${status} "${s.code}" → Actuel: "${s.currentName}" | Correct: "${s.correctName}"`);
    });
  } else {
    console.log('✅ Tous les noms sont corrects!\n');
  }

  // RAPPORT 3: Services sans logo
  console.log('\n\n📱 SERVICES SANS MAPPING DE LOGO (Top 20)\n');
  console.log('═'.repeat(80));
  
  if (issues.noLogoMapping.length > 0) {
    console.log(`Trouvés: ${issues.noLogoMapping.length} services sans logo\n`);
    issues.noLogoMapping.slice(0, 20).forEach((s, i) => {
      console.log(`${i + 1}. "${s.code}" → ${s.name}`);
    });
    if (issues.noLogoMapping.length > 20) {
      console.log(`\n... et ${issues.noLogoMapping.length - 20} autres`);
    }
  } else {
    console.log('✅ Tous les services ont un logo!\n');
  }

  // RAPPORT 4: Services parfaits
  console.log('\n\n✅ SERVICES PARFAITS (Logo + Nom correct) - Top 20\n');
  console.log('═'.repeat(80));
  console.log(`Total: ${issues.perfect.length} services\n`);
  
  issues.perfect.slice(0, 20).forEach((s, i) => {
    console.log(`${i + 1}. "${s.code}" → ${s.name} (${s.logo})`);
  });
  if (issues.perfect.length > 20) {
    console.log(`\n... et ${issues.perfect.length - 20} autres`);
  }

  // RÉSUMÉ FINAL
  console.log('\n\n📊 RÉSUMÉ FINAL\n');
  console.log('═'.repeat(80));
  console.log(`🔴 Logo OK + Nom FAUX:  ${issues.logoOkNameWrong.length} services (CRITIQUE)`);
  console.log(`⚠️  Nom incorrect total:  ${issues.wrongName.length} services`);
  console.log(`📱 Sans logo mappé:      ${issues.noLogoMapping.length} services`);
  console.log(`✅ Services parfaits:    ${issues.perfect.length} services`);
  console.log('═'.repeat(80));

  // Script SQL de correction
  if (issues.wrongName.length > 0) {
    console.log('\n\n🔧 SCRIPT SQL DE CORRECTION\n');
    console.log('═'.repeat(80));
    console.log('-- Copier-coller ces commandes dans Supabase SQL Editor\n');
    
    issues.wrongName.forEach(s => {
      console.log(`UPDATE services SET name = '${s.correctName}' WHERE code = '${s.code}' AND provider = 'sms-activate';`);
    });
    
    console.log('\n-- Fin du script\n');
  }
}

checkInconsistencies().catch(console.error);
