'use strict';

(() => {
  const list = document.querySelector('#news-list');
  if (!list) return;
  const more = document.querySelector('#news-more');
  const status = document.querySelector('#news-status');
  const retry = document.querySelector('#news-retry');
  const dialog = document.querySelector('#news-dialog');
  const content = document.querySelector('#news-dialog-content');
  let posts = [], visible = 0, openingTile;
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function picture(source, post, lazy = true) {
    if (!source || !new RegExp('^/deslot/news/media/' + post.id + '/[0-9]+\\.(png|jpg)$').test(source.src || '')) return null;
    const image = element('img'); image.src = source.src; image.alt = source.alt || post.title;
    image.loading = lazy ? 'lazy' : 'eager'; image.decoding = 'async';
    return image;
  }
  function date(post) {
    const node = element('time'); node.dateTime = post.publishedAt;
    const value = new Date(post.publishedAt);
    node.textContent = Number.isNaN(value.getTime()) ? '' : value.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    return node;
  }
  function showPost(id) {
    const post = posts.find(item => item.id === id);
    content.replaceChildren();
    const title = element('h2', post?.title || 'Post unavailable'); title.id = 'news-dialog-title';
    content.append(title);
    if (post) {
      content.append(date(post), element('p', post.body, 'news-body'));
      const extras = [...(post.mentions || []).map(item => item.startsWith('@') ? item : '@' + item), ...(post.tags || []).map(item => item.startsWith('#') ? item : '#' + item)];
      if (extras.length) content.append(element('p', extras.join(' '), 'news-tags'));
      const images = element('div', '', 'news-images');
      for (const source of post.images || []) {
        const image = picture(source, post);
        if (!image) continue;
        const link = element('a'); link.href = source.src; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', 'Open full size image: ' + image.alt); link.append(image); images.append(link);
      }
      content.append(images);
    } else content.append(element('p', 'This news post may have been removed. Close this window to browse the latest news.'));
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }
  function followHash() {
    const id = location.hash.replace(/^#news-/, '');
    if (uuid.test(id)) showPost(id);
    else if (dialog.open) dialog.close();
  }
  function loadNext() {
    const next = posts.slice(visible, visible + 5);
    for (const post of next) {
      const article = element('article', '', 'news-tile');
      const button = element('button', '', 'news-open'); button.type = 'button';
      button.setAttribute('aria-label', 'Read ' + post.title);
      const image = picture(post.images?.[0], post);
      if (image) button.append(image);
      else button.append(element('span', 'DESLOT', 'news-placeholder'));
      const text = element('span', '', 'news-tile-text');
      text.append(date(post), element('h3', post.title), element('span', post.body, 'news-excerpt'), element('span', 'Read post ↗', 'news-read'));
      button.append(text); article.append(button); list.append(article);
      button.addEventListener('click', () => { openingTile = button; location.hash = 'news-' + post.id; });
    }
    visible += next.length;
    more.hidden = visible >= posts.length;
    more.textContent = 'Load next ' + Math.min(5, posts.length - visible);
    status.textContent = posts.length ? 'Showing ' + visible + ' of ' + posts.length + ' posts' : 'No news posts yet.';
  }
  async function load() {
    retry.hidden = true; status.textContent = 'Loading news…';
    try {
      const response = await fetch('news/posts.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('News unavailable');
      const data = await response.json();
      if (data.version !== 1 || !Array.isArray(data.posts)) throw new Error('Invalid news');
      posts = data.posts.filter(post => uuid.test(post.id) && typeof post.title === 'string' && typeof post.body === 'string')
        .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)) || a.id.localeCompare(b.id));
      list.replaceChildren(); visible = 0; loadNext(); followHash();
    } catch {
      status.textContent = 'News could not be loaded. Please try again.'; retry.hidden = false;
    }
  }
  more.addEventListener('click', loadNext);
  retry.addEventListener('click', load);
  document.querySelector('#news-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => {
    if (location.hash.startsWith('#news-')) history.replaceState(null, '', '#news');
    openingTile?.focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', followHash);
  load();
})();
