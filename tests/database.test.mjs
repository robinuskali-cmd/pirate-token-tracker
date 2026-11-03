import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

test('Echtes PostgreSQL: Schema, Rechte, RPCs, Idempotenz und Rundenkonflikte',async t=>{
  const db=new PGlite();
  const max=randomUUID(),szymon=randomUUID(),outsider=randomUUID();
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  await db.query('insert into auth.users values ($1),($2),($3)',[max,szymon,outsider]);
  const schema=await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8');await db.exec(schema);
  await db.query("update tracker_players set auth_id=case id when 'max' then $1::uuid else $2::uuid end",[max,szymon]);
  const as=async user=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated');};
  const snapshot=async()=> (await db.query('select tracker_snapshot() as s')).rows[0].s;
  const mutate=async(action,payload,id=randomUUID())=>(await db.query('select tracker_mutate($1,$2,$3) as result',[id,action,JSON.stringify(payload)])).rows[0].result;
  await t.test('Zwei Seeds, Migration mehrfach ausführbar ohne Addition',async()=>{await db.exec(schema);await as(max);assert.deepEqual((await snapshot()).players.map(p=>[p.id,p.total]),[['max',500],['szymon',1100]]);});
  await t.test('Fremder Account und anonymer Zugriff abgelehnt; RLS gibt keine Zeilen',async()=>{
    await as(outsider);assert.equal((await db.query('select * from tracker_players')).rows.length,0);await assert.rejects(snapshot,/Spielerzugang/);
    await assert.rejects(()=>mutate('start_session',{session_id:randomUUID()}),/Spielerzugang/);
    await db.exec('reset role; set role anon');await assert.rejects(snapshot,/permission denied/);await assert.rejects(()=>db.query('select * from tracker_players'),/permission denied/);
  });
  await t.test('Keine direkten Schreibrechte und keine Änderungen am fremden Counter',async()=>{await as(max);await assert.rejects(()=>db.query("update tracker_players set initial_chests=0"),/permission denied/);await assert.rejects(()=>mutate('increment',{player_id:'szymon',delta:1}),/eigenen/);});
  await t.test('100 eingehende Additionen überschreiben keine Werte; identische Wiederholung exakt einmal',async()=>{
    await as(max);const payload={player_id:'max',delta:1,round_id:null};
    await Promise.all(Array.from({length:100},()=>mutate('increment',payload)));
    const id=randomUUID();await mutate('increment',payload,id);assert.equal((await mutate('increment',payload,id)).duplicate,true);
    await assert.rejects(()=>mutate('increment',{...payload,delta:5},id),/Kennung/);assert.equal((await snapshot()).players[0].total,601);
  });
  await t.test('Ungültige Eingaben hinterlassen keine Anfrage oder Teiländerung',async()=>{for(const delta of [-1,0,2,1.5,null,''])await assert.rejects(()=>mutate('increment',{player_id:'max',delta}));assert.equal((await snapshot()).players[0].total,601);});
  const sid=randomUUID(),rid=randomUUID();
  await t.test('Genau eine aktive Session / Runde',async()=>{await mutate('start_session',{session_id:sid,route:'Hafen'});await assert.rejects(()=>mutate('start_session',{session_id:randomUUID()}),/bereits/);await assert.rejects(()=>mutate('increment',{player_id:'max',delta:1}),/zuerst/);await mutate('start_round',{session_id:sid,round_id:rid});await assert.rejects(()=>mutate('end_session',{session_id:sid}),/zuerst/);});
  let oldLive;
  await t.test('Live 10, danach Gesamtwert 15: nur Differenz +5; altes Undo gesperrt',async()=>{
    await mutate('increment',{player_id:'max',delta:10,round_id:rid,expected_revision:0});oldLive=(await snapshot()).changes.find(c=>c.round_id===rid).id;
    const p={player_id:'max',round_id:rid,total:15,expected_chests:10,expected_revision:0};await mutate('set_round_total',p);
    assert.equal((await snapshot()).players[0].total,616);await assert.rejects(()=>mutate('set_round_total',p),/inzwischen/);
    await assert.rejects(()=>mutate('increment',{player_id:'max',round_id:rid,delta:1,expected_revision:0}),/korrigiert/);
    await assert.rejects(()=>mutate('undo',{player_id:'max',change_id:oldLive,expected_revision:1}),/Rundenbuch/);
  });
  await t.test('Zweiter Spieler zählt unabhängig; veralteter Abschluss wird abgelehnt',async()=>{
    await as(szymon);await mutate('increment',{player_id:'szymon',round_id:rid,delta:5,expected_revision:0});
    const p={round_id:rid,expected_max:15,expected_szymon:0,revision_max:1,revision_szymon:0};await assert.rejects(()=>mutate('end_round',p),/Neue Truhen/);await mutate('end_round',{...p,expected_szymon:5});
    await assert.rejects(()=>mutate('increment',{player_id:'szymon',round_id:rid,delta:1,expected_revision:0}),/abgeschlossen/);
    await mutate('end_session',{session_id:sid});
    const s=await snapshot();assert.equal(s.players.reduce((a,p)=>a+p.total,0),1721);assert.ok(s.rounds[0].ended_at);
  });
  await t.test('Rundenkorrektur nach Abschluss und Audit-Summe bleiben konsistent',async()=>{
    await as(max);await mutate('set_round_total',{player_id:'max',round_id:rid,total:3,expected_chests:15,expected_revision:1});
    const s=await snapshot();assert.equal(s.players[0].total,604);assert.equal(s.counts.find(c=>c.round_id===rid&&c.player_id==='max').chests,3);
    assert.equal(s.daily.reduce((a,d)=>a+Number(d.chests),0),109);
  });
  await db.close();
});
