import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { sessionCode, extendMinutes } = await req.json()

    if (!extendMinutes || extendMinutes < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid extension duration' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get session
    const { data: session, error: sessionError } = await supabaseClient
      .from('sessions')
      .select('id, expires_at')
      .eq('session_code', sessionCode)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!session.expires_at) {
      return new Response(
        JSON.stringify({ error: 'Session does not have an expiration time' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate new expiration time
    const currentExpiry = new Date(session.expires_at)
    const newExpiry = new Date(currentExpiry.getTime() + extendMinutes * 60000)

    // Update session expiration
    const { error: updateError } = await supabaseClient
      .from('sessions')
      .update({ expires_at: newExpiry.toISOString() })
      .eq('id', session.id)

    if (updateError) {
      console.error('Error extending session:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to extend session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Session ${sessionCode} extended by ${extendMinutes} minutes`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Session extended successfully',
        new_expires_at: newExpiry.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in extend-session function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
