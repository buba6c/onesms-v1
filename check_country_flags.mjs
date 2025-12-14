import { COUNTRY_TO_ISO, SMS_ACTIVATE_ID_TO_ISO, VALID_ISO_CODES, getCountryFlag, getFlagEmoji, toFlagEmoji } from './src/lib/logo-service.ts';
import fs from 'fs';

const report = {
  invalidIso: [],
  missingFlag: [],
  countryToIso: [],
  smsActivateIdToIso: [],
  flagEmojiCheck: []
};

// Vérification mapping nom pays → ISO
for (const [name, iso] of Object.entries(COUNTRY_TO_ISO)) {
  if (!VALID_ISO_CODES.has(iso)) {
    report.invalidIso.push({ name, iso });
  }
  report.countryToIso.push({ name, iso, flag: getCountryFlag(iso), emoji: toFlagEmoji(iso) });
  if (!getCountryFlag(iso)) {
    report.missingFlag.push({ name, iso });
  }
  report.flagEmojiCheck.push({ iso, emoji: toFlagEmoji(iso) });
}

// Vérification mapping ID SMS-Activate → ISO
for (const [id, iso] of Object.entries(SMS_ACTIVATE_ID_TO_ISO)) {
  if (!VALID_ISO_CODES.has(iso)) {
    report.invalidIso.push({ id, iso });
  }
  report.smsActivateIdToIso.push({ id, iso, flag: getCountryFlag(iso), emoji: toFlagEmoji(iso) });
  if (!getCountryFlag(iso)) {
    report.missingFlag.push({ id, iso });
  }
  report.flagEmojiCheck.push({ iso, emoji: toFlagEmoji(iso) });
}

// Sauvegarde du rapport JSON
fs.writeFileSync('country_flag_deep_check.json', JSON.stringify(report, null, 2));

// Génération du rapport Markdown
let md = '# Rapport de vérification des drapeaux pays\n\n';
md += `Date: ${new Date().toLocaleString()}\n\n`;
md += '## Codes ISO non valides\n';
report.invalidIso.forEach(e => {
  md += `- ${e.name || e.id} → ${e.iso}\n`;
});
md += '\n## Pays sans drapeau Flagpedia\n';
report.missingFlag.forEach(e => {
  md += `- ${e.name || e.id} → ${e.iso}\n`;
});
md += '\n## Mapping nom → ISO\n';
report.countryToIso.forEach(e => {
  md += `- ${e.name}: ${e.iso} | Flag: ${e.flag} | Emoji: ${e.emoji}\n`;
});
md += '\n## Mapping ID SMS-Activate → ISO\n';
report.smsActivateIdToIso.forEach(e => {
  md += `- ${e.id}: ${e.iso} | Flag: ${e.flag} | Emoji: ${e.emoji}\n`;
});
md += '\n## Vérification emoji\n';
report.flagEmojiCheck.forEach(e => {
  md += `- ${e.iso}: ${e.emoji}\n`;
});
fs.writeFileSync('country_flag_deep_check_report.md', md);