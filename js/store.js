import { config } from './config.js';
import { freshDemo, applyDemo } from './core.js';
const DEMO_KEY = 'pirate-tracker:demo:v1';
const timeout = async promise => {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Zeitüberschreitung. Die Anfrage bleibt sicher vorgemerkt.')), 15000); })]); }
  finally { clearTimeout(timer); }
};
export class TrackerStore extends EventTarget {
  constructor() {
    super();
    this.configured = Boolean(config.supabaseUrl && config.supabasePublishableKey);
    this.demo = !this.configured || localStorage.getItem('pirate-tracker:mode') === 'demo';
    this.actor = this.demo ? (sessionStorage.getItem('pirate-tracker:actor') || 'max') : null;
    this.state = null; this.queue = []; this.status = 'loading'; this.error = ''; this.flushing = false;
    window.addEventListener('storage', e => {
      if (this.demo && e.key === DEMO_KEY) this.refresh().catch(e => this.fail(e));
      if (!this.demo && e.key === this.queueKey) { this.queue = this.readQueue(); this.emit(); this.flush(); }
    });
    window.addEventListener('online', () => this.reconnect());
    window.addEventListener('offline', () => { this.status = 'offline'; this.emit(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.reconnect(); });
  }
  emit() { this.dispatchEvent(new Event('change')); }
  fail(e) { this.error = e.message || 'Ein Fehler ist aufgetreten.'; this.emit(); }
  async lock(name, action) {
    if (!navigator.locks) throw new Error('Dieser Browser unterstützt keine sicheren geräteinternen Schreibsperren. Bitte einen aktuellen Browser verwenden.');
    return navigator.locks.request(name, action);
  }
  get scope() { return `${config.supabaseUrl}:${this.user?.id || 'none'}`; }
  get queueKey() { return `pirate-tracker:queue:${this.scope}`; }
  get cacheKey() { return `pirate-tracker:cache:${this.scope}`; }
  readQueue() { return JSON.parse(localStorage.getItem(this.queueKey) || '[]'); }
  async init() {
    if (this.demo) { await this.refresh(); return; }
    try {
      if (!/^https:\/\/[a-zA-Z0-9.-]+\/?$/.test(config.supabaseUrl)) throw new Error('Bitte eine gültige HTTPS-Projekt-URL in js/config.js eintragen.');
      if (/service_role|sb_secret_/.test(config.supabasePublishableKey)) throw new Error('Geheimer Schlüssel erkannt. Nur einen öffentlichen Publishable-/Anon-Key verwenden!');
      let jwtRole;
      try { jwtRole = JSON.parse(atob(config.supabasePublishableKey.split('.')[1])).role; } catch { /* Publishable keys are not JWTs. */ }
      if (jwtRole && jwtRole !== 'anon') throw new Error('Dieser JWT ist kein öffentlicher Anon-Key. Bitte den Publishable-Key verwenden.');
      // Fixed library version; demo works without any CDN dependencies.
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.81.1');
      this.client = createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
      const { data, error } = await this.client.auth.getSession(); if (error) throw error;
      await this.setUser(data.session?.user);
      this.client.auth.onAuthStateChange((event, session) => {
        setTimeout(() => { if (event === 'SIGNED_OUT' || session?.user?.id !== this.user?.id) this.setUser(session?.user).catch(e => this.fail(e)); }, 0);
      });
    } catch (e) { this.status = 'error'; this.fail(e); }
  }
  async setUser(user) {
    clearInterval(this.poll);
    if (this.channel) await this.client.removeChannel(this.channel);
    this.user = user || null; this.actor = null; this.state = null; this.queue = []; this.error = '';
    if (!user) { sessionStorage.removeItem(`pirate-tracker:password-recovery:${config.supabaseUrl}`); this.status = 'signedout'; this.emit(); return; }
    this.queue = this.readQueue();
    const cached = localStorage.getItem(this.cacheKey);
    if (cached) { this.state = JSON.parse(cached); this.actor = this.state.players.find(p => p.auth_id === user.id)?.id || null; }
    this.status = 'loading'; this.emit();
    try { await this.refresh(); } catch (e) { this.status = navigator.onLine ? 'error' : 'offline'; this.fail(e); }
    this.channel = this.client.channel('pirate-crew')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracker_players' }, () => this.refresh().catch(e => this.fail(e)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracker_changes' }, () => this.refresh().catch(e => this.fail(e)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracker_rounds' }, () => this.refresh().catch(e => this.fail(e)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracker_round_counts' }, () => this.refresh().catch(e => this.fail(e)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracker_sessions' }, () => this.refresh().catch(e => this.fail(e)))
      .subscribe(status => {
        this.live = status === 'SUBSCRIBED';
        if (this.live) this.reconnect();
        else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) { this.status = 'reconnecting'; this.emit(); }
      });
    this.flush();
    clearInterval(this.poll);
    this.poll = setInterval(() => { if (!document.hidden) this.reconnect(); }, 30000);
  }
  async refresh() {
    if (this.demo) {
      const raw = localStorage.getItem(DEMO_KEY);
      this.state = raw ? JSON.parse(raw) : freshDemo();
      if (!raw) localStorage.setItem(DEMO_KEY, JSON.stringify(this.state));
      this.status = 'demo'; this.emit(); return;
    }
    if (!this.user) return;
    if (this.refreshing) { this.refreshAgain = true; return this.refreshing; }
    this.refreshing = (async () => {
      do {
        this.refreshAgain = false;
        const { data, error } = await timeout(this.client.rpc('tracker_snapshot'));
        if (error) throw error;
        this.state = data;
        this.actor = data.players.find(p => p.auth_id === this.user.id)?.id;
        if (!this.actor) throw new Error('Dieser Account ist keinem der beiden Spieler zugeordnet.');
        localStorage.setItem(this.cacheKey, JSON.stringify(data));
        this.status = navigator.onLine ? (this.live ? 'live' : 'connected') : 'offline';
        this.emit();
      } while (this.refreshAgain);
    })();
    try { await this.refreshing; } finally { this.refreshing = null; }
  }
  async reconnect() {
    if (this.demo || !this.user) return;
    try { await this.refresh(); await this.flush(); } catch (e) { this.status = navigator.onLine ? 'reconnecting' : 'offline'; this.fail(e); }
  }
  async login(email, password) {
    if (!this.client) throw new Error('Supabase konnte nicht geladen werden. Verbindung und Konfiguration prüfen.');
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Anmeldung fehlgeschlagen. E-Mail und Passwort prüfen.');
    if (this.user?.id !== data.user.id) await this.setUser(data.user);
  }
  async logout() {
    if (this.queue.length) throw new Error('Bitte zuerst die vorgemerkten Änderungen übertragen oder unter Einstellungen prüfen.');
    const { error } = await this.client.auth.signOut(); if (error) throw error;
    await this.setUser(null);
  }
  selectActor(actor) {
    if (!this.demo || !['max', 'szymon'].includes(actor)) return;
    this.actor = actor; sessionStorage.setItem('pirate-tracker:actor', actor); this.emit();
  }
  async resetDemo() {
    if (!this.demo) return;
    await this.lock(DEMO_KEY, () => { this.state = freshDemo(); localStorage.setItem(DEMO_KEY, JSON.stringify(this.state)); });
    this.emit();
  }
  async mutate(action, payload) {
    if (!this.actor) throw new Error('Bitte zuerst anmelden.');
    const request = { id: crypto.randomUUID(), action, payload, created_at: new Date().toISOString() };
    if (this.demo) {
      await this.lock(DEMO_KEY, async () => {
        const base = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null') || freshDemo();
        this.state = applyDemo(base, request, this.actor);
        localStorage.setItem(DEMO_KEY, JSON.stringify(this.state));
      });
      this.emit(); return;
    }
    await this.lock(this.queueKey, () => {
      const queue = this.readQueue(); queue.push(request);
      // Persist BEFORE acknowledging a click. Quota errors never fake success.
      localStorage.setItem(this.queueKey, JSON.stringify(queue)); this.queue = queue;
    });
    this.emit(); this.flush();
  }
  async flush() {
    if (this.demo || !this.user || !navigator.onLine || this.flushing) return;
    this.flushing = true;
    try {
      await this.lock(`flush:${this.queueKey}`, async () => {
        for (;;) {
          const item = this.readQueue()[0];
          if (!item || item.blocked || !navigator.onLine) break;
          let result;
          try { result = await timeout(this.client.rpc('tracker_mutate', { p_request_id: item.id, p_action: item.action, p_payload: item.payload })); }
          catch (e) { this.status = 'reconnecting'; this.error = 'Verbindung unterbrochen. Änderungen bleiben vorgemerkt und werden erneut übertragen.'; break; }
          if (result.error) {
            const transient = /^(08|40|53|57|PGRST00)/.test(result.error.code || '') || /fetch|network|jwt|token|timeout/i.test(result.error.message || '') || !result.error.code;
            if (!transient) await this.lock(this.queueKey, () => {
              const queue = this.readQueue(); const entry = queue.find(x => x.id === item.id);
              if (entry) { entry.blocked = true; entry.error = result.error.message; }
              localStorage.setItem(this.queueKey, JSON.stringify(queue));
            });
            this.error = result.error.message; break;
          }
          // Fetch before removal: a lost read keeps the same idempotent request.
          try { await this.refresh(); } catch { this.status = 'reconnecting'; break; }
          await this.lock(this.queueKey, () => {
            const queue = this.readQueue().filter(x => x.id !== item.id);
            localStorage.setItem(this.queueKey, JSON.stringify(queue)); this.queue = queue;
          });
          this.error = ''; this.emit();
        }
      });
    } catch (e) { this.fail(e); }
    finally { this.queue = this.readQueue(); this.flushing = false; this.emit(); }
  }
  async discard(id) {
    await this.lock(this.queueKey, () => {
      const queue = this.readQueue();
      const item = queue.find(x => x.id === id);
      if (!item?.blocked) throw new Error('Nur sicher abgelehnte Anfragen dürfen verworfen werden. Unklare Übertragungen werden mit derselben Kennung wiederholt.');
      this.queue = queue.filter(x => x.id !== id); localStorage.setItem(this.queueKey, JSON.stringify(this.queue));
    });
    this.error = ''; this.emit(); this.flush();
  }
}
