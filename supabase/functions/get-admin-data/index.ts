import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
}

// Admin secret - in production, this should be a strong, randomly generated value
// stored in environment variables
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') || 'admin@clip4all2002'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate admin authorization
    const adminSecret = req.headers.get('x-admin-secret')
    
    if (!adminSecret || adminSecret !== ADMIN_SECRET) {
      console.log('Unauthorized admin access attempt')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Fetch sessions with stats
    const { data: sessions, error: sessionsError } = await supabaseClient
      .from('sessions')
      .select('id, session_code, created_at, expires_at, is_public, password_hash, last_activity')
      .order('created_at', { ascending: false })
      .limit(200)

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      throw sessionsError
    }

    // Fetch session items for aggregation
    const { data: items, error: itemsError } = await supabaseClient
      .from('session_items')
      .select('session_id, item_type, file_size, content')

    if (itemsError) {
      console.error('Error fetching items:', itemsError)
    }

    // Fetch analytics for visitor counts
    const { data: analytics, error: analyticsError } = await supabaseClient
      .from('session_analytics')
      .select('session_id, ip_address, action, created_at, user_agent, metadata')
      .order('created_at', { ascending: false })
      .limit(500)

    if (analyticsError) {
      console.error('Error fetching analytics:', analyticsError)
    }

    // Aggregate stats per session
    const sessionStats = sessions.map(session => {
      const sessionItems = items?.filter(i => i.session_id === session.id) || []
      const sessionAnalytics = analytics?.filter(a => a.session_id === session.id) || []
      
      const textItems = sessionItems.filter(i => i.item_type === 'text')
      const imageItems = sessionItems.filter(i => i.item_type === 'image')
      const fileItems = sessionItems.filter(i => i.item_type === 'file')
      
      const totalDataBytes = sessionItems.reduce((sum, item) => {
        const fileSize = item.file_size || 0
        const contentSize = item.content ? new TextEncoder().encode(item.content).length : 0
        return sum + fileSize + contentSize
      }, 0)

      const uniqueIps = new Set(sessionAnalytics.map(a => a.ip_address).filter(Boolean))

      return {
        id: session.id,
        session_code: session.session_code,
        created_at: session.created_at,
        expires_at: session.expires_at,
        is_public: session.is_public,
        has_password: session.password_hash != null,
        last_activity: session.last_activity,
        unique_visitors: uniqueIps.size,
        total_items: sessionItems.length,
        text_items: textItems.length,
        image_items: imageItems.length,
        file_items: fileItems.length,
        total_data_bytes: totalDataBytes
      }
    })

    // Get recent activity
    const recentActivity = analytics?.slice(0, 100) || []

    console.log(`Admin data fetched: ${sessionStats.length} sessions`)

    return new Response(
      JSON.stringify({ 
        sessions: sessionStats,
        recentActivity
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in get-admin-data function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
