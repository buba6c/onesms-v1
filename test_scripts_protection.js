// Test de la protection contre les scripts externes bloqués
console.log('🧪 TEST DE PROTECTION DES SCRIPTS EXTERNES');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Simuler des erreurs de chargement de scripts
function simulateBlockedScript(domain, scriptName) {
  console.log(`\n🔍 Test : ${scriptName} (${domain})`);
  
  // Créer un élément script qui va échouer
  const script = document.createElement('script');
  script.src = `https://${domain}/${scriptName}`;
  script.onerror = function() {
    console.log(`✅ Erreur capturée pour ${scriptName}`);
  };
  
  // Simuler l'ajout au DOM
  document.head.appendChild(script);
  
  // Simuler l'erreur réseau
  const errorEvent = new ErrorEvent('error', {
    message: `Failed to load script: https://${domain}/${scriptName}`,
    filename: script.src,
    error: new Error('net::ERR_BLOCKED_BY_CLIENT')
  });
  
  // Déclencher l'événement d'erreur
  script.dispatchEvent(errorEvent);
  
  // Nettoyer
  document.head.removeChild(script);
}

// Tests des scripts couramment bloqués
console.log('\n🔬 SIMULATION DES SCRIPTS BLOQUÉS :');

simulateBlockedScript('static.hotjar.com', 'hotjar-2201971.js');
simulateBlockedScript('sc.lfeeder.com', 'lftracker_v1_YEgkB8lqgPp7ep3Z.js');
simulateBlockedScript('googletagmanager.com', 'gtm.js');
simulateBlockedScript('connect.facebook.net', 'en_US/fbevents.js');

// Vérifier que les stubs sont en place
console.log('\n🔍 VÉRIFICATION DES STUBS :');

console.log(`Hotjar stub : ${typeof window.hj !== 'undefined' ? '✅' : '❌'}`);
console.log(`LeadFeeder stub : ${typeof window.lf !== 'undefined' ? '✅' : '❌'}`);
console.log(`Facebook Pixel stub : ${typeof window.fbq !== 'undefined' ? '✅' : '❌'}`);
console.log(`Google Analytics stub : ${typeof window.gtag !== 'undefined' ? '✅' : '❌'}`);

console.log('\n🎯 RÉSULTAT : Protection des scripts externes testée !');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
