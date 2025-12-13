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

// Maximum extension allowed: 1 week (in minutes)
const MAX_EXTENSION_MINUTES = 10080

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { sessionCode, extendMinutes, token, password, isAdmin } = await req.json()

    // Validate extension duration
    if (!extendMinutes || extendMinutes < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid extension duration' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Limit extension to prevent abuse
    if (extendMinutes > MAX_EXTENSION_MINUTES) {
      return new Response(
        JSON.stringify({ error: `Extension cannot exceed ${MAX_EXTENSION_MINUTES} minutes (1 week)` }),
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
      .select('id, expires_at, password_hash, is_public')
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

    // Authorization check
    let authorized = false

    // Check admin access via header
    const adminSecret = req.headers.get('x-admin-secret')
    if (adminSecret === ADMIN_SECRET && isAdmin) {
      authorized = true
      console.log(`Admin extending session: ${sessionCode}`)
    }

    // For password-protected sessions, verify password or token
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

    // Public sessions can be extended by anyone viewing them
    if (session.is_public) {
      authorized = true
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
