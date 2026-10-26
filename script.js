'use strict';

// Keep existing analytics handlers safe on pages that do not load Google Analytics.
window.gtag = window.gtag || function () { (window.dataLayer = window.dataLayer || []).push(arguments); };
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const settingsPromise = fetch('/settings.json')
  .then(response => response.ok ? response.json() : {})
  .catch(() => ({}));

function initPreloader() {
  const loader = document.getElementById('preloader');
  const percentage = document.getElementById('loader-percentage');
  const phrase = document.getElementById('loader-phrase');
  const fill = document.getElementById('loader-progress-fill');
  if (!loader || loader.hidden || !percentage || !phrase || !fill) return;

  const startedAt = window.kratexLoader?.startedAt ?? performance.now();
  const reducedMotion = motionPreference.matches;
  const minimumDuration = reducedMotion ? 200 : 1800;
  const heroVideo = document.querySelector('.hero-bg-video');
  let phrases = ['Fakta House', 'Nusta Vibes', 'Marathi Vaajlach Pahije'];
  let phraseIndex = 0;
  let finishing = false;
  let readyTimer;
  let hideTimer;
  let fadeTimer;
  phrase.textContent = phrases[0];

  const showProgress = value => {
    percentage.textContent = `${value}%`;
    fill.style.width = `${value}%`;
  };
  const progressTimer = setInterval(() => {
    const elapsed = performance.now() - startedAt;
    showProgress(Math.min(90, Math.round(90 * (1 - Math.exp(-elapsed / 600)))));
  }, 100);
  const phraseTimer = reducedMotion ? null : setInterval(() => {
    phraseIndex = (phraseIndex + 1) % phrases.length;
    phrase.textContent = phrases[phraseIndex];
  }, 450);

  settingsPromise.then(settings => {
    if (finishing) return;
    const customPhrases = settings.loadingPhrases?.filter(value => typeof value === 'string' && value.trim());
    if (!customPhrases?.length) return;
    phrases = [...customPhrases];
    for (let index = phrases.length - 1; index > 0; index--) {
      const random = Math.floor(Math.random() * (index + 1));
      [phrases[index], phrases[random]] = [phrases[random], phrases[index]];
    }
    phraseIndex = 0;
    phrase.textContent = phrases[0];
  }).catch(() => {});

  function clearWork() {
    clearInterval(progressTimer);
    clearInterval(phraseTimer);
    clearTimeout(readyTimer);
    clearTimeout(maximumTimer);
    window.removeEventListener('load', ready);
    heroVideo?.removeEventListener('loadeddata', ready);
    heroVideo?.removeEventListener('error', ready);
  }
  function hide() {
    finishing = true;
    clearWork();
    clearTimeout(fadeTimer);
    clearTimeout(hideTimer);
    clearTimeout(window.kratexLoader?.failSafe);
    delete window.kratexLoader;
    loader.hidden = true;
    document.documentElement.classList.remove('is-loading');
    window.removeEventListener('pagehide', hide);
  }
  function finish() {
    if (finishing) return;
    finishing = true;
    clearWork();
    showProgress(100);
    fadeTimer = setTimeout(() => {
      document.documentElement.classList.remove('is-loading');
      loader.classList.add('fade-out');
      hideTimer = setTimeout(hide, reducedMotion ? 0 : 550);
    }, reducedMotion ? 80 : 220);
  }
  function ready() {
    if (finishing || readyTimer !== undefined) return;
    readyTimer = setTimeout(finish, Math.max(0, minimumDuration - (performance.now() - startedAt)));
  }
  // Only the first screen gates the intro; slow embeds never block browsing.
  const maximumTimer = setTimeout(finish, Math.max(0, 4000 - (performance.now() - startedAt)));
  window.addEventListener('pagehide', hide);
  window.addEventListener('load', ready, { once: true });
  heroVideo?.addEventListener('loadeddata', ready, { once: true });
  heroVideo?.addEventListener('error', ready, { once: true });
  if (document.readyState === 'complete' || !heroVideo || heroVideo.readyState >= 2) ready();
}


