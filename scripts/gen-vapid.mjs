// Generates a VAPID (P-256) keypair for web-push and appends it to .env if absent.
// Public key is safe (VITE_-exposed); private key is server-only. Prints only the public.
import crypto from 'node:crypto';
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
const env = existsSync('.env') ? readFileSync('.env','utf8') : '';
if (env.includes('VAPID_PRIVATE_KEY=') && env.match(/VAPID_PRIVATE_KEY=.+/)) { console.log('VAPID already present in .env'); process.exit(0); }
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const jwkPub = publicKey.export({ format: 'jwk' });
const jwkPriv = privateKey.export({ format: 'jwk' });
const x = Buffer.from(jwkPub.x, 'base64url'), y = Buffer.from(jwkPub.y, 'base64url');
const pub = Buffer.concat([Buffer.from([4]), x, y]).toString('base64url');
const priv = jwkPriv.d;
appendFileSync('.env', `\n# VAPID (web-push) — generated ${new Date().toISOString().slice(0,10)}\nVITE_VAPID_PUBLIC_KEY=${pub}\nVAPID_PRIVATE_KEY=${priv}\nVAPID_SUBJECT=mailto:ellisaskey@googlemail.com\n`);
console.log('VAPID public key:', pub);
console.log('(private key written to .env, gitignored)');
