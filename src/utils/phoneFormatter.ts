/**
 * Formate un numéro de téléphone international
 * Exemple: "6289518249636" → "+62 (895) 182 496 36"
 * 
 * @param phone - Numéro de téléphone brut
 * @returns Numéro formaté avec indicatif pays et groupes
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Nettoyer le numéro (garder seulement les chiffres)
  const cleaned = phone.replace(/\D/g, '');
  
  // Si le numéro est trop court, retourner tel quel
  if (cleaned.length < 10) return phone;
  
  // Détecter l'indicatif pays (longueurs courantes: 1-3 chiffres)
  // Format général: +XX (XXX) XXX XXX XX
  
  let countryCode = '';
  let remaining = '';
  
  // Essayer les indicatifs courants
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    // USA/Canada: +1
    countryCode = '1';
    remaining = cleaned.slice(1);
  } else if (cleaned.startsWith('62') && cleaned.length >= 11) {
    // Indonésie: +62
    countryCode = '62';
    remaining = cleaned.slice(2);
  } else if (cleaned.startsWith('33') && cleaned.length === 11) {
    // France: +33
    countryCode = '33';
    remaining = cleaned.slice(2);
  } else if (cleaned.startsWith('44') && cleaned.length === 12) {
    // UK: +44
    countryCode = '44';
    remaining = cleaned.slice(2);
  } else if (cleaned.startsWith('86') && cleaned.length === 13) {
    // Chine: +86
    countryCode = '86';
    remaining = cleaned.slice(2);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    // Inde: +91
    countryCode = '91';
    remaining = cleaned.slice(2);
  } else if (cleaned.startsWith('7') && cleaned.length === 11) {
    // Russie/Kazakhstan: +7
    countryCode = '7';
    remaining = cleaned.slice(1);
  } else if (cleaned.startsWith('234') && cleaned.length === 13) {
    // Nigeria: +234
    countryCode = '234';
    remaining = cleaned.slice(3);
  } else if (cleaned.startsWith('55') && cleaned.length >= 12) {
    // Brésil: +55
    countryCode = '55';
    remaining = cleaned.slice(2);
  } else if (cleaned.startsWith('27') && cleaned.length === 11) {
    // Afrique du Sud: +27
    countryCode = '27';
    remaining = cleaned.slice(2);
  } else if (cleaned.startsWith('84') && cleaned.length >= 11) {
    // Vietnam: +84
    countryCode = '84';
    remaining = cleaned.slice(2);
  } else if (cleaned.startsWith('66') && cleaned.length === 11) {
    // Thaïlande: +66
    countryCode = '66';
    remaining = cleaned.slice(2);
  } else if (cleaned.startsWith('90') && cleaned.length === 12) {
    // Turquie: +90
    countryCode = '90';
    remaining = cleaned.slice(2);
  } else if (cleaned.startsWith('49') && cleaned.length >= 11) {
    // Allemagne: +49
    countryCode = '49';
    remaining = cleaned.slice(2);
  } else {
    // Par défaut, prendre les 2-3 premiers chiffres comme indicatif
    if (cleaned.length >= 12) {
      countryCode = cleaned.slice(0, 2);
      remaining = cleaned.slice(2);
    } else {
      countryCode = cleaned.slice(0, 1);
      remaining = cleaned.slice(1);
    }
  }
  
  // Formater le reste du numéro
  // Format: (XXX) XXX XXX XX
  if (remaining.length >= 9) {
    const part1 = remaining.slice(0, 3);
    const part2 = remaining.slice(3, 6);
    const part3 = remaining.slice(6, 9);
    const part4 = remaining.slice(9);
    
    return `+${countryCode} (${part1}) ${part2} ${part3}${part4 ? ' ' + part4 : ''}`;
  } else if (remaining.length >= 6) {
    const part1 = remaining.slice(0, 3);
    const part2 = remaining.slice(3, 6);
    const part3 = remaining.slice(6);
    
    return `+${countryCode} (${part1}) ${part2}${part3 ? ' ' + part3 : ''}`;
  } else {
    return `+${countryCode} ${remaining}`;
  }
}

/**
 * Extrait le numéro brut d'un numéro formaté
 * Exemple: "+62 (895) 182 496 36" → "6289518249636"
 * 
 * @param formattedPhone - Numéro formaté
 * @returns Numéro brut (chiffres uniquement)
 */
export function unformatPhoneNumber(formattedPhone: string): string {
  return formattedPhone.replace(/\D/g, '');
}