function initNavigation() {
  const nav = document.querySelector('.top-nav');
  const trigger = document.getElementById('hamburger-menu');
  const menu = document.getElementById('mobile-menu');
  const close = document.getElementById('close-menu');
  const background = [nav, document.querySelector('header'), document.querySelector('main')].filter(Boolean);
  if (!nav || !trigger || !menu || !close) return;
  const updateNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });
  function setOpen(open, restoreFocus = true) {
    menu.inert = !open;
    menu.classList.toggle('active', open);
    trigger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    background.forEach(element => { element.inert = open; });
    if (open) requestAnimationFrame(() => close.focus());
    else if (restoreFocus) trigger.focus();
  }
  trigger.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false);
    if (event.key !== 'Tab') return;
    const focusables = [...menu.querySelectorAll('a[href], button')];
    const first = focusables[0], last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.matchMedia('(min-width: 801px)').addEventListener('change', event => {
    if (event.matches && menu.classList.contains('active')) setOpen(false, false);
  });
  if (location.pathname.startsWith('/about')) {
    nav.querySelectorAll('a[href="/about"]').forEach(link => link.setAttribute('aria-current', 'page'));
  }
  document.querySelectorAll('.footer-bottom').forEach(footer => {
    const link = document.createElement('a');
    link.href = '#';
    link.className = 'back-to-top';
    link.textContent = 'BACK TO TOP ↑';
    footer.append(link);
  });
}

function initMotion() {
  const video = document.querySelector('.hero-bg-video');
  const button = document.getElementById('motion-toggle');
  let paused = motionPreference.matches;
  let heroVisible = true;
  const tv = document.querySelector('.tv-gif');
  const tvAnimation = tv?.getAttribute('src');
  function update() {
    document.body.classList.toggle('motion-paused', paused);
    if (tv) {
      const desiredSource = paused ? '/assets/images/pics/p6.png' : tvAnimation;
      if (tv.getAttribute('src') !== desiredSource) tv.src = desiredSource;
    }
    if (video) {
      if (paused || !heroVisible || document.hidden) video.pause();
      else video.play().catch(() => {}); // Autoplay can be declined by the browser.
    }
    if (button) {
      button.textContent = paused ? 'PLAY MOTION ▷' : 'PAUSE MOTION Ⅱ';
      button.setAttribute('aria-pressed', String(paused));
      button.setAttribute('aria-label', paused ? 'Play background motion' : 'Pause background motion');
    }
  }
  button?.addEventListener('click', () => { paused = !paused; update(); });
  motionPreference.addEventListener('change', event => { paused = event.matches; update(); });
  document.addEventListener('visibilitychange', update);
  if (video && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; update(); }, { threshold: .05 }).observe(video);
  }
  update();
}

function initCollections() {
  document.querySelectorAll('.video-carousel, .merch-grid').forEach((rail, index) => {
    const section = rail.closest('section');
    const title = section.querySelector('h2').textContent.replace(/^\d+/, '').trim();
    rail.id = rail.id || `collection-${index}`;
    rail.tabIndex = 0;
    rail.setAttribute('role', 'region');
    rail.setAttribute('aria-label', `${title} — scroll to explore`);
    const controls = document.createElement('div');
    controls.className = 'rail-controls';
    const count = document.createElement('span');
    count.className = 'rail-count';
    const previous = document.createElement('button');
    const next = document.createElement('button');
    for (const [button, label, symbol] of [[previous, 'Previous', '←'], [next, 'Next', '→']]) {
      button.type = 'button';
      button.className = 'rail-button';
      button.setAttribute('aria-label', `${label} ${title.toLowerCase()}`);
      button.setAttribute('aria-controls', rail.id);
      button.textContent = symbol;
    }
    controls.append(count, previous, next);
    rail.after(controls);
    const step = () => rail.children[0].getBoundingClientRect().width + parseFloat(getComputedStyle(rail).gap);
    const update = () => {
      previous.disabled = rail.scrollLeft < 2;
      next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 3;
      const first = Math.round(rail.scrollLeft / step()) + 1;
      count.textContent = `${String(first).padStart(2, '0')} / ${String(rail.children.length).padStart(2, '0')} — ${rail.classList.contains('merch-grid') ? 'THE COLLECTION' : 'PRESS PLAY'}`;
    };
    const move = direction => rail.scrollBy({ left: step() * direction, behavior: motionPreference.matches ? 'instant' : 'smooth' });
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    rail.addEventListener('keydown', event => {
      if (event.target !== rail || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    });
    rail.addEventListener('scroll', update, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(rail);
    update();
  });
  document.querySelectorAll('.carousel-track').forEach(track => {
    [...track.children].slice(track.children.length / 2).forEach(image => {
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      track.style.animationPlayState = entries[0].isIntersecting ? '' : 'paused';
    }).observe(track);
  });
}

function initReveals() {
  if (motionPreference.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.remove('is-waiting'); observer.unobserve(entry.target); }
  }), { threshold: .08, rootMargin: '0px 0px 30px 0px' });
  document.querySelectorAll('.section-header, .album-info, .album-image-wrapper, .tv-info, .stream-header, .subscribe-container, .contact-container > h2').forEach(element => {
    element.classList.add('reveal');
    if (element.getBoundingClientRect().top > window.innerHeight) element.classList.add('is-waiting');
    observer.observe(element);
  });
  // Keyboard navigation must never land on visually hidden content.
  document.addEventListener('focusin', event => event.target.closest('.reveal')?.classList.remove('is-waiting'));
  motionPreference.addEventListener('change', event => {
    if (event.matches) document.querySelectorAll('.is-waiting').forEach(element => element.classList.remove('is-waiting'));
  });
}

