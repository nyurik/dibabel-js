import React, { useEffect, useState } from 'react';

import { getUser, User, userPending } from './User';
import { Settings } from './Settings';
import { WorkArea } from './WorkArea';

import { EuiPage } from '@elastic/eui/es/components/page';
import { EuiPageBody } from '@elastic/eui/es/components/page/page_body';
import { EuiPageHeader, EuiPageHeaderSection } from '@elastic/eui/es/components/page/page_header';
import { EuiHeaderSectionItem } from '@elastic/eui/es/components/header/header_section';
import { EuiHeaderLogo } from '@elastic/eui/es/components/header';
import { EuiHeaderLink } from '@elastic/eui/es/components/header/header_links';
import { Toasts, addToast } from './Toasts';
import { DiffViewer } from './DiffViewer';

export function App() {

  const [user, setUser] = useState(userPending);
  useEffect(() => {
    if (user === userPending) {
      getUser(addToast).then(setUser);
    }
  }, [user]);

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiHeaderSectionItem border="right">
              <EuiHeaderLogo
                iconType={'https://upload.wikimedia.org/wikipedia/commons/4/4e/Wikipedia-logo-v2-no-text.svg'}>
                Dibabel - keeps it in sync
              </EuiHeaderLogo>
            </EuiHeaderSectionItem>
          </EuiPageHeaderSection>
          <EuiPageHeaderSection>
            <EuiHeaderLink iconType="help" href="#">Help</EuiHeaderLink>
            <EuiHeaderLink iconType="logoGithub"
                           href="https://github.com/nyurik/dibabel-js">Source</EuiHeaderLink>
          </EuiPageHeaderSection>
          <EuiPageHeaderSection>
            <User user={user}/>
            <Settings/>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <WorkArea addToast={addToast} user={user}/>
      </EuiPageBody>
      <Toasts/>
      <Flyout />
    </EuiPage>
  );
}


if (diffViewItem) {
  return (<>
    {mainTable}
  </>);
} else {
