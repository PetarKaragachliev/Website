import { bgModels } from './bg-models.js';
import { bgApp } from './bg-app.js';

const bulgarian = Object.fromEntries(Object.entries({ ...bgModels, ...bgApp }).map(([english, translated]) => [english.replace(/\s+/g, ' ').trim(), translated.trim()]));

export function hasBulgarianTranslation(message) {
  return Object.hasOwn(bulgarian, message.replace(/\s+/g, ' ').trim());
}

export function translate(message, language = 'bg', values = {}) {
  const key = message.replace(/\s+/g, ' ').trim();
  const translated = language === 'bg' && Object.hasOwn(bulgarian, key)
    ? `${message.match(/^\s*/)[0]}${bulgarian[key]}${message.match(/\s*$/)[0]}`
    : message;
  return translated.replace(/\{([a-zA-Z]\w*)\}/g, (_, name) => {
    if (!Object.hasOwn(values, name)) throw new Error(`Missing translation value: ${name}`);
    return String(values[name]);
  });
}
