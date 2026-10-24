(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Theme ---------- */
  var root = document.documentElement;
  var savedTheme = store.get('theme');
  if (savedTheme) root.setAttribute('data-theme', savedTheme);
  $('themeBtn').addEventListener('click', function () {
    var dark = root.getAttribute('data-theme') === 'dark' ||
      (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    var next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('theme', next);
  });

  /* ---------- Video data (edit titles, durations and counts here) ---------- */
  var videos = [
    { id: 1, title: 'A weekend in Jaipur: forts and street food', cat: 'Travel', dur: 728, views: 182000, likes: 9400, date: '2026-10-18', hue: 20, icon: '🏰' },
    { id: 2, title: 'Surat street food crawl: 10 stalls, one night', cat: 'Food', dur: 905, views: 241000, likes: 12100, date: '2026-10-11', hue: 40, icon: '🍛' },
    { id: 3, title: 'My study routine before exams', cat: 'Daily life', dur: 612, views: 96000, likes: 6200, date: '2026-10-04', hue: 200, icon: '📚' },
    { id: 4, title: 'Gadgets on my desk this year', cat: 'Tech', dur: 540, views: 131000, likes: 7800, date: '2026-09-27', hue: 260, icon: '💻' },
    { id: 5, title: 'Sunrise at the beach: a slow morning vlog', cat: 'Travel', dur: 487, views: 74000, likes: 4300, date: '2026-09-20', hue: 190, icon: '🌅' },
    { id: 6, title: 'Cooking dal baati for my roommates', cat: 'Food', dur: 843, views: 158000, likes: 8900, date: '2026-09-13', hue: 30, icon: '🍲' },
    { id: 7, title: 'A day in my life as a college student', cat: 'Daily life', dur: 696, views: 112000, likes: 7100, date: '2026-09-06', hue: 150, icon: '🎒' },
    { id: 8, title: '5 free tools that save me hours', cat: 'Tech', dur: 408, views: 205000, likes: 11300, date: '2026-08-30', hue: 300, icon: '⚙️' }
  ];
  var cats = ['All'].concat(videos.map(function (v) { return v.cat; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
  var state = { cat: 'All', q: '', sort: 'new' };
  var liked = {}, saved = {}, comments = {};

  function fmtTime(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function fmtNum(n) { return n >= 1000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'K' : String(n); }
  function grad(h) { return 'linear-gradient(135deg,hsl(' + h + ' 70% 45%),hsl(' + (h + 40) + ' 75% 60%))'; }

  /* ---------- Render grid ---------- */
  function render() {
    var q = state.q.toLowerCase();
    var list = videos.filter(function (v) {
      return (state.cat === 'All' || v.cat === state.cat) && v.title.toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) {
      if (state.sort === 'views') return b.views - a.views;
      if (state.sort === 'likes') return b.likes - a.likes;
      return b.date.localeCompare(a.date);
    });
    var grid = $('grid');
    grid.innerHTML = '';
    list.forEach(function (v) {
      var b = document.createElement('button');
      b.className = 'card';
      b.innerHTML = '<div class="thumb" style="background:' + grad(v.hue) + '">' + v.icon +
        '<small>' + fmtTime(v.dur) + '</small></div><div class="card-body"><h3></h3><p>' +
        v.cat + ' · ' + fmtNum(v.views) + ' views</p></div>';
      b.querySelector('h3').textContent = v.title;
      b.addEventListener('click', function () { openPlayer(v); });
      grid.appendChild(b);
    });
    $('empty').hidden = list.length > 0;
  }

  function renderChips() {
    var wrap = $('chips');
    wrap.innerHTML = '';
    cats.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'chip';
      b.textContent = c;
      b.setAttribute('aria-pressed', c === state.cat);
      b.addEventListener('click', function () { state.cat = c; renderChips(); render(); });
      wrap.appendChild(b);
    });
  }

  $('search').addEventListener('input', function (e) { state.q = e.target.value.trim(); render(); });
  $('sort').addEventListener('change', function (e) { state.sort = e.target.value; render(); });

  /* ---------- Player ---------- */
  var dlg = $('player'), current = null, timer = null, elapsed = 0, playing = false;

  function updateButtons() {
    $('likeBtn').classList.toggle('on', !!liked[current.id]);
    $('saveBtn').classList.toggle('on', !!saved[current.id]);
    $('likeBtn').textContent = liked[current.id] ? '👍 Liked' : '👍 Like';
    $('saveBtn').textContent = saved[current.id] ? '🔖 Saved' : '🔖 Save';
  }
  function renderComments() {
    var ul = $('comments');
    ul.innerHTML = '';
    (comments[current.id] || []).forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    });
  }
  function tick() {
    elapsed += 1;
    if (elapsed >= current.dur) { stop(); elapsed = current.dur; }
    $('progress').style.width = (elapsed / current.dur * 100) + '%';
    $('time').textContent = fmtTime(elapsed) + ' / ' + fmtTime(current.dur);
  }
  function play() { if (playing) return; playing = true; $('screenIcon').textContent = '⏸'; timer = setInterval(tick, 1000); }
  function stop() { playing = false; $('screenIcon').textContent = '▶'; clearInterval(timer); }

  function openPlayer(v) {
    current = v; elapsed = 0; stop();
    $('screen').style.background = grad(v.hue);
    $('pTitle').textContent = v.title;
    $('pMeta').textContent = v.cat + ' · ' + fmtNum(v.views) + ' views · ' + fmtNum(v.likes + (liked[v.id] ? 1 : 0)) + ' likes';
    $('progress').style.width = '0';
    $('time').textContent = '0:00 / ' + fmtTime(v.dur);
    updateButtons(); renderComments();
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    play();
  }
  $('screen').addEventListener('click', function () { playing ? stop() : play(); });
  $('closeBtn').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('close', stop);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  $('likeBtn').addEventListener('click', function () { liked[current.id] = !liked[current.id]; updateButtons(); openMeta(); });
  $('saveBtn').addEventListener('click', function () { saved[current.id] = !saved[current.id]; updateButtons(); });
  function openMeta() { $('pMeta').textContent = current.cat + ' · ' + fmtNum(current.views) + ' views · ' + fmtNum(current.likes + (liked[current.id] ? 1 : 0)) + ' likes'; }
  $('shareBtn').addEventListener('click', function () {
    var data = { title: current.title, url: location.href };
    if (navigator.share) { navigator.share(data).catch(function () {}); }
    else if (navigator.clipboard) { navigator.clipboard.writeText(location.href).then(function () { $('shareBtn').textContent = '✅ Link copied'; setTimeout(function () { $('shareBtn').textContent = '🔗 Share'; }, 1500); }); }
  });
  $('commentForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = $('commentInput').value.trim();
    if (!t) return;
    (comments[current.id] = comments[current.id] || []).unshift(t);
    $('commentInput').value = '';
    renderComments();
  });

  /* ---------- Hero buttons ---------- */
  $('watchLatest').addEventListener('click', function () { openPlayer(videos.slice().sort(function (a, b) { return b.date.localeCompare(a.date); })[0]); });
  $('featured').addEventListener('click', function () { openPlayer(videos[0]); });

  /* ---------- Forms ---------- */
  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
  function say(el, text, ok) { el.textContent = text; el.className = 'msg ' + (ok ? 'ok' : 'err'); }

  $('subForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('subEmail').value.trim();
    if (!validEmail(v)) return say($('subMsg'), 'Enter a valid email address, like you@example.com.', false);
    store.set('subscriber', v);
    $('subForm').reset();
    say($('subMsg'), 'Subscribed. Watch your inbox for the next vlog.', true);
  });

  $('contactForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('cName').value.trim(), email = $('cEmail').value.trim(), msg = $('cMsg').value.trim();
    if (!name || !msg) return say($('contactMsg'), 'Fill in your name and message.', false);
    if (!validEmail(email)) return say($('contactMsg'), 'Enter a valid email address so Pratik can reply.', false);
    $('contactForm').reset();
    say($('contactMsg'), 'Message sent. Pratik usually replies within 2 days.', true);
  });

  renderChips();
  render();
})();
