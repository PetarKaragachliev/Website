import { bgStatic } from './bg-static.js';
import { bgModels } from './bg-models.js';
import { bgApp } from './bg-app.js';

const bulgarian = Object.fromEntries(Object.entries({ ...bgStatic, ...bgModels, ...bgApp }).map(([english, translated]) => [english.replace(/\s+/g, ' ').trim(), translated.trim()]));

export function resolveLanguage(value) {
  return value === 'bg' ? 'bg' : 'en';
}

export function hasBulgarianTranslation(message) {
  return Object.hasOwn(bulgarian, message.replace(/\s+/g, ' ').trim());
}

export function translate(message, language = 'en', values = {}) {
  const key = message.replace(/\s+/g, ' ').trim();
  const translated = resolveLanguage(language) === 'bg' && Object.hasOwn(bulgarian, key)
    ? `${message.match(/^\s*/)[0]}${bulgarian[key]}${message.match(/\s*$/)[0]}`
    : message;
  return translated.replace(/\{([a-zA-Z]\w*)\}/g, (_, name) => {
    if (!Object.hasOwn(values, name)) throw new Error(`Missing translation value: ${name}`);
    return String(values[name]);
  });
}

export function captureStaticTranslations(root) {
  const records = [];
  const document = root.ownerDocument;
  const walker = document.createTreeWalker(root, document.defaultView.NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent.trim() || node.parentElement.closest('script, style, noscript, [data-no-translate]')) continue;
    records.push({ node, english: node.nodeValue });
  }
  const attributes = [];
  for (const element of root.querySelectorAll('[aria-label], [title], [placeholder], meta[name="description"]')) {
    for (const name of ['aria-label', 'title', 'placeholder', ...(element.matches('meta[name="description"]') ? ['content'] : [])]) {
      if (element.hasAttribute(name)) attributes.push({ element, name, english: element.getAttribute(name) });
    }
  }
  return language => {
    for (const { node, english } of records) if (node.isConnected) node.nodeValue = translate(english, language);
    for (const { element, name, english } of attributes) if (element.isConnected) element.setAttribute(name, translate(english, language));
  };
}
