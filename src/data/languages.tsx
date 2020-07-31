import { ReactChild } from 'react';
import { EuiToastProps } from '@elastic/eui/src/components/toast/toast';

/**
 * This overrides Eui's own toast interface to remove the ID requirement (auto-added later)
 * FIXME: Can this be done with importing Toast from @elastic/eui/src/components/toast/global_toast_list and using Exclude<> ?
 */
export interface Toast extends EuiToastProps {
  // id: string;
  text?: ReactChild;
  toastLifeTimeMs?: number;
}

export type LangInfo = { name: string, autonym: string } ;
export type LangInfoDict = { [key: string]: LangInfo };
export type AddToast = (toast: Toast) => void;

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
