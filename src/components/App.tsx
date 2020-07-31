import React, { useEffect, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderLink,
  EuiHeaderLogo,
  EuiHeaderSectionItem,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection
} from '@elastic/eui';

import { ItemViewer } from './ItemViewer';
import { Settings } from './Settings';
import { WorkArea } from './WorkArea';
import { addToast, Toasts } from './Toasts';
import { getUser, User } from './User';
import { siteIcons } from '../data/icons';
import { Item } from '../data/Store';
import { UserInfo, userPending } from '../data/users';

export function App() {

  const [item, setItem] = useState<Item | null>();
  const closeItem = () => setItem(null);

  const [user, setUser] = useState<UserInfo>(userPending);
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
                iconType={siteIcons.wikipedia}>
                Dibabel - keeps it in sync
              </EuiHeaderLogo>
            </EuiHeaderSectionItem>
          </EuiPageHeaderSection>
          <EuiPageHeaderSection>
            <EuiHeaderLink iconType="help"
                           target="_blank"
                           href="https://www.mediawiki.org/w/index.php?title=WP:TNT">Help</EuiHeaderLink>
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
              <EuiFlexItem grow={false}>
                <User user={user}/>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <Settings/>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <WorkArea addToast={addToast} user={user} setItem={setItem}/>
      </EuiPageBody>
      <ItemViewer item={item} close={closeItem}/>
      <Toasts/>
    </EuiPage>
  );
}
