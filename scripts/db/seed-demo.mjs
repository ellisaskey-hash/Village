/* Demo-ready seeding (complete-build exercise; NOT production).
 * A) Horsmonden: accept the clean ingested proposals, reject the Goudhurst spillover + council
 *    sub-committees (materialises places/businesses/organisations/events).
 * B) Dev Village: a rich, clearly-fake demo layer — 12 residents (varied trust), listings with
 *    photos, open + fulfilled requests, upcoming events with RSVPs, an active + a resolved alert,
 *    threads with real back-and-forth, a claimed business + an unclaimed stub, an organisation
 *    with posts, and one auto-hidden listing sitting in the admin queue.
 * Idempotent: the demo layer (demo+%@thelocal.test users, "DEMO " content) is rebuilt each run.
 * All accounts are documented in docs/DEMO_GUIDE.md. Run: node scripts/db/seed-demo.mjs
 * Registry: docs/SCRIPTS_REGISTRY.md. */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await sql.connect(); await sql.query('set search_path=public,extensions;');
const q = (text, params) => sql.query(text, params);
const one = async (text, params) => (await q(text, params)).rows[0];
const rpcOn = () => q("select set_config('app.rpc','true',false)");
const rpcOff = () => q("select set_config('app.rpc','false',false)");

const dev = await one("select id from communities where slug='dev-village'");
const hors = await one("select id from communities where slug='horsmonden'");
const adminProfile = await one("select id from profiles where email='admin@thelocal.test'");
if (!adminProfile) throw new Error('run seed-admin.mjs first (admin@thelocal.test needed)');

// Admin is a member of BOTH communities so the community switcher can reach Horsmonden's
// seeding console (Dev Village for the moderation demo, Horsmonden for the ingestion demo).
await rpcOn();
await q("insert into memberships (profile_id,community_id,trust_level,joined_via,status) select $1,$2,3,'admin','active' where not exists (select 1 from memberships where profile_id=$1 and community_id=$2)", [adminProfile.id, hors.id]);
await rpcOff();

