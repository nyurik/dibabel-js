import React from 'react';

import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderLink,
  EuiHeaderLogo,
  EuiHeaderSectionItem,
  EuiLink,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiText
} from '@elastic/eui';
import { Settings } from './Settings';
import { User } from './User';
import { logoIcon } from '../icons/icons';

export function Header() {
  return (
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiHeaderSectionItem border={'none'}>
          <EuiHeaderLogo iconType={logoIcon}>
            Dibabel&nbsp;&nbsp;<EuiBetaBadge label={'BETA'} title={'Work in progress. Please verify your changes.'}/>
          </EuiHeaderLogo>
        </EuiHeaderSectionItem>
      </EuiPageHeaderSection>
      <EuiPageHeaderSection>
        <EuiHeaderSectionItem>
          <EuiText size={'s'}>Keep modules and templates the same across languages. Written by&nbsp;<EuiLink
            color={'text'} href={'https://www.mediawiki.org/wiki/User:Yurik'}
            target={'_blank'}>User:Yurik</EuiLink></EuiText>
        </EuiHeaderSectionItem>
      </EuiPageHeaderSection>
      <EuiPageHeaderSection>
        <EuiHeaderLink iconType={'help'}
                       target={'_blank'}
                       href={'https://www.mediawiki.org/wiki/WP:TNT'}>Help</EuiHeaderLink>
        <EuiHeaderLink iconType={'logoGithub'}
                       target={'_blank'}
                       href={'https://github.com/nyurik/dibabel-js'}>Source</EuiHeaderLink>
        <EuiHeaderLink iconType={'bug'}
                       target={'_blank'}
                       href={'https://github.com/nyurik/dibabel-js/issues'}>Bugs &amp; Ideas</EuiHeaderLink>
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
