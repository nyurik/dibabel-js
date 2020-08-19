#!/usr/bin/env node

/*
 * Generate a simple manifest file listing all available i18n files.
 * If sublanguage
 */

const path = require('path');
const fs = require('fs');

const i18nDir = path.join(__dirname, '../public/i18n');

console.log(`Generating info file...`);
try {
  /** @type Set<string> */
  let langs = new Set();
  for (let file of fs.readdirSync(i18nDir)) {
    if (path.extname(file) !== '.json') {
      console.log(`Ignoring unexpected ${file}`);
      continue;
    }
    let langCode = path.basename(file, '.json');
    while (true) {
      langs.add(langCode);
      const dashIdx = langCode.indexOf('-');
      if (dashIdx < 0) {
        break;
      }
      langCode = langCode.substring(0, dashIdx);
    }
  }
  const languages = Array.from(langs);
  languages.sort();
  fs.writeFileSync(path.join(i18nDir, '../info.json'), JSON.stringify({ languages: languages }));
} catch (err) {
  console.error(err);
}
