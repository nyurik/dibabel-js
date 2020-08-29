#!/usr/bin/env node

/*
 * Generate a simple manifest file:
 * - listing all available i18n files.
 * - listing all available wikis
 */

const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const _ = require('lodash');

const i18nDir = path.join(__dirname, '../public/i18n');

console.log(`Generating info file...`);

function getSummaries(summaries, lang, data) {
  for (const key of Object.keys(data)) {
    if (key.startsWith('diff-summary-text--')) {
      if (!summaries[lang]) {
        summaries[lang] = {};
      }
      summaries[lang][key] = data[key];
    }
  }
}

function createLanguageList() {
  const summaries = {};
  const enData = JSON.parse(fs.readFileSync(path.join(i18nDir, 'en.json'), { encoding: 'utf8', flag: 'r' }));
  const enDataLen = Object.keys(enData).length;
  getSummaries(summaries, 'en', enData);

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

    const data = JSON.parse(fs.readFileSync(path.join(i18nDir, file), { encoding: 'utf8', flag: 'r' }));
    const dataLen = Object.keys(data).length;
    getSummaries(summaries, langCode, data);

    // Require certain percentage of messages to be present
    let percentage = Math.round(dataLen / enDataLen * 100);
    if (percentage > 25) {
      console.log(`Adding ${langCode} with ${percentage}%`);
      langs.add(langCode);
    } else {
      console.log(`Skipping ${langCode} with ${percentage}%`);
    }
  }

  const languages = Array.from(langs);
  languages.sort();
  console.log(`Found languages: ${languages.join(', ')}`);

  // Add a fake debug language - make sure it's the last
  languages.push('qqx');

  return { summaries, languages };
}

async function createSiteList() {

  console.log('Downloading sitematrix');
  const resp = await fetch('https://meta.wikimedia.org/w/api.php?action=sitematrix&formatversion=2&format=json');
  if (!resp.ok) {
    throw new Error(resp.statusText);
  }

  /** @type any */
  const json = await resp.json();
  if (!json || !json.sitematrix) {
    throw new Error('Missing sitematrix');
  }

  const result = [];

  const includeSpecials = new Set(['commonswiki', 'mediawikiwiki', 'metawiki', 'specieswiki', 'wikidatawiki', 'wikimaniawiki']);

  for (const sites of Object.values(json.sitematrix)) {

    let iterable;
    let extras;

    if (sites.site) {
      iterable = sites.site;
      const { code, name, dir, localname, closed } = sites;
      extras = { code, name, dir, localname };
      if (closed) {
        extras.closed = true;
      }
    } else if (Array.isArray(sites)) {
      iterable = sites;
      extras = {};
    } else {
      continue;
    }

    for (const site of iterable) {
      if (site.private || site.fishbowl || site.nonglobal || (site.lang && !includeSpecials.has(site.dbname))) {
        continue;
      }
      result.push({ ...extras, ...site });
    }
  }

  return result;
}

(async () => {
  try {
    const results = createLanguageList();
    results['sites'] = await createSiteList();

    const outFile = path.join(i18nDir, '../sitedata.json');
    console.log(`Writing to ${outFile}`);
    fs.writeFileSync(outFile, JSON.stringify(results));
  } catch (err) {
    console.error(err);
  }
})();
