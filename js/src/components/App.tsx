import React, { useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderLink,
  EuiHeaderLogo,
  EuiHeaderSectionItem,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiBadge,
  EuiLink
} from '@elastic/eui';

import { ItemViewer } from './ItemViewer';
import { Settings } from './Settings';
import { WorkArea } from './WorkArea';
import { addToast, Toasts } from './Toasts';
import { User } from './User';
import { Item } from '../data/types';
import { UserProvider } from '../data/UserContext';
import { ThemeProvider } from '../themes/ThemeContext';
import { siteIcons } from '../icons/icons';

export function App() {
  const [item, setItem] = useState<Item | null>(null);
  const closeItem = () => setItem(null);

  return (
    <ThemeProvider>
      <UserProvider addToast={addToast}>
        <EuiPage>
          <EuiPageBody>
            <EuiPageHeader>
              <EuiPageHeaderSection>
                <EuiHeaderSectionItem border="right">
                  <EuiHeaderLogo
                    iconType={siteIcons.wikipedia}>
                    Dibabel
                  </EuiHeaderLogo>
                  from [[<EuiLink href={'https://www.mediawiki.org/wiki/User:Yurik'} target={'_blank'}>User:Yurik</EuiLink>]] helps keep it in sync
                </EuiHeaderSectionItem>
                <EuiHeaderSectionItem>
                  <EuiBadge color={'accent'}>Demo site, editing is disabled for now.</EuiBadge>
                </EuiHeaderSectionItem>
              </EuiPageHeaderSection>
              <EuiPageHeaderSection>
                <EuiHeaderLink iconType="help"
                               target="_blank"
                               href="https://www.mediawiki.org/wiki/WP:TNT">Help</EuiHeaderLink>
                <EuiHeaderLink iconType="logoGithub"
                               target="_blank"
                               href="https://github.com/nyurik/dibabel-js">Source</EuiHeaderLink>
              </EuiPageHeaderSection>
              <EuiPageHeaderSection>
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="s"
                  responsive={false}
                  wrap>
                  <EuiFlexItem grow={false}><User/></EuiFlexItem>
                  <EuiFlexItem grow={false}><Settings/></EuiFlexItem>
                </EuiFlexGroup>
              </EuiPageHeaderSection>
            </EuiPageHeader>
            <WorkArea addToast={addToast} setItem={setItem}/>
          </EuiPageBody>
          <ItemViewer item={item} onClose={closeItem}/>
          <Toasts/>
        </EuiPage>
      </UserProvider>
    </ThemeProvider>
  );
}
