(() => {
  'use strict';
  if (window.__mentorRequestGuardV432) return;
  window.__mentorRequestGuardV432 = true;

  const nativeFetch = window.fetch.bind(window);
  const inFlight = new Map();
  const cache = new Map();
  const TTL_MS = 20000;

  function isMentorRequest(input) {
    const url = typeof input === 'string' ? input : input?.url || '';
    return url.includes('/functions/v1/mentor-analyze');
  }

  function requestKey(init={}) {
    try {
      const body = typeof init.body === 'string' ? JSON.parse(init.body) : {};
      const intent = String(body?.intent || 'today');
      const topicId = String(body?.topic_id || '');
      const persist = body?.persist === true;
      return { key: `${intent}|${topicId}|${persist ? 'persist' : 'read'}`, persist };
    } catch {
      return { key: 'today||read', persist: false };
    }
  }

  function responseFrom(snapshot) {
    return new Response(snapshot.body, {
      status: snapshot.status,
      statusText: snapshot.statusText,
      headers: snapshot.headers
    });
  }

  async function snapshotResponse(res) {
    const body = await res.text();
    return {
      body,
      status: res.status,
      statusText: res.statusText,
      headers: [...res.headers.entries()]
    };
  }

  window.fetch = function guardedFetch(input, init={}) {
    if (!isMentorRequest(input)) return nativeFetch(input, init);

    const { key, persist } = requestKey(init);
    const now = Date.now();
    if (!persist) {
      const hit = cache.get(key);
      if (hit && now - hit.at < TTL_MS) return Promise.resolve(responseFrom(hit.snapshot));
      if (inFlight.has(key)) return inFlight.get(key).then(responseFrom);
    }

    const pending = nativeFetch(input, init)
      .then(snapshotResponse)
      .then(snapshot => {
        if (!persist && snapshot.status >= 200 && snapshot.status < 300) {
          cache.set(key, { at: Date.now(), snapshot });
        }
        return snapshot;
      })
      .finally(() => inFlight.delete(key));

    if (!persist) inFlight.set(key, pending);
    return pending.then(responseFrom);
  };

  function invalidate() { cache.clear(); }
  window.MentorRequestGuard = { invalidate, ttlMs: TTL_MS };
  document.addEventListener('mentor-evidence-changed', invalidate);
})();
