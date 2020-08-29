import React, { useContext } from 'react';
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderLink,
  EuiHeaderLogo,
  EuiHeaderSectionItem,
  EuiLink,
  EuiPageHeader,
  EuiPageHeaderSection
} from '@elastic/eui';

import { Settings } from '../contexts/Settings';
import { User } from './User';
import { logoIcon } from '../icons/icons';
import { I18nContext } from '../contexts/I18nContext';
import { Message } from './Message';

export function Header() {
  const { i18n } = useContext(I18nContext);

  const userLink = (<EuiLink color={'text'}
                             href={'https://www.mediawiki.org/wiki/User:Yurik'} target={'_blank'}>User:Yurik</EuiLink>);

  return (
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiHeaderSectionItem border={'none'}>
          <EuiHeaderLogo iconType={logoIcon}>
            <EuiFlexGroup gutterSize={'none'} alignItems={'center'} responsive={false}>
              <EuiFlexItem>
                Dibabel
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiBetaBadge label={i18n('header-beta--label')} title={i18n('header-beta--tooltip')}/>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiHeaderLogo>
        </EuiHeaderSectionItem>
      </EuiPageHeaderSection>
      <EuiPageHeaderSection>
        <EuiHeaderSectionItem>
          <Message size={'s'} id="header-description" placeholders={[userLink]}/>
        </EuiHeaderSectionItem>
      </EuiPageHeaderSection>
      <EuiPageHeaderSection>
        <EuiHeaderLink iconType={'help'}
                       target={'_blank'}
                       href={'https://www.mediawiki.org/wiki/WP:TNT'}>
          <Message id="header-links--help"/>
        </EuiHeaderLink>
        <EuiHeaderLink iconType={'logoGithub'}
                       target={'_blank'}
                       href={'https://github.com/nyurik/dibabel-js'}>
          <Message id="header-links--source"/>
        </EuiHeaderLink>
        <EuiHeaderLink iconType={'bug'}
                       target={'_blank'}
                       href={'https://github.com/nyurik/dibabel-js/issues'}>
          <Message id="header-links--bugs"/>
        </EuiHeaderLink>
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
  );
}
