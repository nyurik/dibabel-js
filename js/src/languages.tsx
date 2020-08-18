import { LangInfoDict, ToastNoId } from './types';
import { Dispatch } from 'react';
import { error } from './utils';

const mw_languages_query = 'https://www.mediawiki.org/w/api.php?action=query&meta=languageinfo&liprop=name|autonym&format=json&formatversion=2&origin=*';

export async function getLanguages(addToast: Dispatch<ToastNoId>): Promise<LangInfoDict> {
  try {
    let data = await fetch(mw_languages_query);
    if (data.ok) {
      return (await data.json()).query.languageinfo;
    } else {
      addToast(error({
        title: `Error loading language data`,
        text: `${data.status}: ${data.statusText}\n${await data.text()}`,
      }));
    }
  } catch (err) {
    addToast(error({
      title: `Error parsing language data`,
      text: `${err}`,
      toastLifeTimeMs: 10000,
    }));
  }
  return {};
}
