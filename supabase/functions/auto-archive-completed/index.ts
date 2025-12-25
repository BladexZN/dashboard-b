import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Auto-archive requests that have been completed (Listo/Entregado) for more than 30 days
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Find requests where completed_at is older than 30 days and not already deleted
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString()

    // Get requests to archive
    const { data: requestsToArchive, error: fetchError } = await supabaseAdmin
      .from('solicitudes')
      .select('id, folio, producto, completed_at')
      .eq('is_deleted', false)
      .not('completed_at', 'is', null)
      .lt('completed_at', cutoffDate)

    if (fetchError) {
      console.error('Error fetching requests to archive:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch requests', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!requestsToArchive || requestsToArchive.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No requests to archive',
          archived_count: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Archive each request
    const archiveTimestamp = new Date().toISOString()
    const requestIds = requestsToArchive.map(r => r.id)

    const { error: updateError } = await supabaseAdmin
      .from('solicitudes')
      .update({
        is_deleted: true,
        deleted_at: archiveTimestamp,
        deleted_by: null // System auto-archive, no user ID
      })
      .in('id', requestIds)

    if (updateError) {
      console.error('Error archiving requests:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to archive requests', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log to audit table if it exists
    try {
      const auditEntries = requestsToArchive.map(req => ({
        solicitud_id: req.id,
        estado: 'Archivado',
        usuario_id: null,
        nota: `Auto-archived after 30 days (completed: ${req.completed_at})`
      }))

      await supabaseAdmin.from('estados_solicitud').insert(auditEntries)
    } catch (auditError) {
      console.warn('Could not log to audit table:', auditError)
      // Don't fail the operation if audit logging fails
    }

    console.log(`Auto-archived ${requestsToArchive.length} requests:`, requestsToArchive.map(r => r.folio))

    return new Response(
      JSON.stringify({
        success: true,
        message: `Archived ${requestsToArchive.length} completed requests older than 30 days`,
        archived_count: requestsToArchive.length,
        archived_folios: requestsToArchive.map(r => r.folio)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Error in auto-archive function:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
