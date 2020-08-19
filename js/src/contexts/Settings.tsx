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
import { rootUrl, rootUrlI18n, usePersistedState } from '../utils';

import { Props } from '../types';
import i18n_en from './messages_en.json';
import { isEmpty } from 'lodash';

export type Messages = any;
export type AllMessages = { [key: string]: Messages };

export type SettingsContextType = {
  isDarkTheme: boolean,
  setIsDarkTheme: Dispatch<boolean>,
  isSplitView: boolean,
  setIsSplitView: Dispatch<boolean>,
  isIncrementalSearch: boolean,
  setIsIncrementalSearch: Dispatch<boolean>,
  locale: string,
  messages: AllMessages,
  setLocale: Dispatch<string>,
  languageData: LanguageData,
}

export const SettingsContext = React.createContext<SettingsContextType>({} as SettingsContextType);

const initialValue: AllMessages = {
  en: i18n_en,
};

async function loadLocale(newLanguage: string, messages: AllMessages): Promise<Messages> {
  debugger
  const newData: AllMessages = {};
  while (newLanguage) {
    if (!messages[newLanguage]) {
      newData[newLanguage] = {}; // prevent repeated downloads
      try {
        const resp = await fetch(`${rootUrlI18n}i18n/${newLanguage}.json`);
        if (resp.ok) {
          newData[newLanguage] = await resp.json();
        }
      } catch {
        // TODO: report errors?
      }
    }
    const dashIdx = newLanguage.indexOf('-');
    if (dashIdx > -1) {
      newLanguage = newLanguage.substring(0, dashIdx);
    } else {
      newLanguage = '';
    }
  }
  if (!isEmpty(newData)) {
    return Object.assign(newData, messages);
  }
  return null;
}

const mw_languages_query = 'https://www.mediawiki.org/w/api.php?action=query&meta=languageinfo&liprop=name|autonym&format=json&formatversion=2&origin=*';

export type LanguageData = { [key: string]: string };

let languageCache: Promise<LanguageData> | null = null;

export async function getLanguageData(): Promise<LanguageData> {
  if (languageCache) {
    return languageCache;
  } else {
    languageCache = (async (): Promise<LanguageData> => {
      let data = await fetch(mw_languages_query);
      if (data.ok) {
        const langs = (await data.json()).query.languageinfo;
        return Object.fromEntries(Object.keys(langs).map(lang => {
          const langInfo = langs[lang];
          let name = langInfo.name;
          if (langInfo.autonym && langInfo.autonym !== langInfo.name) {
            name += ` - ${langInfo.autonym}`;
          }
          return [lang, name];
        }));
      } else {
        throw new Error(`${data.status}: ${data.statusText}\n${await data.text()}`);
      }
    })();
    return languageCache;
  }
}

export const SettingsProvider = ({ children }: Props) => {
  const [languageData, setLanguageDate] = useState<LanguageData>({});
  useEffect(() => {
    getLanguageData().then(v => setLanguageDate(v));
  });

  const [messages, setMessages] = useState<AllMessages>(initialValue);

  const [isDarkTheme, setIsDarkTheme] = usePersistedState<boolean>(
    'theme', 'light',
    // FIXME!  currently always force to light mode. Once CSS dynamic loading is enabled, remove the `&& false`
    v => v === 'dark' && false,
    v => v ? 'dark' : 'light');

  const [isSplitView, setIsSplitView] = usePersistedState<boolean>(
    `diff-split`, 'true', v => v === 'true', v => v ? 'true' : 'false');

  const [isIncrementalSearch, setIsIncrementalSearch] = usePersistedState<boolean>(
    `incremental-search`, 'true', v => v === 'true', v => v ? 'true' : 'false');

  const [locale, setLocaleVal] = usePersistedState<string>(`lang`, 'en', v => v, v => v);

  const setLocale = useCallback((newLocale: string): void => {
    loadLocale(newLocale, messages).then(newMsgs => {
      if (newMsgs) {
        setMessages(newMsgs);
      }
      setLocaleVal(newLocale);
    });
  }, [messages, setLocaleVal]);

  // // @ts-ignore
  // [(isDarkTheme ? themeLight : themeDark)].unuse();
  // // @ts-ignore
  // [(isDarkTheme ? themeDark : themeLight)].use();

  return (
    <SettingsContext.Provider
      value={{
        isDarkTheme,
        setIsDarkTheme,
        isSplitView,
        setIsSplitView,
        isIncrementalSearch,
        setIsIncrementalSearch,
        locale,
        messages,
        setLocale,
        languageData,
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
      key={'lang'}
      label={'Night mode'}
      checked={isDarkTheme}
      disabled
      onChange={e => setIsDarkTheme(e.target.checked)}
    />,
    <EuiSpacer key={'s0'} size={'m'}/>,
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
                   href={`${rootUrl}logout`}>Logout...</EuiHeaderLink>,
  ];

  return (<>{results}</>);
};

export const Settings = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLanguagesOpen, setIsLanguagesOpen] = useState(false);
  const { languageData, locale, setLocale } = useContext(SettingsContext);

  const closePopover = () => { setIsLanguagesOpen(false); };

  const settingsButton = (<EuiButtonIcon
    iconSize={'m'}
    iconType={'gear'}
    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
    aria-label={'Open options menu'}
    color={'text'}
  />);

  const langOptions = useMemo((): EuiSelectableOption[] => {
    return Object.entries(languageData).map(
      ([lang, name]) => {
        const res = { key: lang, label: name } as EuiSelectableOption;
        if (lang === locale) {
          res.checked = 'on';
        }
        return res;
      });
  }, [languageData, locale]);

  // FIXME: update this link to ...?
  const translateWikiUrl = `https://translatewiki.org/`;

  const languageSelector = (<EuiPopover
    id="popover"
    panelPaddingSize="none"
    button={<EuiButtonEmpty onClick={() => setIsLanguagesOpen(true)}>{locale}</EuiButtonEmpty>}
    isOpen={isLanguagesOpen}
    closePopover={closePopover}>
    <EuiSelectable
      searchable
      singleSelection={'always'}
      height={500}
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
          <EuiPanel paddingSize="m"><EuiLink href={translateWikiUrl} target={'_blank'}><EuiButtonIcon
            iconType={'globe'}/> Help translate</EuiLink></EuiPanel>
        </div>
      )}
    </EuiSelectable>
  </EuiPopover>);

  // debugger;
  return (<EuiFlexGroup alignItems={'center'}>
    <EuiFlexItem grow={false}>
      {languageSelector}
    </EuiFlexItem>
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
  </EuiFlexGroup>);
};
