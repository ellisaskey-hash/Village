import { readFileSync } from 'node:fs';
import pg from 'pg';
const env=Object.fromEntries(readFileSync('.env','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim()]}));
const c=new pg.Client({connectionString:env.SUPABASE_DB_URL,ssl:{rejectUnauthorized:false}});
await c.connect(); await c.query('set search_path=public,extensions;');
await c.query(readFileSync(process.argv[2],'utf8'));
console.log('executed',process.argv[2]);
await c.end();
