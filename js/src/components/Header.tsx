import React from 'react';
import { Message } from '@wikimedia/react.i18n';
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderLink,
  EuiHeaderLogo,
  EuiHeaderSectionItem,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiText
} from '@elastic/eui';
import { Settings } from '../contexts/Settings';
import { User } from './User';
import { logoIcon } from '../icons/icons';

export function Header() {
  return (
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiHeaderSectionItem border={'none'}>
          <EuiHeaderLogo iconType={logoIcon}>
            Dibabel&nbsp;&nbsp;<EuiBetaBadge label={'i18n.dibabel-header-beta--label'} title={'i18n.dibabel-header-beta--title'}/>
          </EuiHeaderLogo>
        </EuiHeaderSectionItem>
      </EuiPageHeaderSection>
      <EuiPageHeaderSection>
        <EuiHeaderSectionItem>
          <EuiText size={'s'}>i18n.dibabel-header-description</EuiText>
        </EuiHeaderSectionItem>
      </EuiPageHeaderSection>
      <EuiPageHeaderSection>
        <EuiHeaderLink iconType={'help'}
                       target={'_blank'}
                       href={'https://www.mediawiki.org/wiki/WP:TNT'}>i18n.dibabel-header-links--help</EuiHeaderLink>
        <EuiHeaderLink iconType={'logoGithub'}
                       target={'_blank'}
                       href={'https://github.com/nyurik/dibabel-js'}>i18n.dibabel-header-links--source</EuiHeaderLink>
        <EuiHeaderLink iconType={'bug'}
                       target={'_blank'}
                       href={'https://github.com/nyurik/dibabel-js/issues'}><Message id="dibabel-header-links--bugs"/></EuiHeaderLink>
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
