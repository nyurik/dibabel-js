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
import { addToast, Toasts } from './Toasts';
import { ItemViewer } from './ItemViewer';

export function App() {

  const [item, setItem] = useState(null);
  const closeItem = () => setItem(null);

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
        <WorkArea addToast={addToast} user={user} setItem={setItem}/>
      </EuiPageBody>
      <ItemViewer item={item} close={closeItem}/>
      <Toasts/>
    </EuiPage>
  );
}
