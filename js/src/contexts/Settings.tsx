import React, { Dispatch, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderLink,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableOption,
  EuiSpacer,
  EuiSwitch
} from '@elastic/eui';
import { UserContext, UserState } from './UserContext';
import { rootUrlData, rootUrlSite, usePersistedState } from '../utils';

import { Props } from '../types';
import i18n_en from './messages-en.json';
import { isEmpty } from 'lodash';

export type LanguageNames = { [key: string]: string };
export type SiteData = { languages: string[] };
export type Messages = any;
export type AllMessages = { [key: string]: Messages };

export type SettingsContextType = {
  siteData: SiteData,
  isDarkTheme: boolean,
  setIsDarkTheme: Dispatch<boolean>,
  isSplitView: boolean,
  setIsSplitView: Dispatch<boolean>,
  isIncrementalSearch: boolean,
  setIsIncrementalSearch: Dispatch<boolean>,
  locale: string,
  messages: AllMessages,
  setLocale: Dispatch<string>,
  languageNames: LanguageNames,
}

export const SettingsContext = React.createContext<SettingsContextType>({} as SettingsContextType);

const initMessages: AllMessages = { en: i18n_en };
const initSiteData: SiteData = { languages: ['en'] };

async function loadLocale(newLanguage: string, messages: AllMessages): Promise<Messages> {
  const newData: AllMessages = {};
  while (true) {
    if (!messages[newLanguage]) {
      newData[newLanguage] = {}; // prevent repeated downloads
      try {
        const resp = await fetch(`${rootUrlSite}i18n/${newLanguage}.json`);
        if (resp.ok) {
          newData[newLanguage] = await resp.json();
        }
      } catch {
        // TODO: report errors?
      }
    }
    const dashIdx = newLanguage.indexOf('-');
    if (dashIdx < 0) {
      break;
    }
    newLanguage = newLanguage.substring(0, dashIdx);
  }
  if (!isEmpty(newData)) {
    return Object.assign(newData, messages);
  }
  return null;
}

async function getLanguageNames(langCode: string): Promise<LanguageNames> {
  const isDebugLang = langCode === 'qqx';
  const mw_languages_query = 'https://www.mediawiki.org/w/api.php?action=query&meta=languageinfo&liprop=name|autonym&format=json&formatversion=2&origin=*&uselang=';
  let data = await fetch(mw_languages_query + encodeURIComponent(isDebugLang ? 'en' : langCode));
  if (data.ok) {
    const langs = (await data.json()).query.languageinfo;
    const result = Object.fromEntries(Object.keys(langs).map(lang => {
      const langInfo = langs[lang];
      let name = langInfo.name;
      if (langInfo.autonym && langInfo.autonym !== langInfo.name) {
        name += ` - ${langInfo.autonym}`;
      }
      return [lang, name];
    }));
    result['qqx'] = '* Debug UI';
    return result;
  } else {
    throw new Error(`${data.status}: ${data.statusText}\n${await data.text()}`);
  }
}

async function getSiteData(): Promise<SiteData> {
  let data = await fetch(`${rootUrlSite}sitedata.json`);
  if (data.ok) {
    return await data.json();
  } else {
    throw new Error(`${data.status}: ${data.statusText}\n${await data.text()}`);
  }
}

export const SettingsProvider = ({ children }: Props) => {
  const [isDarkTheme, setIsDarkTheme] = usePersistedState<boolean>(
    'theme', 'light',
    // FIXME!  currently always force to light mode. Once CSS dynamic loading is enabled, remove the `&& false`
    v => v === 'dark' && false,
    v => v ? 'dark' : 'light');

  const [isSplitView, setIsSplitView] = usePersistedState<boolean>(
    `diff-split`, 'true', v => v === 'true', v => v ? 'true' : 'false');

  const [isIncrementalSearch, setIsIncrementalSearch] = usePersistedState<boolean>(
    `incremental-search`, 'true', v => v === 'true', v => v ? 'true' : 'false');

  //
  // Get the site data (run once)
  const [siteData, setSiteData] = useState<SiteData>(initSiteData);
  useEffect(() => {getSiteData().then(v => setSiteData(v)); }, []);

  //
  // Locale and the names of all languages in the language of the user
  const [locale, setLocaleVal] = usePersistedState<string>(`lang`, 'en', v => v, v => v);

  //
  // Names of all languages in the user's language
  const [languageNames, setLanguageDate] = useState<LanguageNames>({});
  useEffect(() => {
    getLanguageNames(locale).then(v => setLanguageDate(v));
  }, [locale]);

  //
  // Configure language localization
  const [messages, setMessages] = useState<AllMessages>(initMessages);

  const setLocale = useCallback((newLocale: string): void => {
    loadLocale(newLocale, messages).then(newMsgs => {
      if (newMsgs) {
        setMessages(newMsgs);
      }
      if (locale !== newLocale) {
        setLocaleVal(newLocale);
      }
    });
  }, [locale, messages, setLocaleVal]);

  // Do this only once to load user's locale
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLocale(locale); }, []);

  // // @ts-ignore
  // [(isDarkTheme ? themeLight : themeDark)].unuse();
  // // @ts-ignore
  // [(isDarkTheme ? themeDark : themeLight)].use();

  return (
    <SettingsContext.Provider
      value={{
        siteData,
        isDarkTheme,
        setIsDarkTheme,
        isSplitView,
        setIsSplitView,
        isIncrementalSearch,
        setIsIncrementalSearch,
        locale,
        messages,
        setLocale,
        languageNames,
      }}>
      {children}
    </SettingsContext.Provider>
  );
};

