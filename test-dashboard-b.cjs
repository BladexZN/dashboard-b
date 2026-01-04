/**
 * Dashboard B Functional Tests
 * Run with: node test-dashboard-b.cjs
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
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    failed++;
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function runTests() {
  console.log('\n🧪 Dashboard B Functional Tests\n');
  console.log('=' .repeat(50));

  // 1. Test Database Connection
  await test('Supabase connection', async () => {
    const { data, error } = await supabase.from('usuarios').select('count').limit(1);
    assert(!error, `Connection failed: ${error?.message}`);
  });

  // 2. Test usuarios table access
  await test('Read usuarios table', async () => {
    const { data, error } = await supabase.from('usuarios').select('*').limit(5);
    assert(!error, `Failed to read usuarios: ${error?.message}`);
    assert(Array.isArray(data), 'Expected array of users');
  });

  // 3. Test solicitudes table access
  await test('Read solicitudes table', async () => {
    const { data, error } = await supabase.from('solicitudes').select('*').eq('is_deleted', false).limit(5);
    assert(!error, `Failed to read solicitudes: ${error?.message}`);
    assert(Array.isArray(data), 'Expected array of solicitudes');
  });

  // 4. Test estados_solicitud table access
  await test('Read estados_solicitud table', async () => {
    const { data, error } = await supabase.from('estados_solicitud').select('*').limit(5);
    assert(!error, `Failed to read estados_solicitud: ${error?.message}`);
    assert(Array.isArray(data), 'Expected array of estados');
  });

  // 5. Test notificaciones table access
  await test('Read notificaciones table', async () => {
    const { data, error } = await supabase.from('notificaciones').select('*').limit(5);
    assert(!error, `Failed to read notificaciones: ${error?.message}`);
    assert(Array.isArray(data), 'Expected array of notificaciones');
  });

  // 6. Test storage bucket access
  await test('Access request-logos storage bucket', async () => {
    const { data, error } = await supabase.storage.from('request-logos').list('logos', { limit: 1 });
    // May return empty array if no files, that's OK
    assert(!error || error.message.includes('not found'), `Storage access failed: ${error?.message}`);
  });

  // 7. Test solicitud with join
  await test('Solicitudes with asesor join', async () => {
    const { data, error } = await supabase
      .from('solicitudes')
      .select(`*, asesor:usuarios!asesor_id(id, nombre)`)
      .eq('is_deleted', false)
      .limit(3);
    assert(!error, `Join query failed: ${error?.message}`);
    assert(Array.isArray(data), 'Expected array of solicitudes with asesor');
  });

  // 8. Test date range filtering
  await test('Date range filtering on solicitudes', async () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('is_deleted', false)
      .gte('fecha_creacion', startOfMonth)
      .lte('fecha_creacion', endOfMonth)
      .limit(10);

    assert(!error, `Date range query failed: ${error?.message}`);
    assert(Array.isArray(data), 'Expected array of filtered solicitudes');
  });

  // 9. Test soft delete query
  await test('Soft delete query (trash)', async () => {
    const { data, error } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('is_deleted', true)
      .limit(5);

    assert(!error, `Soft delete query failed: ${error?.message}`);
    assert(Array.isArray(data), 'Expected array of deleted solicitudes');
  });

  // 10. Test status history ordering
  await test('Status history ordering', async () => {
    const { data, error } = await supabase
      .from('estados_solicitud')
      .select('*')
      .order('timestamp', { ascending: true })
      .limit(10);

    assert(!error, `Status ordering query failed: ${error?.message}`);
    assert(Array.isArray(data), 'Expected ordered array of estados');

    // Verify ordering
    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1].timestamp);
      const curr = new Date(data[i].timestamp);
      assert(prev <= curr, 'Timestamps should be in ascending order');
    }
  });

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
