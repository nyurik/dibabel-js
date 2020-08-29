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
  EuiSwitch,
  EuiToolTip
} from '@elastic/eui';

import Banana from 'banana-i18n';

import { UserContext, UserState } from './UserContext';
import { rootUrlData, rootUrlSite, usePersistedState } from '../services/utils';
import { I18nContext } from './I18nContext';
import { Props } from '../services/types';
import i18n_en from './messages-en.json';

export type LanguageNames = Map<string, string>;
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
  languageNamesLowerCase: LanguageNames,
  i18nInLocale: (locale: string, key: string, ...parameters: any[]) => Promise<string>,
}

export const SettingsContext = React.createContext<SettingsContextType>({} as SettingsContextType);

const initMessages: AllMessages = { en: i18n_en };
const initSiteData: SiteData = { languages: ['en'] };

async function loadLocale(newLanguage: string, messages: AllMessages): Promise<Messages> {
  if (!messages[newLanguage]) {
    try {
      const resp = await fetch(`${rootUrlSite}i18n/${newLanguage}.json`);
      if (resp.ok) {
        // return new object that combines new download plus existing languages
        return Object.assign({ [newLanguage]: await resp.json() }, messages);
      }
    } catch {
      // TODO: report errors?
    }
    // Cache that there is no such language (will use fallbacks)
    return Object.assign({ [newLanguage]: {} }, messages);
  }
  return null;
}

async function getLanguageNames(langCode: string): Promise<LanguageNames> {
  const isDebugLang = langCode === 'qqx';
  const mw_languages_query = 'https://www.mediawiki.org/w/api.php?action=query&meta=languageinfo&liprop=name|autonym&format=json&formatversion=2&origin=*&uselang=';
  let data = await fetch(mw_languages_query + encodeURIComponent(isDebugLang ? 'en' : langCode));
  if (data.ok) {
    const langs = (await data.json()).query.languageinfo;
    const result = new Map();
    Object.keys(langs).forEach(lang => {
      const langInfo = langs[lang];
      let name = langInfo.name;
      if (langInfo.autonym && langInfo.autonym !== langInfo.name) {
        name += ` - ${langInfo.autonym}`;
      }
      result.set(lang, name);
    });
    result.set('qqx', '* Debug UI');
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

const initLanguageNames = new Map<string, string>();

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
  const [locale, setLocale] = usePersistedState<string>(`lang`, 'en', v => v, v => v);

  //
  // Names of all languages in the user's language
  const [languageNames, setLanguageNames] = useState<LanguageNames>(initLanguageNames);
  useEffect(() => {
    getLanguageNames(locale).then(v => setLanguageNames(v));
  }, [locale]);
  const languageNamesLowerCase = useMemo((): Map<string, string> => {
    const res = new Map<string, string>();
    languageNames.forEach((v, k) => res.set(k, v.toLowerCase()));
    return res;
  }, [languageNames]);

  //
  // Configure language localization
  const [messages, setMessages] = useState<AllMessages>(initMessages);

  const setLocaleCB = useCallback((newLocale: string): void => {
    loadLocale(newLocale, messages).then(newMsgs => {
      if (newMsgs) {
        setMessages(newMsgs);
      }
      if (locale !== newLocale) {
        setLocale(newLocale);
      }
    });
  }, [locale, messages, setLocale]);

  const i18nInLocale = useCallback(async (locale: string, key: string, ...parameters: any[]): Promise<string> => {
    const newMsgs = await loadLocale(locale, messages);
    if (newMsgs) {
      setMessages(newMsgs);
    }
    const banana = new Banana(locale, { messages: newMsgs || messages });
    return banana.i18n(key, ...parameters);
  }, [messages]);

  // Do this only once to load user's locale
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLocaleCB(locale); }, []);

  // [(isDarkTheme ? themeLight : themeDark)].unuse();
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
        setLocale: setLocaleCB,
        languageNames,
        languageNamesLowerCase,
        i18nInLocale,
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
  const { i18n } = useContext(I18nContext);

  const results = [
    <EuiSwitch
      key={'theme'}
      label={i18n('settings-theme--label')}
      checked={isDarkTheme}
      disabled
      onChange={e => setIsDarkTheme(e.target.checked)}
    />,
    <EuiSpacer key={'s1'} size={'m'}/>,
    <EuiSwitch
      key={'split'}
      label={i18n('settings-split--label')}
      title={i18n('settings-split--tooltip')}
      checked={isSplitView}
      onChange={e => setIsSplitView(e.target.checked)}
    />,
    <EuiSpacer key={'s2'} size={'m'}/>,
    <EuiSwitch
      key={'inc'}
      label={i18n('settings-search--label')}
      title={i18n('settings-search--tooltip')}
      checked={isIncrementalSearch}
      onChange={e => setIsIncrementalSearch(e.target.checked)}
    />,
    <EuiSpacer key={'s3'} size={'m'}/>,
    <EuiHeaderLink key={'logout'} disabled={user.state !== UserState.LoggedIn}
                   href={`${rootUrlData}logout`}>{i18n('settings-logout')}</EuiHeaderLink>,
  ];

  return (<>{results}</>);
};

export const Settings = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLanguagesOpen, setIsLanguagesOpen] = useState(false);
  const { siteData, languageNames, locale, setLocale } = useContext(SettingsContext);

  const closePopover = () => { setIsLanguagesOpen(false); };
  const { i18n } = useContext(I18nContext);

  const settingsButton = (<EuiButtonIcon
    iconSize={'m'}
    iconType={'gear'}
    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
    aria-label={i18n('settings-gear--aria')}
    color={'text'}
  />);

  const langOptions = useMemo((): EuiSelectableOption[] =>
    siteData.languages.map(lang => {
      const res = { key: lang, label: languageNames.get(lang) || i18n('language-unknown') } as EuiSelectableOption;
      if (lang === locale) {
        res.checked = 'on';
      }
      return res;
    }), [i18n, languageNames, locale, siteData.languages]);

  const languageSelector = (<EuiPopover
    id="popover"
    panelPaddingSize="none"
    button={<EuiToolTip title={languageNames.get(locale) || i18n('language-unknown')}
                        content={i18n('language--tooltip')}><EuiButtonEmpty
      onClick={() => setIsLanguagesOpen(true)}>{locale}</EuiButtonEmpty></EuiToolTip>}
    isOpen={isLanguagesOpen}
    closePopover={closePopover}>
    <EuiSelectable
      searchable
      singleSelection={'always'}
      height={500}
      searchProps={{
        placeholder: i18n('language-filter--placeholder'),
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
          <EuiPanel paddingSize="m"><EuiLink
            id={'translate-link'}
            href={`https://translatewiki.net/w/i.php?title=Special:Translate&group=dibabel&action=translate&language=${encodeURIComponent(locale)}`}
            target={'_blank'}><EuiButtonIcon
            iconType={'globe'} aria-labelledby={'translate-link'}/>{i18n('language-help')}</EuiLink></EuiPanel>
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
        <EuiPopoverTitle>{i18n('settings-options')}</EuiPopoverTitle>
        {isSettingsOpen ? <SettingsDialog/> : null}
      </EuiPopover>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      {languageSelector}
    </EuiFlexItem>
  </EuiFlexGroup>);
};
