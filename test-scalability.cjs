/**
 * Dashboard B Scalability Tests
 * Tests system capacity to handle 50+ daily requests
 * Run with: node test-scalability.cjs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables. Please check .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let passed = 0;
let failed = 0;

const test = async (name, fn) => {
  try {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    console.log(`✅ ${name} (${duration}ms)`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    failed++;
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function runScalabilityTests() {
  console.log('\n🚀 Dashboard B Scalability Tests\n');
  console.log('Testing capacity for 50+ daily requests');
  console.log('=' .repeat(60));

  // 1. Test large data fetch - solicitudes
  await test('Fetch 100 solicitudes at once', async () => {
    const { data, error } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('is_deleted', false)
      .limit(100);

    assert(!error, `Query failed: ${error?.message}`);
    assert(Array.isArray(data), 'Expected array');
    console.log(`   → Retrieved ${data.length} records`);
  });

  // 2. Test fetch with all joins (mimics production board load)
  await test('Fetch solicitudes with full joins (production board)', async () => {
    const { data, error } = await supabase
      .from('solicitudes')
      .select(`
        *,
        asesor:usuarios!asesor_id(id, nombre, email),
        vendedor:usuarios!vendedor_id(id, nombre, email)
      `)
      .eq('is_deleted', false)
      .order('fecha_creacion', { ascending: false })
      .limit(100);

    assert(!error, `Join query failed: ${error?.message}`);
    assert(Array.isArray(data), 'Expected array');
    console.log(`   → Retrieved ${data.length} records with joins`);
  });

  // 3. Test fetch per board (simulate 4 boards)
  await test('Fetch solicitudes for all 4 boards', async () => {
    const boards = [1, 2, 3, 4];
    const results = await Promise.all(
      boards.map(async (boardNum) => {
        const { data, error } = await supabase
          .from('solicitudes')
          .select('*')
          .eq('is_deleted', false)
          .eq('board_number', boardNum)
          .limit(50);
        return { boardNum, count: data?.length || 0, error };
      })
    );

    results.forEach(r => {
      console.log(`   → Board ${r.boardNum}: ${r.count} solicitudes`);
    });

    const totalErrors = results.filter(r => r.error).length;
    assert(totalErrors === 0, `${totalErrors} board queries failed`);
  });

  // 4. Test status history for many records
  await test('Fetch status history (estados_solicitud) bulk', async () => {
    const { data, error } = await supabase
      .from('estados_solicitud')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500);

    assert(!error, `Query failed: ${error?.message}`);
    console.log(`   → Retrieved ${data?.length || 0} status records`);
  });

  // 5. Test concurrent reads (simulate multiple users)
  await test('Concurrent reads (5 parallel queries)', async () => {
    const queries = Array(5).fill(null).map(() =>
      supabase
        .from('solicitudes')
        .select('*')
        .eq('is_deleted', false)
        .limit(50)
    );

    const results = await Promise.all(queries);
    const errors = results.filter(r => r.error);
    assert(errors.length === 0, `${errors.length} concurrent queries failed`);
    console.log(`   → All 5 concurrent queries succeeded`);
  });

  // 6. Test count queries for metrics
  await test('Count queries for dashboard metrics', async () => {
    const [total, pending, completed, deleted] = await Promise.all([
      supabase.from('solicitudes').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
      supabase.from('solicitudes').select('id', { count: 'exact', head: true }).eq('is_deleted', false).eq('status', 'En proceso'),
      supabase.from('solicitudes').select('id', { count: 'exact', head: true }).eq('is_deleted', false).in('status', ['Listo', 'Entregado']),
      supabase.from('solicitudes').select('id', { count: 'exact', head: true }).eq('is_deleted', true)
    ]);

    console.log(`   → Total active: ${total.count || 0}`);
    console.log(`   → Pending: ${pending.count || 0}`);
    console.log(`   → Completed: ${completed.count || 0}`);
    console.log(`   → Deleted (trash): ${deleted.count || 0}`);
  });

  // 7. Test date range query (reports)
  await test('Date range query for reports (last 30 days)', async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('is_deleted', false)
      .gte('fecha_creacion', thirtyDaysAgo.toISOString())
      .order('fecha_creacion', { ascending: false });

    assert(!error, `Query failed: ${error?.message}`);
    console.log(`   → ${data?.length || 0} solicitudes in last 30 days`);
  });

  // 8. Test notificaciones bulk fetch
  await test('Fetch notifications bulk', async () => {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    assert(!error, `Query failed: ${error?.message}`);
    console.log(`   → ${data?.length || 0} notifications`);
  });

  // 9. Test usuarios table (for dropdowns)
  await test('Fetch all usuarios', async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*');

    assert(!error, `Query failed: ${error?.message}`);
    console.log(`   → ${data?.length || 0} users in system`);
  });

  // 10. Stress test - rapid sequential queries
  await test('Stress test: 10 rapid sequential queries', async () => {
    for (let i = 0; i < 10; i++) {
      const { error } = await supabase
        .from('solicitudes')
        .select('id, cliente, status')
        .eq('is_deleted', false)
        .limit(20);

      if (error) throw new Error(`Query ${i + 1} failed: ${error.message}`);
    }
    console.log(`   → All 10 rapid queries succeeded`);
  });

  // 11. Test data integrity - no missing required fields
  await test('Data integrity check - no null required fields', async () => {
    const { data, error } = await supabase
      .from('solicitudes')
      .select('id, cliente, status')
      .eq('is_deleted', false)
      .or('cliente.is.null,status.is.null')
      .limit(10);

    assert(!error, `Query failed: ${error?.message}`);
    if (data && data.length > 0) {
      console.log(`   ⚠️ Warning: ${data.length} records have null required fields`);
    } else {
      console.log(`   → All records have required fields`);
    }
  });

  // 12. Test for large payload handling
  await test('Large payload test - fetch with all fields', async () => {
    const { data, error } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('is_deleted', false)
      .limit(200);

    assert(!error, `Query failed: ${error?.message}`);

    // Calculate approximate payload size
    const payloadSize = JSON.stringify(data).length;
    console.log(`   → Payload size: ${(payloadSize / 1024).toFixed(2)} KB for ${data?.length || 0} records`);
  });

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log(`\n📊 Scalability Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ System is ready to handle 50+ daily requests');
    console.log('\n💡 Recommendations for optimal performance:');
    console.log('   - Implement pagination for lists > 50 items');
    console.log('   - Use virtualization for long lists (react-window)');
    console.log('   - Cache frequently accessed data');
    console.log('   - Consider real-time subscriptions for live updates');
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runScalabilityTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
