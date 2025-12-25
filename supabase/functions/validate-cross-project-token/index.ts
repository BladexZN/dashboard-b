import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts'

const CROSS_PROJECT_SECRET = Deno.env.get('CROSS_PROJECT_SECRET')!
const PROJECT_B_FRONTEND_URL = Deno.env.get('PROJECT_B_FRONTEND_URL') || 'https://euphonious-beijinho-d29489.netlify.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Authorization',
}

interface TokenPayload {
  email: string
  userId: string
  name: string
  iat: number
  exp: number
  nonce: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'No token provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if secret is configured
    if (!CROSS_PROJECT_SECRET) {
      console.error('CROSS_PROJECT_SECRET not configured')
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing secret' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Verify and decode token
    const secret = new TextEncoder().encode(CROSS_PROJECT_SECRET)

    let payload: TokenPayload
    try {
      const { payload: decoded } = await jose.jwtVerify(token, secret)
      payload = decoded as unknown as TokenPayload
    } catch (jwtError: any) {
      console.error('JWT verification failed:', jwtError.message)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', details: jwtError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Double-check expiration (jose does this, but be explicit)
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return new Response(
        JSON.stringify({ error: 'Token expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Use service role to manage users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 4. Check if user exists in Project B
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === payload.email)

    let userId: string

    if (existingUser) {
      userId = existingUser.id

      // 5a. Update existing user's metadata with latest name from Project A
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          name: payload.name,
          source: 'cross_project_auth',
          source_project: 'master-dashboard-dc'
        }
      })

      // 5b. Update user profile in usuarios table with latest name from Project A
      try {
        await supabaseAdmin.from('usuarios').upsert({
          id: userId,
          email: payload.email,
          nombre: payload.name,
          estado: 'activo'
        }, { onConflict: 'id' })
      } catch (profileError) {
        console.warn('Could not update user profile:', profileError)
      }
    } else {
      // 6. Create user in Project B if they don't exist
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        email_confirm: true, // Auto-confirm since they're verified in Project A
        user_metadata: {
          name: payload.name,
          source: 'cross_project_auth',
          source_project: 'master-dashboard-dc'
        }
      })

      if (createError) {
        console.error('Failed to create user:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create user', details: createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userId = newUser.user.id

      // 7. Create user profile in Project B's usuarios table (if it exists)
      try {
        await supabaseAdmin.from('usuarios').insert({
          id: userId,
          email: payload.email,
          nombre: payload.name,
          rol: 'Operativo', // Default role in Project B
          estado: 'activo'
        })
      } catch (profileError) {
        // Profile creation is optional, log but don't fail
        console.warn('Could not create user profile (table may not exist):', profileError)
      }
    }

    // 7. Generate magic link for instant login (no email sent)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: payload.email,
      options: {
        redirectTo: `${PROJECT_B_FRONTEND_URL}/`
      }
    })

    if (linkError) {
      console.error('Failed to generate magic link:', linkError)
      return new Response(
        JSON.stringify({ error: 'Failed to generate session', details: linkError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Return the action link for client-side redirect
    // The action_link contains the token_hash needed for session establishment
    return new Response(
      JSON.stringify({
        success: true,
        redirectUrl: linkData.properties?.action_link,
        // Alternative: parse and return just the token for client-side verification
        tokenHash: linkData.properties?.hashed_token,
        type: 'magiclink'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Error validating cross-project token:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
