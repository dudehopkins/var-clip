import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
}

// Password verification using Web Crypto API (PBKDF2)
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [saltBase64, hashBase64] = storedHash.split(':');
    if (!saltBase64 || !hashBase64) return false;
    
    const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
    const storedHashBytes = Uint8Array.from(atob(hashBase64), c => c.charCodeAt(0));
    const passwordBuffer = new TextEncoder().encode(password);
    
    const key = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      key,
      256
    );
    
    const derivedHash = new Uint8Array(derivedBits);
    
    // Constant-time comparison
    if (derivedHash.length !== storedHashBytes.length) return false;
    let result = 0;
    for (let i = 0; i < derivedHash.length; i++) {
      result |= derivedHash[i] ^ storedHashBytes[i];
    }
    return result === 0;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

// Admin secret for admin dashboard access
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') || 'admin@clip4all2002'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { sessionCode, forceDelete, token, password, isAdmin } = await req.json()

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
      .select('id, expires_at, password_hash, is_public')
      .eq('session_code', sessionCode)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Authorization check
    let authorized = false

    // Check admin access via header
    const adminSecret = req.headers.get('x-admin-secret')
    if (adminSecret === ADMIN_SECRET && isAdmin) {
      authorized = true
      console.log(`Admin deleting session: ${sessionCode}`)
    }

    // For password-protected sessions, verify password
    if (!authorized && session.password_hash) {
      if (password) {
        const passwordValid = await verifyPassword(password, session.password_hash)
        if (passwordValid) {
          authorized = true
        } else {
          return new Response(
            JSON.stringify({ error: 'Invalid password' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else if (token) {
        // Validate session token
        const { data: tokenData, error: tokenError } = await supabaseClient
          .from('session_tokens')
          .select('expires_at')
          .eq('token', token)
          .eq('session_id', session.id)
          .single()

        if (!tokenError && tokenData && new Date(tokenData.expires_at) > new Date()) {
          authorized = true
        }
      }
      
      if (!authorized) {
        return new Response(
          JSON.stringify({ error: 'Authorization required for protected session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // For public sessions without forceDelete, check expiration
    if (!forceDelete && !authorized && session.expires_at && new Date(session.expires_at) > new Date()) {
      return new Response(
        JSON.stringify({ error: 'Session has not expired yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Public sessions can be deleted if expired or by anyone viewing (since they're public)
    if (session.is_public) {
      authorized = true
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Delete session analytics
    const { error: analyticsError } = await supabaseClient
      .from('session_analytics')
      .delete()
      .eq('session_id', session.id)

    if (analyticsError) {
      console.error('Error deleting session analytics:', analyticsError)
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
