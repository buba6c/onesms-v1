// Script de gestion d'erreur pour Hotjar et autres services externes bloqués
(function() {
  // Gérer les erreurs de chargement de scripts externes (Hotjar, Google Analytics, etc.)
  window.addEventListener('error', function(event) {
    if (event.target && event.target.src) {
      const blockedDomains = [
        'static.hotjar.com',
        'googletagmanager.com',
        'google-analytics.com',
        'doubleclick.net'
      ];
      
      const isBlockedScript = blockedDomains.some(domain => 
        event.target.src.includes(domain)
      );
      
      if (isBlockedScript) {
        console.log('🔒 Script externe bloqué (probablement par un ad blocker):', event.target.src);
        // Empêcher que l'erreur remonte et cause des problèmes
        event.preventDefault();
        return false;
      }
    }
  }, true);
  
  // Stub pour Hotjar si il est référencé mais bloqué
  if (typeof window.hj === 'undefined') {
    window.hj = function() {
      // Fonction vide qui ne fait rien si Hotjar est bloqué
    };
    window._hjSettings = { hjid: 0, hjsv: 6 };
  }
  
  // Log pour debug
  console.log('🛡️ Protection contre les scripts externes bloqués activée');
})();