import React, { useContext } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer';

import { PageType } from '../services/types';
import { SettingsContext } from '../contexts/Settings';
import { I18nContext } from '../contexts/I18nContext';

export const ItemDiffBlock = ({ type, oldText, newText }: { type: PageType, oldText: string, newText: string }) => {
  const { i18n } = useContext(I18nContext);
  const { isDarkTheme, isSplitView } = useContext(SettingsContext);

  const isSame = oldText === newText;
  return (
    <div className={'diff-view'}>
      <ReactDiffViewer
        leftTitle={isSame ? '' : i18n('diff-label--current', type)}
        rightTitle={isSame ? '' : i18n('diff-label--new', type)}
        oldValue={oldText}
        newValue={newText}
        splitView={!isSame && isSplitView}
        compareMethod={DiffMethod.WORDS}
        useDarkTheme={isDarkTheme}
        showDiffOnly={!isSame}
        hideLineNumbers={isSame}
        // Something is wrong here - somehow renderContent is called with undefined
        renderContent={(str: any) => str === undefined ? null as any : (<pre
          style={{ display: 'inline' }}
          dangerouslySetInnerHTML={{
            __html: Prism.highlight(str, type === 'module' ? Prism.languages.lua : Prism.languages.wiki),
          }}
        />)}
      />
    </div>);
};
