import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RestoreResult {
  success: boolean
  message: string
  corrected_count?: number
  total_frozen_added?: number
  errors?: string[]
}

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔧 [RESTORE-FROZEN] Starting frozen_amount restoration...')

    // Trouver toutes les activations actives avec frozen_amount = 0
    const { data: brokenActivations, error: fetchError } = await supabaseClient
      .from('activations')
      .select('id, user_id, price, frozen_amount, status, phone')
      .eq('frozen_amount', 0)
      .in('status', ['pending', 'waiting'])
      .order('created_at', { ascending: false })

    if (fetchError) {
      throw new Error(`Failed to fetch broken activations: ${fetchError.message}`)
    }

    console.log(`🎯 [RESTORE-FROZEN] Found ${brokenActivations?.length || 0} activations to fix`)

    if (!brokenActivations || brokenActivations.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No activations need correction',
        corrected_count: 0,
        total_frozen_added: 0
      }), { headers })
    }

    let correctedCount = 0
    let totalFrozenAdded = 0
    const errors: string[] = []

    // Corriger chaque activation
    for (const activation of brokenActivations) {
      try {
        const { data: updated, error: updateError } = await supabaseClient
          .from('activations')
          .update({ frozen_amount: activation.price })
          .eq('id', activation.id)
          .eq('frozen_amount', 0)  // Sécurité
          .in('status', ['pending', 'waiting'])  // Double sécurité
          .select()
          .single()

        if (updateError) {
          errors.push(`${activation.id}: ${updateError.message}`)
          console.error(`❌ [RESTORE-FROZEN] Failed to update ${activation.id}:`, updateError)
        } else {
          correctedCount++
          totalFrozenAdded += activation.price
          console.log(`✅ [RESTORE-FROZEN] Fixed ${activation.id}: frozen_amount = ${updated.frozen_amount}`)
        }
      } catch (error) {
        errors.push(`${activation.id}: ${error.message}`)
        console.error(`❌ [RESTORE-FROZEN] Error processing ${activation.id}:`, error)
      }
    }

    const result: RestoreResult = {
      success: true,
      message: `Restoration completed: ${correctedCount} activations fixed`,
      corrected_count: correctedCount,
      total_frozen_added: totalFrozenAdded
    }

    if (errors.length > 0) {
      result.errors = errors
    }

    console.log(`✅ [RESTORE-FROZEN] Completed: ${correctedCount} fixes, ${totalFrozenAdded} total frozen added`)

    return new Response(JSON.stringify(result), { headers })

  } catch (error) {
    console.error('❌ [RESTORE-FROZEN] Error:', error)
    return new Response(JSON.stringify({
      success: false,
      message: `Error: ${error.message}`
    }), { 
      status: 500,
      headers 
    })
  }
})