import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Password hashing using Web Crypto API (PBKDF2)
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
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
  
  const hashArray = new Uint8Array(derivedBits);
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  
  return `${saltBase64}:${hashBase64}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { sessionCode, token, newPassword, makePublic } = await req.json()

    // Initialize Supabase client
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

    // Validate inputs
    if (!sessionCode) {
      return new Response(
        JSON.stringify({ error: 'Session code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get session by code
    const { data: session, error: sessionError } = await supabaseClient
      .from('sessions')
      .select('id, password_hash, is_public')
      .eq('session_code', sessionCode)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For protected sessions, verify token
    if (!session.is_public && token) {
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('session_tokens')
        .select('expires_at')
        .eq('token', token)
        .eq('session_id', session.id)
        .single()

      if (tokenError || !tokenData || new Date(tokenData.expires_at) <= new Date()) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (!session.is_public && !token) {
      return new Response(
        JSON.stringify({ error: 'Token required for protected sessions' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare update data
    const updateData: any = {}

    // Handle password change
    if (newPassword !== undefined) {
      if (newPassword === null || newPassword === '') {
        // Remove password (make it public)
        updateData.password_hash = null
        updateData.is_public = true
        
        // Delete all tokens for this session
        await supabaseClient
          .from('session_tokens')
          .delete()
          .eq('session_id', session.id)
      } else {
        // Validate new password
        if (newPassword.length < 12) {
          return new Response(
            JSON.stringify({ error: 'Password must be at least 12 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (newPassword.length > 128) {
          return new Response(
            JSON.stringify({ error: 'Password must not exceed 128 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (!/[A-Z]/.test(newPassword)) {
          return new Response(
            JSON.stringify({ error: 'Password must contain at least one uppercase letter' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (!/[a-z]/.test(newPassword)) {
          return new Response(
            JSON.stringify({ error: 'Password must contain at least one lowercase letter' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (!/[0-9]/.test(newPassword)) {
          return new Response(
            JSON.stringify({ error: 'Password must contain at least one number' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Hash the new password
        updateData.password_hash = await hashPassword(newPassword)
        updateData.is_public = false
        
        // Delete all existing tokens (force re-authentication)
        await supabaseClient
          .from('session_tokens')
          .delete()
          .eq('session_id', session.id)
      }
    } else if (makePublic !== undefined) {
      // Toggle public/private status
      if (makePublic) {
        updateData.is_public = true
        updateData.password_hash = null
        
        // Delete all tokens when making public
        await supabaseClient
          .from('session_tokens')
          .delete()
          .eq('session_id', session.id)
      } else {
        return new Response(
          JSON.stringify({ error: 'To make a session private, you must set a password' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Update the session
    const { error: updateError } = await supabaseClient
      .from('sessions')
      .update(updateData)
      .eq('id', session.id)

    if (updateError) {
      console.error('Error updating session:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update session settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Session settings updated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in update-session-settings function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
