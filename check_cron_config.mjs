import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔍 Checking pg_cron configuration...\n')

const { data: cronJobs, error } = await sb
  .from('cron_job')
  .select('*')

if (error) {
  console.error('Error:', error)
} else {
  console.log('📋 CURRENT CRON JOBS:')
  cronJobs?.forEach(job => {
    console.log(`\nJob ID: ${job.jobid}`)
    console.log(`Name: ${job.jobname}`)
    console.log(`Schedule: ${job.schedule}`)
    console.log(`Command: ${job.command}`)
    console.log(`Active: ${job.active}`)
  })
}