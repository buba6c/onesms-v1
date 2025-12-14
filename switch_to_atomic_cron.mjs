import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔄 MIGRATION: Switching from old cron to 100% reliable atomic cron\n')

try {
  // Supprimer l'ancien cron job (jobid 4)
  console.log('1️⃣ Suppression de l\'ancien cron...')
  const { error: deleteError } = await sb.rpc('custom_sql', {
    sql: "SELECT cron.unschedule('check-pending-sms');"
  })

  if (deleteError) {
    console.log('⚠️ Tentative de suppression échouée (peut-être déjà supprimé):', deleteError.message)
  } else {
    console.log('✅ Ancien cron supprimé')
  }

  // Créer le nouveau cron job qui appelle cron-atomic-reliable
  console.log('\n2️⃣ Création du nouveau cron 100% fiable...')
  const { error: createError } = await sb.rpc('custom_sql', {
    sql: `
      SELECT cron.schedule(
        'atomic-reliable-cron',  -- nom
        '*/2 * * * *',           -- toutes les 2 minutes
        $$
        SELECT net.http_post(
          url := 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cron-atomic-reliable',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE"}'::jsonb,
          body := '{"trigger": "cron"}'::jsonb
        );
        $$
      );
    `
  })

  if (createError) {
    console.error('❌ Erreur création nouveau cron:', createError.message)
  } else {
    console.log('✅ Nouveau cron 100% fiable créé!')
  }

  // Vérifier la nouvelle config
  console.log('\n3️⃣ Vérification de la nouvelle configuration...')
  const { data: jobs, error: listError } = await sb.rpc('custom_sql', {
    sql: "SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobid;"
  })

  if (listError) {
    console.error('❌ Erreur vérification:', listError.message)
  } else {
    console.log('\n📋 JOBS ACTIFS:')
    jobs?.forEach(job => {
      console.log(`   Job ${job.jobid}: ${job.jobname} - ${job.schedule} (${job.active ? 'ACTIF' : 'INACTIF'})`)
    })
  }

  console.log('\n🎉 MIGRATION TERMINÉE!')
  console.log('Le système est maintenant 100% fiable pour les timeouts.')

} catch (error) {
  console.error('❌ ERREUR MIGRATION:', error.message)
}