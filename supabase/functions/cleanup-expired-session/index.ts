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
    const { sessionCode } = await req.json()

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

    // Check if session is expired
    if (session.expires_at && new Date(session.expires_at) > new Date()) {
      return new Response(
        JSON.stringify({ error: 'Session has not expired yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Cleaning up session: ${sessionCode}`)

    // Get all files for this session to delete from storage
    const { data: sessionItems } = await supabaseClient
      .from('session_items')
      .select('file_url')
      .eq('session_id', session.id)
      .not('file_url', 'is', null)

    // Delete files from storage
    if (sessionItems && sessionItems.length > 0) {
      for (const item of sessionItems) {
        if (item.file_url) {
          try {
            const url = new URL(item.file_url)
            const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/session-files\/(.+)/)
            if (pathMatch) {
              const filePath = pathMatch[1]
              await supabaseClient.storage
                .from('session-files')
                .remove([filePath])
              console.log(`Deleted file: ${filePath}`)
            }
          } catch (e) {
            console.error('Error deleting file:', e)
          }
        }
      }
    }

    // Delete session items
    const { error: itemsError } = await supabaseClient
      .from('session_items')
      .delete()
      .eq('session_id', session.id)

    if (itemsError) {
      console.error('Error deleting session items:', itemsError)
    }

    // Delete session tokens
    const { error: tokensError } = await supabaseClient
      .from('session_tokens')
      .delete()
      .eq('session_id', session.id)

    if (tokensError) {
      console.error('Error deleting session tokens:', tokensError)
    }

    // Delete session access
    const { error: accessError } = await supabaseClient
      .from('session_access')
      .delete()
      .eq('session_id', session.id)

    if (accessError) {
      console.error('Error deleting session access:', accessError)
    }

    // Finally delete the session itself
    const { error: deleteError } = await supabaseClient
      .from('sessions')
      .delete()
      .eq('id', session.id)

    if (deleteError) {
      console.error('Error deleting session:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully cleaned up session: ${sessionCode}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Session deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in cleanup-expired-session function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
