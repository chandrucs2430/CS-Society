'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');

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
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

function isServiceRoleKey(value) {
  if (/^(?:sb_secret_|service_role)/i.test(value)) return true;
  const payload = value.split('.')[1];
  if (!payload) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role === 'service_role';
  } catch (error) {
    return false;
  }
}

let parsedSupabaseUrl;
try {
  parsedSupabaseUrl = new URL(supabaseUrl);
} catch (error) {
  throw new Error('VITE_SUPABASE_URL is required and must be a valid Supabase project URL.');
}
if (!['https:', 'http:'].includes(parsedSupabaseUrl.protocol) ||
    (parsedSupabaseUrl.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(parsedSupabaseUrl.hostname))) {
  throw new Error('VITE_SUPABASE_URL must use HTTPS (HTTP is allowed only for local Supabase development).');
}
if (!supabaseAnonKey || /your-supabase|placeholder|example/i.test(supabaseAnonKey)) {
  throw new Error('VITE_SUPABASE_ANON_KEY is required; configure the Supabase publishable/anon key.');
}
if (isServiceRoleKey(supabaseAnonKey)) {
  throw new Error('VITE_SUPABASE_ANON_KEY must be a public anon/publishable key. Service-role and secret keys are not accepted.');
}

fs.mkdirSync(output, { recursive: true });
for (const entry of fs.readdirSync(output)) {
  fs.rmSync(path.join(output, entry), { recursive: true, force: true });
}
for (const entry of ['index.html', 'assets', 'scripts', 'styles']) {
  fs.cpSync(path.join(root, entry), path.join(output, entry), { recursive: true });
}

const config = {
  supabaseUrl,
  supabaseAnonKey,
  deploymentEnvironment: process.env.VERCEL_ENV || 'development'
};
fs.writeFileSync(path.join(output, 'app-config.js'), `window.__CS_CONFIG__ = ${JSON.stringify(config)};\n`, { mode: 0o600 });
console.log(`Built CS Society for ${config.deploymentEnvironment}.`);
