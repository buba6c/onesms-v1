import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

async function deepAnalysis() {
  console.log("🔍 ANALYSE DEEP INTELLIGENTE - Recharges Utilisateurs\n");
  console.log("=".repeat(60) + "\n");
  
  // 1. Chercher des données suspectes
  const { data: txs, error } = await supabase
    .from("transactions")
    .select("id, type, status, amount, payment_ref, description, metadata, user_id, created_at")
    .in("type", ["recharge", "topup", "credit", "payment", "deposit", "referral_bonus"])
    .order("created_at", { ascending: false })
    .limit(100);
  
  if (error) {
    console.log("❌ ERREUR:", error.message);
    return;
  }
  
  console.log("📊 Total transactions analysées:", txs.length);
  
  // 2. Chercher des champs avec des données suspectes (longues chaînes de chiffres)
  const suspicious = [];
  const pattern = /^[0-9]{50,}$/;  // Plus de 50 chiffres consécutifs
  
  txs.forEach(t => {
    const checks = [
      { field: "payment_ref", value: t.payment_ref },
      { field: "description", value: t.description },
      { field: "metadata", value: JSON.stringify(t.metadata) }
    ];
    
    checks.forEach(c => {
      if (c.value && (pattern.test(c.value) || c.value.length > 300)) {
        suspicious.push({
          id: t.id,
          field: c.field,
          preview: c.value.substring(0, 100) + "...",
          length: c.value.length
        });
      }
    });
  });
  
  if (suspicious.length > 0) {
    console.log("\n⚠️ DONNÉES SUSPECTES TROUVÉES:");
    suspicious.forEach(s => {
      console.log("  - TX " + s.id.substring(0,8) + " | " + s.field + " | len:" + s.length);
      console.log("    Preview: " + s.preview);
    });
  } else {
    console.log("\n✅ Aucune donnée suspecte dans les transactions");
  }
  
  // 3. Vérifier les users associés
  const { data: users } = await supabase.from("users").select("id, email, name").limit(10);
  console.log("\n👥 Échantillon users:");
  users.slice(0, 5).forEach(u => {
    const emailOk = u.email && u.email.includes("@");
    const nameOk = u.name && u.name.length < 100;
    console.log("  - " + u.id.substring(0,8) + " | " + (emailOk ? "✓" : "✗") + " email | " + (nameOk ? "✓" : "✗") + " name");
  });
  
  // 4. Vérifier la structure metadata
  console.log("\n📦 Analyse des metadata:");
  const metaStats = { withActivations: 0, withProvider: 0, withAmountXof: 0, malformed: 0 };
  txs.forEach(t => {
    if (t.metadata) {
      if (t.metadata.activations) metaStats.withActivations++;
      if (t.metadata.payment_provider) metaStats.withProvider++;
      if (t.metadata.amount_xof) metaStats.withAmountXof++;
      if (typeof t.metadata === "string") metaStats.malformed++;
    }
  });
  console.log("  - Avec activations:", metaStats.withActivations);
  console.log("  - Avec provider:", metaStats.withProvider);
  console.log("  - Avec amount_xof:", metaStats.withAmountXof);
  console.log("  - Malformées (string):", metaStats.malformed);
  
  // 5. Vérifier les montants
  console.log("\n💰 Analyse des montants:");
  const amounts = txs.map(t => t.amount).filter(a => a != null);
  const maxAmt = Math.max(...amounts);
  const minAmt = Math.min(...amounts);
  const avgAmt = amounts.reduce((a,b) => a+b, 0) / amounts.length;
  console.log("  - Min:", minAmt, "| Max:", maxAmt, "| Avg:", Math.round(avgAmt));
  
  // Montants anormaux
  const abnormalAmounts = txs.filter(t => t.amount > 100000 || t.amount < 0);
  if (abnormalAmounts.length > 0) {
    console.log("  ⚠️ Montants anormaux:", abnormalAmounts.length);
    abnormalAmounts.forEach(t => console.log("    - " + t.id.substring(0,8) + ": " + t.amount));
  }
  
  // 6. Vérifier les 10 dernières transactions en détail
  console.log("\n📋 DÉTAIL des 10 dernières transactions:");
  txs.slice(0, 10).forEach((t, i) => {
    console.log(`\n${i+1}. TX ${t.id.substring(0,8)}`);
    console.log(`   Type: ${t.type} | Status: ${t.status} | Amount: ${t.amount}`);
    console.log(`   Ref: ${t.payment_ref || 'NULL'}`);
    console.log(`   Desc: ${t.description || 'NULL'}`);
    console.log(`   Meta: ${JSON.stringify(t.metadata).substring(0, 100)}`);
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ Analyse terminée");
}

deepAnalysis();
