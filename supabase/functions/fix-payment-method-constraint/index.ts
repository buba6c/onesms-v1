import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Drop old constraint
    const { error: dropError } = await supabase.rpc('exec_sql_internal', {
      query_text: 'ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check'
    }).maybeSingle()

    if (dropError) {
      console.log('Drop error (may not exist):', dropError)
    }

    // Add new constraint
    const { error: addError } = await supabase.rpc('exec_sql_internal', {
      query_text: `ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check 
        CHECK (payment_method IS NULL OR payment_method IN ('wave', 'om', 'moneyfusion', 'paydunya', 'paytech', 'moneroo', 'bonus', 'manual', 'admin'))`
    }).maybeSingle()

    if (addError) {
      // Try inserting with moneroo to test
      console.log('Add error:', addError)
    }

    // Test insert
    const { data: testData, error: testError } = await supabase
      .from('transactions')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        type: 'deposit',
        amount: 0,
        balance_before: 0,
        balance_after: 0,
        status: 'test',
        payment_method: 'moneroo',
        reference: 'CONSTRAINT_TEST_' + Date.now()
      })
      .select()
      .single()

    if (testError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: testError.message,
          hint: 'La contrainte doit être modifiée via le SQL Editor de Supabase'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Delete test
    if (testData?.id) {
      await supabase.from('transactions').delete().eq('id', testData.id)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Moneroo est maintenant autorisé!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
