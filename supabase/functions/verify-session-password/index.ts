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

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltBase64, hashBase64] = storedHash.split(':');
  const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
  const storedHashArray = Uint8Array.from(atob(hashBase64), c => c.charCodeAt(0));
  
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
  
  // Constant-time comparison
  if (hashArray.length !== storedHashArray.length) return false;
  let result = 0;
  for (let i = 0; i < hashArray.length; i++) {
    result |= hashArray[i] ^ storedHashArray[i];
  }
  return result === 0;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { sessionCode, password, isCreating, durationMinutes } = await req.json()

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
    if (!sessionCode || sessionCode.length < 4 || sessionCode.length > 20) {
      return new Response(
        JSON.stringify({ error: 'Session code must be between 4-20 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!/^[a-z0-9]+$/.test(sessionCode)) {
      return new Response(
        JSON.stringify({ error: 'Session code can only contain lowercase letters and numbers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Strong password validation
    if (password) {
      if (password.length < 12) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 12 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (password.length > 128) {
        return new Response(
          JSON.stringify({ error: 'Password must not exceed 128 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!/[A-Z]/.test(password)) {
        return new Response(
          JSON.stringify({ error: 'Password must contain at least one uppercase letter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!/[a-z]/.test(password)) {
        return new Response(
          JSON.stringify({ error: 'Password must contain at least one lowercase letter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!/[0-9]/.test(password)) {
        return new Response(
          JSON.stringify({ error: 'Password must contain at least one number' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get session by code
    const { data: session, error: sessionError } = await supabaseClient
      .from('sessions')
      .select('id, password_hash, is_public')
      .eq('session_code', sessionCode)
      .single()

    if (isCreating) {
      // Creating a new session with optional password protection
      if (session) {
        return new Response(
          JSON.stringify({ error: 'Session code already exists' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Hash password server-side if provided
      const passwordHash = password ? await hashPassword(password) : null
      
      // Calculate expiration time if duration is provided
      let expiresAt = null
      if (durationMinutes && durationMinutes > 0) {
        const now = new Date()
        expiresAt = new Date(now.getTime() + durationMinutes * 60000).toISOString()
      }

      // Create new session
      const { data: newSession, error: createError } = await supabaseClient
        .from('sessions')
        .insert({
          session_code: sessionCode,
          password_hash: passwordHash,
          is_public: !password, // Public if no password
          expires_at: expiresAt,
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating session:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate session token for private sessions
      let token = null
      if (!newSession.is_public) {
        token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
        
        const { error: tokenError } = await supabaseClient
          .from('session_tokens')
          .insert({
            session_id: newSession.id,
            token: token,
          })
        
        if (tokenError) {
          console.error('Error creating session token:', tokenError)
          return new Response(
            JSON.stringify({ error: 'Failed to create session token' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          sessionId: newSession.id,
          isPublic: newSession.is_public,
          token: token
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Verifying password for existing session
      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // If session is public, no password needed
      if (session.is_public) {
        return new Response(
          JSON.stringify({ success: true, isPublic: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // If session is private, verify password
      if (!session.password_hash) {
        return new Response(
          JSON.stringify({ error: 'Session requires password but none is set' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!password) {
        return new Response(
          JSON.stringify({ error: 'Password required', requiresPassword: true }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify password server-side
      const isValid = await verifyPassword(password, session.password_hash)

      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate session token for authenticated access
      const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
      
      const { error: tokenError } = await supabaseClient
        .from('session_tokens')
        .insert({
          session_id: session.id,
          token: token,
        })
      
      if (tokenError) {
        console.error('Error creating session token:', tokenError)
        return new Response(
          JSON.stringify({ error: 'Failed to create session token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, isPublic: false, token: token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error in verify-session-password function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
