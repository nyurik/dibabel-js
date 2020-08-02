import { AddToast, LangInfoDict } from './types';

const url = 'https://www.mediawiki.org/w/api.php?action=query&meta=languageinfo&liprop=name|autonym&format=json&formatversion=2&origin=*';

let cache: LangInfoDict;


export async function getLanguages(addToast: AddToast): Promise<LangInfoDict> {
  if (cache) {
    return cache;
  }
  try {
    let userInfo = await fetch(url);
    if (userInfo.ok) {
      cache = (await userInfo.json()).query.languageinfo;
      return cache;
    } else {
      addToast({
        title: `${userInfo.status}: ${userInfo.statusText}`,
        color: 'danger',
        iconType: 'alert',
        text: await userInfo.text(),
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
