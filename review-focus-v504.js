(() => {
  'use strict';
  if (window.__mentorReviewFocusV504) return;
  window.__mentorReviewFocusV504 = true;

  const URL = 'https://uysrtgyfnwyocdlaeyum.supabase.co';
  const KEY = 'sb_publishable_CezrTxDDvgs8iAjD7vexNQ_0zVphE8j';
  let client = null;
  let busy = false;
  let cache = null;
  let cacheAt = 0;
  const TTL = 15000;

  function db() {
    if (client) return client;
    if (!window.supabase?.createClient) throw new Error('Supabase indisponível');
    client = window.supabase.createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return client;
  }

  async function load() {
    if (cache && Date.now() - cacheAt < TTL) return cache;
    const c = db();
    const { data: { user }, error: userError } = await c.auth.getUser();
    if (userError || !user) return null;

    const now = new Date().toISOString();
    const [tasksR, reviewsR] = await Promise.all([
      c.from('study_plan_items')
        .select('id,topic_id,subtopic_id,task_type,status')
        .eq('user_id', user.id)
        .eq('task_type', 'review')
        .in('status', ['pending', 'in_progress']),
      c.from('reviews')
        .select('topic_id,question_id,due_at,status')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .lte('due_at', now)
    ]);
    if (tasksR.error) throw tasksR.error;
    if (reviewsR.error) throw reviewsR.error;

    const tasks = tasksR.data || [];
    const reviews = reviewsR.data || [];
    const questionIds = [...new Set(reviews.map(x => x.question_id).filter(Boolean))];
    let questions = [];
    if (questionIds.length) {
      const qR = await c.from('questions').select('id,topic_id,subtopic_id').in('id', questionIds);
      if (qR.error) throw qR.error;
      questions = qR.data || [];
    }

    const subtopicIds = [...new Set([
      ...questions.map(x => x.subtopic_id),
      ...tasks.map(x => x.subtopic_id)
    ].filter(Boolean))];
    let subt = [];
    if (subtopicIds.length) {
      const tR = await c.from('topics').select('id,title,syllabus_code').in('id', subtopicIds);
      if (tR.error) throw tR.error;
      subt = tR.data || [];
    }

    const questionMap = new Map(questions.map(x => [x.id, x]));
    const titleMap = new Map(subt.map(x => [x.id, x.title]));
    const focusByTopic = new Map();
    for (const r of reviews) {
      const q = questionMap.get(r.question_id);
      if (!q?.subtopic_id) continue;
      const title = titleMap.get(q.subtopic_id);
      if (!title) continue;
      if (!focusByTopic.has(r.topic_id)) focusByTopic.set(r.topic_id, []);
      const list = focusByTopic.get(r.topic_id);
      if (!list.includes(title)) list.push(title);
    }

    cache = { tasks: new Map(tasks.map(x => [x.id, x])), focusByTopic, titleMap };
    cacheAt = Date.now();
    return cache;
  }

  function paint(data) {
    if (!data) return;
    document.querySelectorAll('[data-task-review]').forEach(btn => {
      const task = data.tasks.get(btn.dataset.taskReview);
      if (!task) return;
      let focus = [];
      if (task.subtopic_id && data.titleMap.get(task.subtopic_id)) {
        focus = [data.titleMap.get(task.subtopic_id)];
      } else {
        focus = data.focusByTopic.get(task.topic_id) || [];
      }
      const step = btn.closest('.v500-step');
      const text = step?.children?.[1];
      if (!text) return;
      let node = text.querySelector('.v504-review-focus');
      if (!focus.length) {
        node?.remove();
        return;
      }
      if (!node) {
        node = document.createElement('small');
        node.className = 'v504-review-focus';
        node.style.cssText = 'display:block;margin-top:5px;color:#8f216f;font-weight:800;line-height:1.45';
        text.appendChild(node);
      }
      node.textContent = `Foco da revisão: ${focus.join(' • ')}`;
    });
  }

  async function refresh(force = false) {
    if (busy) return;
    busy = true;
    try {
      if (force) { cache = null; cacheAt = 0; }
      paint(await load());
    } catch (e) {
      console.warn('review-focus-v504', e);
    } finally {
      busy = false;
    }
  }

  document.addEventListener('mentor-plan-changed', () => refresh(true));
  document.addEventListener('click', e => {
    if (e.target.closest('[data-task-review]')) setTimeout(() => refresh(true), 900);
  }, true);

  const observer = new MutationObserver(() => {
    if (document.querySelector('[data-task-review]')) refresh(false);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => refresh(true), 1400);
})();