const SettingsDialog = () => {
  const {
    isDarkTheme,
    setIsDarkTheme,
    isSplitView,
    setIsSplitView,
    isIncrementalSearch,
    setIsIncrementalSearch,
  } = useContext(SettingsContext);
  const { user } = useContext(UserContext);

  const results = [
    <EuiSwitch
      key={'theme'}
      label={'Night mode'}
      checked={isDarkTheme}
      disabled
      onChange={e => setIsDarkTheme(e.target.checked)}
    />,
    <EuiSpacer key={'s1'} size={'m'}/>,
    <EuiSwitch
      key={'split'}
      label={'Split diff view'}
      title={'Show page comparison side by side (split) or unified.'}
      checked={isSplitView}
      onChange={e => setIsSplitView(e.target.checked)}
    />,
    <EuiSpacer key={'s2'} size={'m'}/>,
    <EuiSwitch
      key={'inc'}
      label={'Incremental search'}
      title={'Search as you type. If disabled, you must press ENTER after entering the search query string. Disable when your computer is not performing fast enough when entering queries.'}
      checked={isIncrementalSearch}
      onChange={e => setIsIncrementalSearch(e.target.checked)}
    />,
    <EuiSpacer key={'s3'} size={'m'}/>,
    <EuiHeaderLink key={'logout'} disabled={user.state !== UserState.LoggedIn}
                   href={`${rootUrlData}logout`}>Logout...</EuiHeaderLink>,
  ];

  return (<>{results}</>);
};

export const Settings = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLanguagesOpen, setIsLanguagesOpen] = useState(false);
  const { siteData, languageNames, locale, setLocale } = useContext(SettingsContext);

  const closePopover = () => { setIsLanguagesOpen(false); };

  const settingsButton = (<EuiButtonIcon
    iconSize={'m'}
    iconType={'gear'}
    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
    aria-label={'Open options menu'}
    color={'text'}
  />);

  const langOptions = useMemo((): EuiSelectableOption[] =>
    siteData.languages.map(lang => {
      const res = { key: lang, label: languageNames[lang] || 'Unknown' } as EuiSelectableOption;
      if (lang === locale) {
        res.checked = 'on';
      }
      return res;
    }), [languageNames, locale, siteData.languages]);

  // FIXME: update this link to ...?
  // const translateWikiUrl = `https://translatewiki.org/`;

  const languageSelector = (<EuiPopover
    id="popover"
    panelPaddingSize="none"
    button={<EuiButtonEmpty onClick={() => setIsLanguagesOpen(true)}>{locale}</EuiButtonEmpty>}
    isOpen={isLanguagesOpen}
    closePopover={closePopover}>
    <EuiSelectable
      searchable
      singleSelection={'always'}
      // TODO: enable height once the translations list is larger
      // height={500}
      searchProps={{
        placeholder: 'Filter list',
        compressed: true,
      }}
      options={langOptions}
      onChange={(val: EuiSelectableOption[]) => {
        setLocale(val.filter(v => v.checked === 'on')[0].key!);
        closePopover();
      }}>
      {(list, search) => (
        <div style={{ width: 240 }}>
          <EuiPopoverTitle>{search}</EuiPopoverTitle>
          {list}
          {/* FIXME: add this to the EuiLink below, and fix the ref  href={translateWikiUrl}*/}
          <EuiPanel paddingSize="m"><EuiLink target={'_blank'}><EuiButtonIcon
            iconType={'globe'}/> Help translate</EuiLink></EuiPanel>
        </div>
      )}
    </EuiSelectable>
  </EuiPopover>);

  return (<EuiFlexGroup alignItems={'center'}>
    <EuiFlexItem grow={false}>
      <EuiPopover
        key={'s'}
        button={settingsButton}
        isOpen={isSettingsOpen}
        closePopover={() => setIsSettingsOpen(false)}>
        <EuiPopoverTitle>Options</EuiPopoverTitle>
        {isSettingsOpen ? <SettingsDialog/> : null}
      </EuiPopover>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      {languageSelector}
    </EuiFlexItem>
  </EuiFlexGroup>);
};
