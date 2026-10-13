(function (root) {
  'use strict';
  const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/ß/g, 'ss');
  const terms = query => normalize(query).trim().split(/\s+/).filter(Boolean);
  const sessionText = s => [s.title, s.summary].filter(Boolean).join(' ');
  const topicText = t => [t.title, ...(t.speakers || []), t.summary].filter(Boolean).join(' ');
  const containsAll = (text, words) => words.every(word => normalize(text).includes(word));
  function search(sessions, query) {
    const words = terms(query);
    return sessions.flatMap(session => {
      const sessionMatch = containsAll(sessionText(session), words);
      const topics = (session.topics || []).filter(topic => containsAll(sessionText(session) + ' ' + topicText(topic), words));
      if (!sessionMatch && !topics.length) return [];
      return [{ session, topics: sessionMatch ? (session.topics || []) : topics, expanded: words.length > 0 && !sessionMatch }];
    });
  }
  function timestamp(ms) {
    const seconds = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
    const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), s = seconds % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0');
  }
  function topicMeta(topic) {
    const speakers = (topic.speakers || []).join('、');
    if (!Number.isFinite(topic.start_ms) || !Number.isFinite(topic.end_ms)) return speakers;
    const timing = timestamp(topic.start_ms) + '–' + timestamp(topic.end_ms) + ' · ' + timestamp(topic.end_ms - topic.start_ms);
    return [speakers, timing].filter(Boolean).join(' · ');
  }
  // Catalog links stay within the deployed directory; official links use a fixed origin.
  function localHref(value) {
    const path = String(value || '');
    return /^(?:sessions\/)[^?#]*\.html(?:#[\w-]+)?$/.test(path) && !path.split('/').includes('..') && !path.includes('\\') ? path : null;
  }
  function officialHref(value) {
    try { const url = new URL(value); return url.origin === 'https://yunqi.aliyun.com' ? url.href : null; } catch (_) { return null; }
  }
  const api = { normalize, search, timestamp, topicMeta, localHref, officialHref };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root.document) return;
  const document = root.document;
  const byId = id => document.getElementById(id);
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function link(text, href, className) {
    const node = element(href ? 'a' : 'span', text, className);
    if (href) node.setAttribute('href', href);
    return node;
  }
  function renderTopic(topic) {
    const item = element('li', undefined, 'topic');
    item.append(link(topic.title, localHref(topic.href)), element('p', topicMeta(topic), 'topic-meta'));
    if (topic.summary) item.append(element('p', topic.summary, 'topic-summary'));
    return item;
  }
  function renderSession(result) {
    const { session, topics, expanded } = result;
    const card = element('article', undefined, 'session-card');
    const title = element('h3'); title.append(link(session.title, localHref(session.href))); card.append(title);
    if (session.summary) card.append(element('p', session.summary, 'session-summary'));
    const links = element('div', undefined, 'card-links');
    links.append(link('阅读全文 →', localHref(session.href)), link('云栖官网 ↗', officialHref(session.official_url), 'official-link'));
    card.append(links);
    if (topics.length) {
      const details = element('details');
      details.append(element('summary', (expanded ? '相关主题' : '浏览主题') + ' · ' + topics.length));
      let populated = false;
      function populate() {
        if (populated || !details.open) return;
        const list = element('ul', undefined, 'topic-list');
        topics.forEach(topic => list.append(renderTopic(topic)));
        details.append(list); populated = true;
      }
      details.addEventListener('toggle', populate);
      details.open = expanded; populate(); card.append(details);
    }
    return card;
  }
  let catalog;
  function render() {
    const query = byId('query').value;
    const results = search(catalog.sessions, query);
    const fragment = document.createDocumentFragment();
    results.forEach(result => fragment.append(renderSession(result)));
    byId('session-list').replaceChildren(fragment);
    byId('clear').disabled = !query;
    byId('directory-title').textContent = terms(query).length ? '搜索结果' : '全部场次';
    byId('status').textContent = terms(query).length ? '找到 ' + results.length + ' 场 · 共 ' + catalog.sessions.length + ' 场' : catalog.sessions.length + ' 场可阅读';
    byId('empty').hidden = results.length !== 0;
  }
  async function load() {
    byId('error').hidden = true;
    byId('session-list').setAttribute('aria-busy', 'true');
    byId('status').textContent = '正在加载…';
    try {
      const response = await root.fetch('./catalog.json');
      if (!response.ok) throw new Error('catalog unavailable');
      const data = await response.json();
      if (!Array.isArray(data.sessions) || !data.sessions.every(s => s && typeof s.title === 'string' && Array.isArray(s.topics))) throw new Error('invalid catalog');
      catalog = data;
      const missing = data.missing_sessions || [];
      const counts = data.counts || {};
      const topics = data.sessions.reduce((sum, session) => sum + session.topics.length, 0);
      byId('coverage').textContent = data.sessions.length + ' 场完整讲稿 · ' + topics + ' 个主题 · ' + missing.length + ' 场待收录' + (counts.images ? ' · ' + Number(counts.images).toLocaleString('zh-CN') + ' 张配图' : '');
      byId('snapshot').textContent = data.snapshot_date ? '目录更新于 ' + data.snapshot_date : '';
      byId('missing-title').textContent = '暂未收录完整讲稿 · ' + missing.length + ' 场';
      byId('missing-list').replaceChildren();
      missing.forEach(session => { const item = element('li'); item.append(link(session.title + ' ↗', officialHref(session.official_url))); byId('missing-list').append(item); });
      byId('missing-section').hidden = !missing.length;
      render();
    } catch (_) {
      byId('error').hidden = false;
      byId('empty').hidden = true;
      byId('coverage').textContent = '目录暂时无法读取';
      byId('status').textContent = '加载失败';
    } finally { byId('session-list').setAttribute('aria-busy', 'false'); }
  }
  byId('query').addEventListener('input', () => { if (catalog) render(); });
  byId('clear').addEventListener('click', () => { byId('query').value = ''; if (catalog) render(); byId('query').focus(); });
  byId('retry').addEventListener('click', load);
  load();
})(typeof window !== 'undefined' ? window : globalThis);