// A tiny CSP-safe SVG "photo" (img-src allows data:). Deterministic, obviously a placeholder.
function photo(label, bg) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='600' height='400' fill='${bg}'/><text x='300' y='210' font-family='sans-serif' font-size='34' fill='white' text-anchor='middle'>${label}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// ---------------------------------------------------------------- A) Horsmonden accept/reject
const REJECT = [/goudhurst/i, /st mary'?s church/i, /star and eagle/i, /^the vine$/i, /green cross/i, /planning committee/i, /finance committee/i, /recreation committee/i];
const horsProps = (await q("select id, kind, payload from seed_proposals where community_id=$1 and status='pending'", [hors.id])).rows;
let accepted = 0, rejected = 0;
for (const p of horsProps) {
  const name = p.payload.name ?? p.payload.title ?? '';
  if (REJECT.some((re) => re.test(name))) {
    await q("update seed_proposals set status='rejected', decided_by=$2, decided_at=now() where id=$1", [p.id, adminProfile.id]);
    rejected++;
    continue;
  }
  const d = p.payload; let newId = null;
  if (p.kind === 'place') newId = (await one("insert into places (community_id,name,kind,description,address,source) values ($1,$2,$3,$4,$5,'seed') returning id", [hors.id, d.name, d.kind ?? 'other', d.description ?? null, d.address ?? null])).id;
  else if (p.kind === 'business') newId = (await one("insert into businesses (community_id,name,categories,description,source) values ($1,$2,$3,$4,'seed') returning id", [hors.id, d.name, d.categories ?? [], d.description ?? null])).id;
  else if (p.kind === 'organisation') newId = (await one("insert into organisations (community_id,name,kind,description,verified_source,source) values ($1,$2,$3,$4,$5,'seed') returning id", [hors.id, d.name, d.kind ?? 'group', d.description ?? null, d.verified_source === true || d.verified_source === 'true'])).id;
  else if (p.kind === 'event') newId = (await one("insert into events (community_id,created_by,title,description,category,location_text,starts_at,rsvp_mode) values ($1,$2,$3,$4,$5,$6,$7,'open') returning id", [hors.id, adminProfile.id, d.title, d.description ?? null, d.category ?? 'community', d.location_text ?? null, d.starts_at])).id;
  await q("update seed_proposals set status='accepted', decided_by=$2, decided_at=now(), merged_into=$3 where id=$1", [p.id, adminProfile.id, newId]);
  accepted++;
}
console.log(`Horsmonden: accepted ${accepted}, rejected ${rejected} (Goudhurst spillover + council sub-committees).`);

// ---------------------------------------------------------------- B) Dev Village demo cleanup
// Purge test-suite residue so the demo DB is pristine (verify-m7 / seed-admin leave fixtures).
// Run seed-demo LAST (after the verify suite) for a clean admin queue.
await q("delete from moderation_actions where target_id in (select id from listings where title like 'M7 %')");
await q("delete from reports where target_id in (select id from listings where title like 'M7 %')");
await q("delete from listings where title like 'M7 %'");
// Clear the non-cascading references test users hold before deleting them.
await q("delete from moderation_actions where actor_id in (select id from profiles where email like 'm7test+%' or email like 'demoseed+%')");
await q("update reports set decided_by = null where decided_by in (select id from profiles where email like 'm7test+%' or email like 'demoseed+%')");
await q("update requests set fulfilled_by = null where fulfilled_by in (select id from profiles where email like 'm7test+%' or email like 'demoseed+%')");
await q("delete from auth.users where email like 'm7test+%' or email like 'demoseed+%'");
await q("delete from moderation_actions where target_id in (select id from listings where title like 'DEMO %')");
await q("delete from reports where target_id in (select id from listings where title like 'DEMO %')");
await q("delete from threads where title like 'DEMO %' or created_by in (select id from profiles where email like 'demo+%@thelocal.test')");
await q("delete from listings where title like 'DEMO %'");
await q("delete from requests where title like 'DEMO %'");
await q("delete from events where title like 'DEMO %'");
await q("delete from alerts where title like 'DEMO %'");
await q("delete from organisations where name like 'DEMO %'");
await q("delete from businesses where name like 'DEMO %'");
await q("delete from places where name like 'DEMO %'");
await q("delete from auth.users where email like 'demo+%@thelocal.test'");

// ---- residents ----
const RESIDENTS = [
  ['priya', 'Priya Kaur', 3], ['tom', 'Tom Fielding', 2], ['grace', 'Grace Odei', 2],
  ['dev', 'Dev Sharma', 1], ['maria', 'Maria Santos', 1], ['jack', 'Jack Reilly', 1],
  ['nina', 'Nina Patel', 1], ['omar', 'Omar Haddad', 0], ['chloe', 'Chloe Baker', 0],
  ['sam', 'Sam Okafor', 1], ['ruth', 'Ruth Levy', 2], ['leo', 'Leo Marsh', 0],
];
const R = {};
for (const [tag, name, trust] of RESIDENTS) {
  const email = `demo+${tag}@thelocal.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: 'demo1234', email_confirm: true });
  if (error) throw new Error(`${tag}: ${error.message}`);
  const id = data.user.id;
  await q("insert into profiles (id,display_name,email,date_of_birth,people_directory_opt_in) values ($1,$2,$3,'1988-01-01',true)", [id, name, email]);
  await rpcOn();
  await q("insert into memberships (profile_id,community_id,trust_level,joined_via,status) values ($1,$2,$3,'seed','active')", [id, dev.id, trust]);
  await rpcOff();
  R[tag] = id;
}
console.log(`Dev Village: created ${RESIDENTS.length} demo residents.`);

// ---- businesses: one claimed, one unclaimed stub ----
const joinery = (await one("insert into businesses (community_id,owner_profile_id,name,categories,description,contact,is_home_business,photos,source,claimed_at,verified_at) values ($1,$2,'DEMO Fielding Joinery',$3,'Bespoke joinery and fitted furniture, based on the High Street.',$4,false,$5,'self',now(),now()) returning id", [dev.id, R.tom, ['joinery', 'carpentry'], JSON.stringify({ phone: '01000 000000', email: 'hello@fielding.example' }), [photo('Fielding Joinery', '#6b4f2f'), photo('Workshop', '#4a3720')]])).id;
await one("insert into businesses (community_id,name,categories,description,photos,source) values ($1,'DEMO Green Leaf Café',$2,'Independent café by the green. Is this yours? Claim it.',$3,'seed') returning id", [dev.id, ['cafe'], [photo('Green Leaf Café', '#2f6b45')]]);

// ---- places (so Directory -> Places is populated) ----
async function place(name, kind, bg) {
  await q("insert into places (community_id,name,kind,description,photos,source) values ($1,$2,$3,$4,$5,'seed')", [dev.id, name, kind, `${name}, at the heart of Dev Village.`, [photo(name, bg)]]);
}
await place('DEMO The Village Green', 'green', '#2e7d46');
await place('DEMO The Bell Inn', 'pub', '#7a4a2f');
await place('DEMO Dev Village Stores', 'shop', '#2f5f7a');
await place('DEMO The Old Hall', 'hall', '#5c3f7a');

// ---- organisation + posts ----
const ra = (await one("insert into organisations (community_id,name,kind,description,verified_source,source) values ($1,'DEMO Dev Village Residents Association','group','The residents association for Dev Village.',true,'self') returning id", [dev.id])).id;
await q("insert into organisation_posts (organisation_id,created_by,kind,title,body) values ($1,$2,'announcement','DEMO Spring clean-up Saturday','Meet at the green at 10am. Bags and gloves provided. Tea and cake after.')", [ra, R.priya]);
await q("insert into organisation_posts (organisation_id,created_by,kind,title,body) values ($1,$2,'announcement','DEMO New benches for the rec','Thanks to everyone who chipped in. The new benches are going in next month.')", [ra, R.priya]);

// ---- listings (with photos) ----
async function listing(by, kind, title, cat, pence, photos, status = 'active') {
  return (await one("insert into listings (community_id,created_by,kind,title,description,category,price_pence,photos,status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id",
    [dev.id, by, kind, title, 'Good condition, collection from Dev Village.', cat, pence, photos, status])).id;
}
const tableId = await listing(R.tom, 'sell', 'DEMO Oak dining table', 'furniture', 12000, [photo('Oak table', '#7c5b3f'), photo('Detail', '#5c4430')]);
await listing(R.maria, 'sell', "DEMO Kids' bike", 'kids', 3500, [photo('Kids bike', '#2b7a4b')]);
await listing(R.jack, 'free', 'DEMO Free moving boxes', 'household', null, [photo('Boxes', '#8a7a3f')]);
await listing(R.nina, 'wanted', 'DEMO Wanted: garden shredder', 'garden', null, []);
await listing(R.sam, 'lend', 'DEMO Lawnmower to borrow', 'garden', null, [photo('Lawnmower', '#3f6f8a')]);
const cotId = await listing(R.grace, 'sell', 'DEMO Cot, barely used', 'kids', 6000, [photo('Cot', '#8a3f5c')]);

// ---- requests (open + fulfilled) ----
async function request(by, title, cat, status = 'open', fulfilledBy = null) {
  return (await one("insert into requests (community_id,created_by,title,description,category,status,fulfilled_by) values ($1,$2,$3,$4,$5,$6,$7) returning id",
    [dev.id, by, title, 'Any help appreciated, thank you.', cat, status, fulfilledBy])).id;
}
await request(R.dev, 'DEMO Can anyone recommend a plumber?', 'recommendations');
await request(R.chloe, 'DEMO Lift to the station Thursday?', 'lifts');
const ladderReq = await request(R.omar, 'DEMO Borrow a ladder this weekend', 'borrow', 'fulfilled', R.jack);

// ---- events + RSVPs ----
const soon = (days, hour) => `now() + interval '${days} days' + interval '${hour} hours'`;
async function event(by, title, cat, days, hour, loc, photoBg) {
  return (await one(`insert into events (community_id,created_by,title,description,category,location_text,starts_at,rsvp_mode,photos) values ($1,$2,$3,$4,$5,$6,${soon(days, hour)},'open',$7) returning id`,
    [dev.id, by, title, 'Everyone welcome. Bring the family.', cat, loc, [photo(title.replace('DEMO ', ''), photoBg)]])).id;
}
const fete = await event(R.priya, 'DEMO Village fete', 'community', 12, 11, 'The Green', '#c2683a');
const cricket = await event(R.sam, 'DEMO Cricket club social', 'sport', 20, 18, 'The Pavilion', '#3a7ac2');
async function rsvp(eventId, who, status = 'going') { await q("insert into event_rsvps (event_id,profile_id,status) values ($1,$2,$3) on conflict do nothing", [eventId, who, status]); }
for (const who of [R.tom, R.maria, R.jack, R.dev, R.nina]) await rsvp(fete, who, 'going');
await rsvp(fete, R.chloe, 'maybe');
for (const who of [R.sam, R.ruth, R.leo]) await rsvp(cricket, who, 'going');

// ---- alerts (active + resolved) ----
await q("insert into alerts (community_id,created_by,tier,category,title,body) values ($1,$2,'community','lostPet','DEMO Lost cat near the green','Ginger tom, answers to Marmalade. Last seen by the shop. Please check your sheds.')", [dev.id, R.maria]);
await q("insert into alerts (community_id,created_by,tier,category,title,body,resolved_at) values ($1,$2,'community','foundItem','DEMO Found keys by the shop','A set of keys on a red fob. Now reunited with their owner.',now())", [dev.id, R.jack]);

// ---- threads with real back-and-forth ----
async function thread(context, contextId, title, a, b, msgs) {
  const t = (await one("insert into threads (community_id,context,context_id,title,created_by,last_message_at) values ($1,$2,$3,$4,$5,now()) returning id", [dev.id, context, contextId, title, a])).id;
  for (const who of [a, b]) await q("insert into thread_participants (thread_id,profile_id) values ($1,$2)", [t, who]);
  let i = 0;
  for (const [who, body] of msgs) {
    await q(`insert into messages (thread_id,sender_id,body,created_at) values ($1,$2,$3, now() - interval '${msgs.length - i} hours')`, [t, who, body]);
    i++;
  }
  await q("update threads set last_message_at=now() where id=$1", [t]);
  return t;
}
await thread('listing', tableId, 'DEMO Oak dining table', R.tom, R.dev, [
  [R.dev, 'Hi Tom, is the oak table still available? Looks lovely.'],
  [R.tom, 'It is. Happy for you to come and see it this weekend.'],
  [R.dev, 'Saturday morning work? I can bring the car.'],
  [R.tom, 'Saturday at 10 is perfect. See you then.'],
]);
await thread('request', ladderReq, 'DEMO Borrow a ladder this weekend', R.omar, R.jack, [
  [R.omar, 'Does anyone have a ladder I could borrow on Saturday?'],
  [R.jack, "You can borrow mine, it's a 3m one. Pop round any time."],
  [R.omar, 'Brilliant, thank you Jack. I really appreciate it.'],
]);
await thread('direct', null, null, R.priya, R.grace, [
  [R.priya, 'Grace, would you be up for helping with the fete stall?'],
  [R.grace, 'Of course, count me in. What time do you need me?'],
  [R.priya, 'From 10. Thank you so much.'],
]);

// ---- one auto-hidden listing sitting in the admin queue ----
for (const who of [R.dev, R.maria, R.nina]) {
  await q("insert into reports (community_id,reporter_id,target_kind,target_id,reason,note,status) values ($1,$2,'listing',$3,'scam','This looks like a scam, price too low and no collection.','open') on conflict do nothing", [dev.id, who, cotId]);
}
await q("update listings set hidden_at=now(), hidden_reason='auto-hidden after reports' where id=$1", [cotId]);
await q("insert into moderation_actions (community_id,actor_id,target_kind,target_id,action,detail) values ($1,null,'listing',$2,'autoHide',$3)", [dev.id, cotId, JSON.stringify({ reports: 3 })]);

console.log('Dev Village: seeded businesses, org + posts, 6 listings, 3 requests, 2 events + RSVPs, 2 alerts, 3 threads, 1 auto-hidden listing.');
console.log('\nDemo layer ready. Accounts documented in docs/DEMO_GUIDE.md.');
await sql.end();