function safeLink(value, fallback) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : fallback; }
  catch { return fallback; }
}

async function fetchBandsintownEvents() {
  const container = document.getElementById('bandsintown-events');
  if (!container) return;
  const fallback = 'https://www.bandsintown.com/a/15525088-kratex';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const message = text => {
    const p = document.createElement('p');
    p.textContent = text + ' ';
    const link = document.createElement('a');
    link.href = fallback; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'View Kratex on Bandsintown ↗';
    p.append(link); container.replaceChildren(p);
  };
  try {
    const response = await fetch('https://rest.bandsintown.com/artists/Kratex/events?app_id=a6c091218a1b4ce7722331b71949efd4', { signal: controller.signal });
    if (!response.ok) throw new Error('Events unavailable');
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid events response');
    const events = data.map(event => ({ ...event, date: new Date(event.datetime || event.starts_at) }))
      .filter(event => !Number.isNaN(event.date.getTime()) && event.venue)
      .sort((a, b) => a.date - b.date);
    if (!events.length) { message('New dates are on the way.'); return; }
    container.replaceChildren();
    const formatDate = date => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    for (const event of events) {
      const offer = event.offers?.find(item => item.type?.toLowerCase() === 'tickets' && item.status === 'available');
      const row = document.createElement('a');
      row.className = 'tour-item'; row.href = safeLink(offer?.url || event.url, fallback); row.target = '_blank'; row.rel = 'noopener noreferrer';
      for (const [className, content] of [
        ['tour-left', [['date', formatDate(event.date)], ['day', event.date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()]]],
        ['tour-middle', [['title', event.title || event.venue.name || 'Live set'], ['location', event.venue.location || [event.venue.city, event.venue.country].filter(Boolean).join(', ')]]],
        ['tour-right', [['btn-tv book-btn', offer ? 'BOOK NOW ↗' : 'SHOW DETAILS ↗']]]
      ]) {
        const group = document.createElement('div'); group.className = className;
        for (const [name, value] of content) { const span = document.createElement('span'); span.className = name; span.textContent = value; group.append(span); }
        row.append(group);
      }
      container.append(row);
    }
    const first = events[0];
    const heroText = document.getElementById('hero-btn-text');
    if (heroText) heroText.textContent = `NEXT SHOW: ${(first.venue.city || first.venue.name).toUpperCase()} · ${first.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}`;
    const label = document.getElementById('hero-btn-label');
    if (label && first.venue.name) { label.textContent = first.venue.name; label.style.display = 'block'; }
  } catch { message('Live dates are temporarily unavailable.'); }
  finally { clearTimeout(timeout); container.setAttribute('aria-busy', 'false'); }
}

function initSubscribeForm() {
  const form = document.getElementById('subscribe-form');
  const input = document.getElementById('subscribe-email');
  const button = document.getElementById('subscribe-btn');
  if (!form || !input || !button) return;
  const base = 'https://www.bandsintown.com/artist-subscribe/15525088?came_from=701&spn=1&signature=ZZ9dfbc80df9c61962408fde1d904ff938310c5694f290cb54f169d1a05415ce8c';
  function update() {
    const valid = input.value.trim() !== '' && input.validity.valid;
    button.classList.toggle('btn-disabled', !valid);
    button.setAttribute('aria-disabled', String(!valid));
    button.href = valid ? `${base}&newsletter_email=${encodeURIComponent(input.value.trim())}` : '#';
    return valid;
  }
  input.addEventListener('input', update);
  input.addEventListener('change', update);
  button.addEventListener('click', event => {
    if (!update()) { event.preventDefault(); input.reportValidity(); input.focus(); }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (update()) window.open(button.href, '_blank', 'noopener,noreferrer');
    else input.reportValidity();
  });
  update();
}

async function initSettings() {
  try {
    const settings = await settingsPromise;
    const speed = Number(settings.aboutCarouselSpeed);
    if (Number.isFinite(speed) && speed >= 10) document.documentElement.style.setProperty('--carousel-speed', `${speed * 2}s`);
  } catch { /* Presentation defaults work even when settings cannot be loaded. */ }
  const layer = document.getElementById('stream-layer-1');
  if (layer) { layer.style.backgroundImage = 'url("/assets/images/pics/p6.png")'; layer.classList.add('is-active'); }
}

function init() {
  initPreloader();
  initNavigation();
  initMotion();
  initCollections();
  initReveals();
  initSubscribeForm();
  initSettings();
  fetchBandsintownEvents();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
