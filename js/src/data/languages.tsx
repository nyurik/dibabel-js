import { LangInfoDict, Toast } from './types';
import { Dispatch } from 'react';

const mw_languages_query = 'https://www.mediawiki.org/w/api.php?action=query&meta=languageinfo&liprop=name|autonym&format=json&formatversion=2&origin=*';

let cache: LangInfoDict;


export async function getLanguages(addToast: Dispatch<Toast>): Promise<LangInfoDict> {
  if (cache) {
    return cache;
  }
  try {
    let data = await fetch(mw_languages_query);
    if (data.ok) {
      cache = (await data.json()).query.languageinfo;
      return cache;
    } else {
      addToast({
        title: `${data.status}: ${data.statusText}`,
        color: 'danger',
        iconType: 'alert',
        text: await data.text(),
      });
    }
  } catch (err) {
    addToast({
      title: `Unable to parse language codes`,
      color: 'danger',
      iconType: 'alert',
      text: `${err}`,
      toastLifeTimeMs: 15000,
    });
  }
  return {};
}
