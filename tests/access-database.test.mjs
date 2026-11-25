import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migrationUrls = [
  new URL('../supabase/migrations/20261125192133_pmdf_flashcards_access.sql', import.meta.url),
  new URL('../supabase/migrations/20261125201746_pmdf_legacy_email_guard.sql', import.meta.url),
];
const alice = '00000000-0000-4000-8000-000000000001';
const bob = '00000000-0000-4000-8000-000000000002';

test('Postgres enforces purchase ownership, lifecycle and private catalogue', async t => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      insert into auth.users values ('${alice}'),('${bob}');
    `);
    for (const migrationUrl of migrationUrls) {
      const migration = await readFile(migrationUrl, 'utf8');
      await db.exec(migration);
      await db.exec(migration); // Safe re-application does not change existing data or grants.
    }
    await db.exec(`
      update pmdf_private.access_config
      set hotmart_product_id='9071720', hottok_sha256=repeat('a',64), enabled=true, expected_cards=1;
      insert into pmdf_private.access_catalog(singleton,payload,source_sha256)
      values(true,'{"format":"PMDF-ANKI-IMPORT-v1","source":"ANKI","cards":[{"id":"test-only","front":"Question","back":"Answer"}]}',repeat('b',64));
    `);
    const row = async (sql, values = []) => (await db.query(sql, values)).rows[0];
    const now = new Date((await row('select now() as date')).date).toISOString();
    const approved = new Date(Date.parse(now) - 1000).toISOString();
    const reset = () => db.exec('reset role; truncate pmdf_private.access_events, pmdf_private.access_purchases, pmdf_private.access_grants, pmdf_private.access_identity_verifications;');
    async function ingest({ id = 'event-approved-01', transaction = 'HPPURCHASE000001', email = 'alice@example.test', state = 'approved',
      event = 'PURCHASE_APPROVED', approval = approved, created = now, product = '9071720', hash = 'a'.repeat(64) } = {}) {
      return (await row('select public.pmdf_access_ingest_hotmart($1,$2,$3,$4,$5,$6,$7::timestamptz,$8::timestamptz,$9) as result',
        [id, transaction, product, email, state, event, created, approval, hash])).result;
    }
    async function access(id = alice, email = 'alice@example.test', action = 'status',
      { createdAt = approved, confirmedAt = now } = {}) {
      return (await row('select public.pmdf_access_read($1::uuid,$2,$3,$4::timestamptz,$5::timestamptz) as result',
        [id, email, action, createdAt, confirmedAt])).result;
    }

    await t.test('public and authenticated roles cannot read data, settings or invoke privileged RPCs', async () => {
      for (const role of ['anon', 'authenticated']) {
        await db.exec('set role ' + role);
        await assert.rejects(db.query('select * from pmdf_private.access_catalog'), /permission denied/);
        await assert.rejects(db.query('select * from pmdf_private.access_identity_verifications'), /permission denied/);
        await assert.rejects(db.query('select public.pmdf_access_webhook_settings()'), /permission denied/);
        await assert.rejects(access(), /permission denied/);
        await assert.rejects(ingest(), /permission denied/);
        await db.exec('reset role');
      }
      const functions = (await db.query("select proname,prosecdef from pg_proc where proname like 'pmdf_access_%'")).rows;
      assert.equal(functions.length, 3);
      assert.ok(functions.every(f => f.prosecdef === false));
      assert.equal((await row("select to_regprocedure('public.pmdf_access_read(uuid,text,text)') as old")).old, null);
    });

    await t.test('legacy auto-confirmation cannot claim a purchase or bypass identity checks with an owner grant', async () => {
      await reset(); await ingest();
      const legacy = { createdAt: '2026-11-23T12:00:00Z', confirmedAt: '2026-11-23T12:00:00Z' };
      const status = await access(alice, 'alice@example.test', 'status', legacy);
      assert.equal(status.active, false);
      assert.equal(status.reason, 'email_reverification_required');
      assert.equal('cards' in await access(alice, 'alice@example.test', 'catalog', legacy), false);
      assert.equal((await row('select user_id from pmdf_private.access_purchases')).user_id, null);
      await db.query("insert into pmdf_private.access_grants(user_id,grant_type,expires_at,reason) values($1,'owner',now()+interval '1 hour','Local test only')", [alice]);
      assert.equal((await access(alice, 'alice@example.test', 'catalog', legacy)).reason, 'email_reverification_required');
      assert.equal((await row('select user_id from pmdf_private.access_purchases')).user_id, null);
    });

    await t.test('new accounts need valid creation and confirmation after the private cutoff', async () => {
      await reset(); await ingest();
      const invalidDates = [
        { createdAt: null, confirmedAt: now },
        { createdAt: approved, confirmedAt: null },
        { createdAt: 'infinity', confirmedAt: 'infinity' },
        { createdAt: '2026-11-23T12:00:00Z', confirmedAt: now },
        { createdAt: approved, confirmedAt: '2026-11-23T12:00:00Z' },
        { createdAt: now, confirmedAt: approved },
        { createdAt: approved, confirmedAt: new Date(Date.parse(now) + 600000).toISOString() },
      ];
      for (const dates of invalidDates) {
        assert.equal((await access(alice, 'alice@example.test', 'status', dates)).reason, 'email_reverification_required');
        assert.equal((await row('select user_id from pmdf_private.access_purchases')).user_id, null);
      }
      assert.equal((await access()).active, true);
      assert.equal((await row('select user_id from pmdf_private.access_purchases')).user_id, alice);
    });

    await t.test('a future legacy exception must be admin-only, current, exact-email and is not itself a content entitlement', async () => {
      await reset();
      const legacy = { createdAt: '2026-11-23T12:00:00Z', confirmedAt: '2026-11-23T12:00:00Z' };
      await db.exec('set role service_role');
      await assert.rejects(db.query("insert into pmdf_private.access_identity_verifications(user_id,verified_email,verified_at,evidence_reference) values($1,'alice@example.test',now(),'Local test only')", [alice]), /permission denied/);
      await db.exec('reset role');
      await db.query("insert into pmdf_private.access_identity_verifications(user_id,verified_email,verified_at,evidence_reference) values($1,'other@example.test',now(),'Local test only')", [alice]);
      assert.equal((await access(alice, 'alice@example.test', 'status', legacy)).reason, 'email_reverification_required');
      await db.exec("update pmdf_private.access_identity_verifications set verified_email='alice@example.test',verified_at='2026-11-23T12:00:00Z'");
      assert.equal((await access(alice, 'alice@example.test', 'status', legacy)).reason, 'email_reverification_required');
      await db.exec("update pmdf_private.access_identity_verifications set verified_at=now()+interval '1 hour'");
      assert.equal((await access(alice, 'alice@example.test', 'status', legacy)).reason, 'email_reverification_required');
      await db.exec('update pmdf_private.access_identity_verifications set verified_at=now(),revoked_at=now()');
      assert.equal((await access(alice, 'alice@example.test', 'status', legacy)).reason, 'email_reverification_required');
      await db.exec('update pmdf_private.access_identity_verifications set revoked_at=null');
      await db.exec('set role service_role');
      assert.equal((await access(alice, 'alice@example.test', 'status', legacy)).reason, 'no_purchase');
      assert.equal('cards' in await access(alice, 'alice@example.test', 'catalog', legacy), false);
      await db.exec('reset role');
      await ingest();
      assert.equal((await access(alice, 'alice@example.test', 'status', legacy)).active, true);
      assert.equal((await access(alice, 'different@example.test', 'status', legacy)).reason, 'email_reverification_required');
    });

    await t.test('service_role can ingest and only verified identity supplied by server gets its own purchase', async () => {
      await reset(); await db.exec('set role service_role');
      assert.equal(await ingest(), 'processed');
      assert.equal((await access(bob, 'bob@example.test')).reason, 'no_purchase');
      const owned = await access();
      assert.equal(owned.active, true);
      assert.equal(owned.reason, 'active');
      assert.ok(Date.parse(owned.expires_at) > Date.parse(now));
      const catalog = await access(alice, 'alice@example.test', 'catalog');
      assert.equal(catalog.format, 'PMDF-ANKI-IMPORT-v1');
      assert.equal(catalog.cards.length, 1);
      const denied = await access(bob, 'bob@example.test', 'catalog');
      assert.equal(denied.active, false);
      assert.equal('cards' in denied, false);
      await db.exec('reset role');
    });

    await t.test('duplicate event is idempotent; reusing its ID with different bytes is rejected', async () => {
      await reset();
      assert.equal(await ingest(), 'processed');
      assert.equal(await ingest(), 'duplicate');
      assert.equal(await ingest({ hash: 'b'.repeat(64) }), 'event_conflict');
      assert.equal(Number((await row('select count(*) as count from pmdf_private.access_events')).count), 1);
      assert.equal(Number((await row('select count(*) as count from pmdf_private.access_purchases')).count), 1);
    });

    await t.test('six calendar months clamp month-end and do not mean 180 days', async () => {
      await reset();
      assert.equal(await ingest({ approval: '2025-08-31T10:15:00Z' }), 'processed');
      const result = await row('select expires_at from pmdf_private.access_purchases');
      assert.equal(new Date(result.expires_at).toISOString(), '2026-02-28T10:15:00.000Z');
      assert.equal((await access()).reason, 'expired');
      assert.equal('cards' in await access(alice, 'alice@example.test', 'catalog'), false);
    });

    await t.test('COMPLETE or another approval cannot extend the original term', async () => {
      await reset();
      await ingest({ approval: '2026-01-31T10:15:00Z' });
      await ingest({ id: 'event-complete-01', event: 'PURCHASE_COMPLETE', approval: '2026-03-01T10:15:00Z' });
      const result = await row('select approved_at,expires_at from pmdf_private.access_purchases');
      assert.equal(new Date(result.approved_at).toISOString(), '2026-01-31T10:15:00.000Z');
      assert.equal(new Date(result.expires_at).toISOString(), '2026-07-31T10:15:00.000Z');
    });

    await t.test('refund immediately denies the catalogue and late approval never resurrects that transaction', async () => {
      await reset(); await ingest();
      assert.equal((await access()).active, true);
      assert.equal(await ingest({ id: 'event-refunded-01', state: 'revoked', event: 'PURCHASE_REFUNDED' }), 'processed');
      assert.equal((await access()).reason, 'revoked');
      assert.equal('cards' in await access(alice, 'alice@example.test', 'catalog'), false);
      assert.equal(await ingest({ id: 'event-late-approval-01' }), 'processed');
      assert.equal((await access()).reason, 'revoked');
    });

    await t.test('a revocation arriving before approval creates a tombstone; a new paid transaction can restore access', async () => {
      await reset();
      await ingest({ id: 'refund-before-approval', state: 'revoked', event: 'PURCHASE_CHARGEBACK', approval: null, email: '' });
      await ingest();
      assert.equal((await access()).reason, 'revoked');
      await ingest({ id: 'repurchase-new-event', transaction: 'HPSECOND0000001' });
      assert.equal((await access()).active, true);
    });

    await t.test('refund with corrected buyer email revokes the transaction without transferring ownership', async () => {
      await reset(); await ingest(); await access();
      assert.equal(await ingest({ id: 'refund-corrected-email', state: 'revoked', event: 'PURCHASE_REFUNDED', email: 'bob@example.test' }), 'processed');
      const owner = await row('select user_id,buyer_email,state from pmdf_private.access_purchases');
      assert.equal(owner.user_id, alice);
      assert.equal(owner.buyer_email, 'alice@example.test');
      assert.equal(owner.state, 'revoked');
      assert.equal((await access()).reason, 'revoked');
      assert.equal('cards' in await access(alice, 'alice@example.test', 'catalog'), false);
      assert.equal((await access(bob, 'bob@example.test')).active, false);
    });

    await t.test('a main-product sale and an attempted transaction reassignment cannot grant access', async () => {
      await reset();
      assert.equal(await ingest({ product: '9062601' }), 'other_product');
      assert.equal((await access()).reason, 'no_purchase');
      assert.equal(await ingest(), 'processed');
      assert.equal(await ingest({ id: 'event-hijack-01', email: 'bob@example.test' }), 'transaction_identity_mismatch');
      assert.equal((await access(bob, 'bob@example.test')).active, false);
    });

    await t.test('ownership is bound once, surviving email change without transferring to a recycled email', async () => {
      await reset(); await ingest(); await access();
      assert.equal((await access(alice, 'new-alice@example.test')).active, true);
      assert.equal((await access(bob, 'alice@example.test')).active, false);
    });

    await t.test('manual reviewer grants are explicit, limited and independent from purchase history', async () => {
      await reset();
      await db.query("insert into pmdf_private.access_grants(user_id,grant_type,expires_at,reason) values($1,'review',now()+interval '1 hour','Automated local test')", [bob]);
      assert.equal((await access(bob, 'bob@example.test')).active, true);
      assert.equal((await access()).active, false);
      assert.equal(Number((await row('select count(*) as count from pmdf_private.access_purchases')).count), 0);
      await db.exec("update pmdf_private.access_grants set expires_at=now()-interval '1 second'");
      assert.equal((await access(bob, 'bob@example.test')).active, false);
    });

    await t.test('catalogue remains closed during configuration or an incomplete import', async () => {
      await reset(); await ingest();
      await db.exec('update pmdf_private.access_config set enabled=false');
      assert.equal((await access()).reason, 'not_ready');
      await db.exec('update pmdf_private.access_config set enabled=true,expected_cards=2');
      assert.equal((await access(alice, 'alice@example.test', 'catalog')).reason, 'not_ready');
      await db.exec('update pmdf_private.access_config set expected_cards=1');
      assert.equal((await access()).active, true);
    });

    await t.test('RLS also denies rows if an accidental table SELECT grant is added', async () => {
      await db.exec('grant usage on schema pmdf_private to authenticated; grant select on pmdf_private.access_catalog to authenticated; set role authenticated;');
      assert.deepEqual((await db.query('select * from pmdf_private.access_catalog')).rows, []);
      await db.exec('reset role');
    });
  } finally { await db.close(); }
});
