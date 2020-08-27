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

  const enDataLen = Object.keys(JSON.parse(
    fs.readFileSync(path.join(i18nDir, 'en.json'), { encoding: 'utf8', flag: 'r' }))).length;

  /** @type Set<string> */
  let langs = new Set();
  for (let file of fs.readdirSync(i18nDir)) {
    if (path.extname(file) !== '.json') {
      console.log(`Ignoring unexpected ${file}`);
      continue;
    }
    let langCode = path.basename(file, '.json');
    if (langCode === 'qqq') {
      continue;
    }
    const dataLen = Object.keys(JSON.parse(
      fs.readFileSync(path.join(i18nDir, file), { encoding: 'utf8', flag: 'r' }))).length;

    // Require certain percentage of messages to be present
    let percentage = Math.round(dataLen / enDataLen * 100);
    if (percentage > 25) {
      console.log(`Adding ${langCode} with ${percentage}%`);
      langs.add(langCode);
    } else {
      console.log(`Skipping ${langCode} with ${percentage}%`)
    }
  }

  const languages = Array.from(langs);
  languages.sort();
  console.log(`Found languages: ${languages.join(', ')}`);

  // Add a fake debug language - make sure it's the last
  languages.push('qqx');

  const outFile = path.join(i18nDir, '../sitedata.json');
  console.log(`Writing to ${outFile}`);
  fs.writeFileSync(outFile, JSON.stringify({ languages: languages }));
} catch (err) {
  console.error(err);
}
