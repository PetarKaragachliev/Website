import { bgApp } from './bg-app.js';
import { bgModels } from './bg-models.js';
import { english } from './en.js';
import { englishBody } from './en-body.js';
import { englishStatus } from './en-status.js';
import { englishTraining } from './en-training.js';
import { englishWorkout } from './en-workout.js';

const key = 'liftfuel.language';
let language = 'bg';
try { if (localStorage.getItem(key) === 'en') language = 'en'; } catch { /* Language also works without storage. */ }
const normalize = text => text.replace(/\s+/g, ' ').trim();
const catalog = Object.fromEntries(Object.entries({ ...bgModels, ...bgApp }).map(([en, bg]) => [normalize(bg), en]));
Object.assign(catalog, Object.fromEntries(Object.entries({ ...english, ...englishBody, ...englishStatus, ...englishTraining, ...englishWorkout }).map(([bg, en]) => [normalize(bg), en])));
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templates = Object.entries(catalog).filter(([bg]) => bg.includes('{')).map(([bg, en]) => {
  const names = [...bg.matchAll(/\{(\w+)\}/g)].map(match => match[1]);
  const parts = bg.split(/\{\w+\}/);
  const pattern = parts.map(escape).join('(.+?)').replace(/\(\.\+\?\)$/, '(.*?)');
  return { pattern: new RegExp(`^${pattern}$`), names, en, specificity: parts.join('').length };
}).sort((a, b) => b.specificity - a.specificity);
const phrases = Object.entries(catalog).filter(([bg]) => !bg.includes('{')).sort((a, b) => b[0].length - a[0].length);

function englishNumber(text) {
  return text.replace(/\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g, value => value.replace(',', '.').replace(/[ \u00a0\u202f]/g, ','));
}

export function translatePresentation(text, depth = 0) {
  const source = normalize(text);
  if (!source || depth > 12) return text;
  if (/^\d+(?: \d{3})*(?:,\d+)?$/.test(source) && !/^0\d/.test(source)) {
    const digits = source.split(',')[1]?.length ?? 0;
    return `${text.match(/^\s*/)[0]}${new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(source.replace(/ /g, '').replace(',', '.')))}${text.match(/\s*$/)[0]}`;
  }
  let translated = catalog[source];
  if (translated === undefined) {
    for (const template of templates) {
      const match = source.match(template.pattern);
      if (!match) continue;
      const values = Object.fromEntries(template.names.map((name, index) => [name, translatePresentation(match[index + 1], depth + 1)]));
      translated = template.en.replace(/\{(\w+)\}/g, (_, name) => values[name]);
      break;
    }
  }
  if (translated === undefined) {
    // Compositions use only catalogued phrases and literal separators, never word guesses.
    let remaining = source;
    translated = '';
    while (remaining) {
      const phrase = phrases.find(([bg]) => remaining.startsWith(bg) && (!/[а-яА-Яa-zA-Z]/.test(remaining[bg.length] ?? '')));
      if (phrase) {
        translated += phrase[1];
        remaining = remaining.slice(phrase[0].length);
        continue;
      }
      const literal = remaining.match(/^[^а-яА-Я]+/);
      if (!literal) { translated += remaining; break; }
      translated += englishNumber(literal[0]);
      remaining = remaining.slice(literal[0].length);
    }
  }
  return `${text.match(/^\s*/)[0]}${translated}${text.match(/\s*$/)[0]}`;
}

const originals = new WeakMap();
const attributes = ['aria-label', 'title', 'alt', 'placeholder'];
function present(node, name, restore) {
  const current = name === 'text' ? node.nodeValue : node.getAttribute(name);
  let records = originals.get(node);
  if (!records) { records = new Map(); originals.set(node, records); }
  let record = records.get(name);
  if (!record || record.last !== current) { record = { source: current, last: current }; records.set(name, record); }
  const next = restore || language === 'bg' ? record.source : translatePresentation(record.source);
  if (next !== current) {
    if (name === 'text') node.nodeValue = next;
    else node.setAttribute(name, next);
  }
  record.last = next;
}

export function localize(root = document, restore = false) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = root;
  do {
    if (node.nodeType === Node.TEXT_NODE && !node.parentElement?.closest('script, style, noscript, #language-toggle')) present(node, 'text', restore);
    if (node.nodeType === Node.ELEMENT_NODE && !node.closest('#language-toggle')) {
      for (const name of attributes) if (node.hasAttribute(name)) present(node, name, restore);
      if (node.matches('meta[name="description"]')) present(node, 'content', restore);
    }
  } while ((node = walker.nextNode()));
  if (!restore) {
    document.documentElement.lang = language;
    for (const button of document.querySelectorAll('#language-toggle [data-language]')) {
      button.hidden = button.dataset.language === language;
      button.setAttribute('aria-pressed', String(button.hidden));
    }
    const current = document.querySelector('#language-current');
    if (current) current.textContent = language.toUpperCase();
    document.querySelector('#language-toggle')?.setAttribute('aria-label', language === 'bg' ? 'Език' : 'Language');
  }
}

export const getLanguage = () => language;

export function languageBoundary(callback) {
  return function (...args) {
    localize(document, true);
    try { return callback.apply(this, args); }
    finally { localize(); }
  };
}

export function setLanguage(next, persist = true) {
  if (!['bg', 'en'].includes(next)) return false;
  language = next;
  const dropdown = document.querySelector('#language-toggle');
  if (dropdown) dropdown.open = false;
  let saved = true;
  if (persist) {
    try { localStorage.setItem(key, next); } catch { saved = false; }
  }
  localize();
  const status = document.querySelector('#language-status');
  if (status) status.textContent = saved ? '' : language === 'bg'
    ? 'Езикът е променен за това посещение; хранилището на браузъра не може да запази предпочитания език.'
    : 'Language changed for this visit; browser storage could not save your language preference.';
  return saved;
}

export function clearLanguagePreference() {
  let removed = true;
  try { localStorage.removeItem(key); } catch { removed = false; }
  if (removed) setLanguage('bg', false);
  return removed;
}

export function initLanguage() {
  const dropdown = document.querySelector('#language-toggle');
  for (const button of dropdown.querySelectorAll('[data-language]')) button.addEventListener('click', () => {
    setLanguage(button.dataset.language);
    dropdown.querySelector('summary').focus();
  });
  dropdown.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    dropdown.open = false;
    dropdown.querySelector('summary').focus();
  });
  document.addEventListener('pointerdown', event => {
    if (!dropdown.contains(event.target)) dropdown.open = false;
  });
  window.addEventListener('storage', event => {
    try { if (event.storageArea !== localStorage || ![key, null].includes(event.key)) return; } catch { return; }
    setLanguage(event.newValue === 'en' ? 'en' : 'bg', false);
  });
  localize();
}
