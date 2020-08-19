import { LangInfoDict, ToastNoId } from './types';
import {Dispatch, useContext} from 'react';
import { error } from './utils';
import {I18nContext} from "./contexts/I18nContext";

const mw_languages_query = 'https://www.mediawiki.org/w/api.php?action=query&meta=languageinfo&liprop=name|autonym&format=json&formatversion=2&origin=*';

export async function getLanguages(addToast: Dispatch<ToastNoId>): Promise<LangInfoDict> {
  const { i18n } = useContext(I18nContext);
  try {
    let data = await fetch(mw_languages_query);
    if (data.ok) {
      return (await data.json()).query.languageinfo;
    } else {
      addToast(error({
        title: i18n('dibabel-languages-error--load'),
        text: `${data.status}: ${data.statusText}\n${await data.text()}`,
      }));
    }
  } catch (err) {
    addToast(error({
      title: i18n('dibabel-languages-error--parse'),
      text: `${err}`,
      toastLifeTimeMs: 10000,
    }));
  }
  return {};
}
