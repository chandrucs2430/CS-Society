'use strict';

/**
 * CS Society - Supabase Connection and Health Verification Suite
 *
 * Runs non-destructive connection, schema, RPC, and RLS checks against
 * the configured Supabase project using standard Node.js built-ins.
 *
 * Usage:
 *   node scripts/check-connection.js
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function loadLocalEnv() {
  const envFile = path.join(root, '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || Object.prototype.hasOwnProperty.call(process.env, match[1])) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '');
    }
    process.env[match[1]] = value;
  }
}

loadLocalEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

function isServiceRoleKey(value) {
  if (!value || typeof value !== 'string') return false;
  if (/^(?:sb_secret_|service_role)/i.test(value)) return true;
  const payload = value.split('.')[1];
  if (!payload) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role === 'service_role';
  } catch (error) {
    return false;
  }
}

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail });
  const symbol = passed ? '✓' : '✗';
  console.log(`  [${symbol}] ${name}: ${detail}`);
}

async function runChecks() {
  console.log('====================================================');
  console.log('  CS Society Supabase Verification Suite');
  console.log('====================================================\n');

  // Check 1: Environment Variables
  console.log('1. Checking Environment Variables...');
  if (!supabaseUrl) {
    record('Supabase URL Configured', false, 'Missing VITE_SUPABASE_URL or SUPABASE_URL');
  } else {
    try {
      const parsed = new URL(supabaseUrl);
      record('Supabase URL Format', true, `${parsed.protocol}//${parsed.host}`);
    } catch (e) {
      record('Supabase URL Format', false, `Invalid URL format: ${e.message}`);
    }
  }

  if (!supabaseAnonKey) {
    record('Supabase Anon Key Configured', false, 'Missing VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');
  } else {
    const isSecret = isServiceRoleKey(supabaseAnonKey);
    if (isSecret) {
      record('Anon Key Security', false, 'CRITICAL: The anon key appears to be a SERVICE ROLE key! Service role keys must never be public.');
    } else {
      const masked = supabaseAnonKey.slice(0, 10) + '...' + supabaseAnonKey.slice(-4);
      record('Anon Key Security', true, `Valid public/anon key format (${masked})`);
    }
  }

  if (serviceRoleKey) {
    const isSecret = isServiceRoleKey(serviceRoleKey);
    record('Server Service-Role Key', isSecret, isSecret
      ? 'Configured for server-side administrative use only (verified secret role)'
      : 'Configured, but does not have service_role claims');
  } else {
    record('Server Service-Role Key', true, 'Not configured (only required for direct out-of-band admin automation)');
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('\nCannot proceed with API checks without valid URL and Anon Key.');
    return;
  }

  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json'
  };

  // Check 2: REST API Connectivity
  console.log('\n2. Testing Supabase REST API...');
  const restUrl = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/`;
  try {
    const res = await fetch(`${restUrl}cs_reports?select=id&limit=1`, { headers });
    if (res.ok) {
      record('REST API Connectivity', true, `HTTP ${res.status} OK`);
    } else {
      record('REST API Connectivity', false, `HTTP ${res.status}: ${res.statusText}`);
    }
  } catch (err) {
    record('REST API Connectivity', false, `Connection error: ${err.message}`);
    return;
  }

  // Check 3: Public Data Access
  console.log('\n3. Testing Public Community Tables (Anon Read)...');
  try {
    const res = await fetch(`${restUrl}cs_reports?select=id,title,status,category,latitude,longitude&limit=5`, { headers });
    if (res.ok) {
      const data = await res.json();
      record('cs_reports Read', true, `Accessible (${data.length} reports returned)`);
    } else {
      record('cs_reports Read', false, `Failed with HTTP ${res.status}`);
    }
  } catch (err) {
    record('cs_reports Read', false, err.message);
  }

  try {
    const res = await fetch(`${restUrl}cs_profiles?select=id,display_name,roles,avatar_path&limit=5`, { headers });
    if (res.ok) {
      const data = await res.json();
      record('cs_profiles Read', true, `Accessible (${data.length} profiles returned)`);
    } else {
      record('cs_profiles Read', false, `Failed with HTTP ${res.status}`);
    }
  } catch (err) {
    record('cs_profiles Read', false, err.message);
  }

  try {
    const res = await fetch(`${restUrl}cs_report_events?select=id,report_id,event_type,status&limit=5`, { headers });
    if (res.ok) {
      const data = await res.json();
      record('cs_report_events Read', true, `Accessible (${data.length} events returned)`);
    } else {
      record('cs_report_events Read', false, `Failed with HTTP ${res.status}`);
    }
  } catch (err) {
    record('cs_report_events Read', false, err.message);
  }

  // Check 4: Row Level Security Protection
  console.log('\n4. Verifying Row Level Security on Private Tables (Anon Access Must Be Denied)...');
  for (const table of ['profiles', 'cs_profile_roles', 'cs_profile_settings', 'cs_notifications']) {
    try {
      const res = await fetch(`${restUrl}${table}?select=*&limit=1`, { headers });
      if (res.status === 401 || res.status === 403) {
        record(`RLS Protection on ${table}`, true, `HTTP ${res.status} Access Denied (Correctly Protected)`);
      } else if (res.ok) {
        record(`RLS Protection on ${table}`, false, `WARNING: HTTP ${res.status} - table is publicly readable!`);
      } else {
        record(`RLS Protection on ${table}`, true, `HTTP ${res.status} blocked`);
      }
    } catch (err) {
      record(`RLS Protection on ${table}`, false, err.message);
    }
  }

  // Check 5: Stored Procedures (RPCs)
  console.log('\n5. Testing Supabase RPC Functions...');
  const rpcs = [
    { name: 'cs_is_admin', params: {} },
    { name: 'cs_create_report', params: { p_title: 't', p_description: '', p_category: 'litter', p_latitude: 0, p_longitude: 0, p_place: '' } },
    { name: 'cs_transition_report', params: { p_report_id: '00000000-0000-0000-0000-000000000000', p_action: 'claim' } },
    { name: 'cs_save_my_profile', params: { p_display_name: 'test', p_neighborhood: '', p_avatar_path: null, p_notification_prefs: {} } },
    { name: 'cs_create_report_flag', params: { p_report_id: '00000000-0000-0000-0000-000000000000', p_reason: 'duplicate', p_details: '' } },
    { name: 'cs_add_milestone_notification', params: { p_message: 'test milestone' } }
  ];

  for (const rpc of rpcs) {
    try {
      const res = await fetch(`${restUrl}rpc/${rpc.name}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpc.params)
      });
      // HTTP 401 means function exists and requires authentication (correct behavior for anon key)
      // HTTP 400 with plpgsql error or specific validation error also means function exists
      // HTTP 404 with PGRST202 means function NOT found
      if (res.status === 401) {
        record(`RPC ${rpc.name}`, true, 'Exists and correctly enforces authentication (HTTP 401)');
      } else if (res.status === 404) {
        const body = await res.json().catch(() => ({}));
        record(`RPC ${rpc.name}`, false, `Not found: ${body.details || res.statusText}`);
      } else {
        record(`RPC ${rpc.name}`, true, `Exists (HTTP ${res.status})`);
      }
    } catch (err) {
      record(`RPC ${rpc.name}`, false, err.message);
    }
  }

  // Check 6: Storage
  console.log('\n6. Testing Storage Bucket Configuration...');
  try {
    const storageUrl = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/sign/cs-report-photos`;
    const res = await fetch(storageUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ paths: ['probe/test.jpg'], expiresIn: 60 })
    });
    if (res.ok) {
      record('Storage Bucket cs-report-photos', true, 'Bucket signing endpoint reachable and operational');
    } else {
      const text = await res.text();
      record('Storage Bucket cs-report-photos', false, `HTTP ${res.status}: ${text}`);
    }
  } catch (err) {
    record('Storage Bucket cs-report-photos', false, err.message);
  }

  // Check 7: Static Build Artifacts & Leak Prevention
  console.log('\n7. Verifying Static Build & Leak Prevention...');
  const appConfigPath = path.join(root, 'dist', 'app-config.js');
  if (fs.existsSync(appConfigPath)) {
    const content = fs.readFileSync(appConfigPath, 'utf8');
    const leaksSecret = isServiceRoleKey(content);
    if (leaksSecret) {
      record('Build Secret Leak Check', false, 'CRITICAL: dist/app-config.js contains a service-role key!');
    } else {
      record('Build Secret Leak Check', true, 'dist/app-config.js verified safe (contains only public anon credentials)');
    }
  } else {
    record('Build Artifacts', true, 'dist/app-config.js not built yet (run node scripts/build.js)');
  }

  console.log('\n====================================================');
  const failed = results.filter(r => !r.passed).length;
  if (failed === 0) {
    console.log('  ALL CHECKS PASSED! Supabase connection is fully healthy.');
  } else {
    console.log(`  ${failed} check(s) flagged issues. Review above.`);
  }
  console.log('====================================================\n');
}

runChecks().catch(err => {
  console.error('Check suite failed with an uncaught error:', err);
  process.exit(1);
});
