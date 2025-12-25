import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Dashboard A (Master) Supabase credentials
const DASHBOARD_A_URL = Deno.env.get('DASHBOARD_A_SUPABASE_URL') || 'https://jqjkiyspagztsvrvxmey.supabase.co'
const DASHBOARD_A_SERVICE_KEY = Deno.env.get('DASHBOARD_A_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
}

interface NotificationPayload {
  user_id: string;         // User ID in Dashboard A (original creator)
  user_email: string;      // Email to find user in Dashboard A
  request_id: string;      // Request ID (folio)
  request_uuid: string;    // Request UUID
  type: 'correction' | 'ready' | 'team_complete';
  product_name: string;
  dashboard_source: 'video' | 'design';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: NotificationPayload = await req.json()

    if (!payload.user_email || !payload.request_id || !payload.type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_email, request_id, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!DASHBOARD_A_SERVICE_KEY) {
      console.error('DASHBOARD_A_SERVICE_ROLE_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing Dashboard A credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Connect to Dashboard A's Supabase
    const dashboardAClient = createClient(
      DASHBOARD_A_URL,
      DASHBOARD_A_SERVICE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Find the user in Dashboard A by email
    const { data: users, error: userError } = await dashboardAClient
      .from('usuarios')
      .select('id')
      .eq('email', payload.user_email)
      .limit(1)

    if (userError || !users || users.length === 0) {
      console.warn('User not found in Dashboard A:', payload.user_email)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'User not found in Dashboard A',
          email: payload.user_email
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = users[0].id

    // Build notification message based on type
    let message = ''
    switch (payload.type) {
      case 'correction':
        message = `La solicitud "${payload.product_name}" (${payload.request_id}) necesita corrección`
        break
      case 'ready':
        message = `La solicitud "${payload.product_name}" (${payload.request_id}) está lista`
        break
      case 'team_complete':
        message = `El equipo ha completado "${payload.product_name}" (${payload.request_id})`
        break
    }

    // Insert notification into Dashboard A's notifications table
    const { error: insertError } = await dashboardAClient
      .from('notifications')
      .insert({
        user_id: userId,
        request_id: payload.request_uuid,
        type: payload.type,
        message: message,
        read: false,
        dashboard_source: payload.dashboard_source,
        meta: {
          folio: payload.request_id,
          product: payload.product_name,
          source_dashboard: payload.dashboard_source === 'video' ? 'Dashboard B' : 'Dashboard C'
        }
      })

    if (insertError) {
      console.error('Error inserting notification:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to insert notification', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Cross-project notification sent to Dashboard A for user ${payload.user_email}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification sent to Dashboard A',
        user_id: userId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Error in notify-cross-project function:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
