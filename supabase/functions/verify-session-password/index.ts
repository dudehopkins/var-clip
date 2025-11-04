import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { sessionCode, password, isCreating } = await req.json()

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

    if (password && password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
      const passwordHash = password ? await bcrypt.hash(password) : null

      // Create new session
      const { data: newSession, error: createError } = await supabaseClient
        .from('sessions')
        .insert({
          session_code: sessionCode,
          password_hash: passwordHash,
          is_public: !password, // Public if no password
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
      const isValid = await bcrypt.compare(password, session.password_hash)

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
