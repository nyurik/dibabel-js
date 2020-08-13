import React from 'react';

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderLink,
  EuiHeaderLogo,
  EuiHeaderSectionItem,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer
} from '@elastic/eui';
import { Settings } from './Settings';
import { WorkArea } from './WorkArea';
import { ToastsProvider } from './Toasts';
import { User } from './User';
import { UserProvider } from '../data/UserContext';
import { ThemeProvider } from '../themes/ThemeContext';
import { siteIcons } from '../icons/icons';

export function App() {
  return (
    <ThemeProvider>
      <ToastsProvider>
        <UserProvider>
          <EuiPage>
            <EuiPageBody>
              <EuiPageHeader>
                <EuiPageHeaderSection>
                  <EuiHeaderSectionItem border={'right'}>
                    <EuiHeaderLogo
                      iconType={siteIcons.wikipedia}>
                      Dibabel
                    </EuiHeaderLogo>
                  </EuiHeaderSectionItem>
                  <EuiHeaderSectionItem>
                    Helps wikis synchronize modules and templates across languages. Written by&nbsp;<EuiLink
                    href={'https://www.mediawiki.org/wiki/User:Yurik'} target={'_blank'}>User:Yurik</EuiLink>.
                  </EuiHeaderSectionItem>
                  <EuiSpacer size={'s'}/>
                  <EuiHeaderSectionItem>
                    <EuiBadge color={'accent'}>Alpha version! Please verify all changes.</EuiBadge>
                  </EuiHeaderSectionItem>
                </EuiPageHeaderSection>
                <EuiPageHeaderSection>
                  <EuiHeaderLink iconType={'help'}
                                 target={'_blank'}
                                 href={'https://www.mediawiki.org/wiki/WP:TNT'}>Help</EuiHeaderLink>
                  <EuiHeaderLink iconType={'logoGithub'}
                                 target={'_blank'}
                                 href={'https://github.com/nyurik/dibabel-js'}>Source</EuiHeaderLink>
                </EuiPageHeaderSection>
                <EuiPageHeaderSection>
                  <EuiFlexGroup
                    alignItems={'center'}
                    gutterSize={'s'}
                    responsive={false}
                    wrap>
                    <EuiFlexItem grow={false}><User/></EuiFlexItem>
                    <EuiFlexItem grow={false}><Settings/></EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPageHeaderSection>
              </EuiPageHeader>
              <WorkArea/>
            </EuiPageBody>
          </EuiPage>
        </UserProvider>
      </ToastsProvider>
    </ThemeProvider>
  );
}
