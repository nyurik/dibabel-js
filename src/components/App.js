import React from 'react';

import * as U from '@elastic/eui';
import { getUser, User, userPending } from './User';
import { Settings } from './Settings';
import { WorkArea } from './WorkArea';

export class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: userPending,
    };
  }

  async componentDidMount() {
    try {
      this.setState({ user: await getUser() });
    } catch (err) {
      console.log(err);
    }
  }

  render() {
    return (
      <U.EuiPage>
        <U.EuiPageBody>
          <U.EuiPageHeader>
            <U.EuiPageHeaderSection>
              <U.EuiHeaderSectionItem border="right">
                <U.EuiHeaderLogo
                  iconType={'https://upload.wikimedia.org/wikipedia/commons/4/4e/Wikipedia-logo-v2-no-text.svg'}>
                  Dibabel - keeps it in sync
                </U.EuiHeaderLogo>
              </U.EuiHeaderSectionItem>
            </U.EuiPageHeaderSection>
            <U.EuiPageHeaderSection>
              <U.EuiHeaderLink iconType="help" href="#">Help</U.EuiHeaderLink>
              <U.EuiHeaderLink iconType="logoGithub"
                               href="https://github.com/nyurik/dibabel-js">Source</U.EuiHeaderLink>
            </U.EuiPageHeaderSection>
            <U.EuiPageHeaderSection>
              <User user={this.state.user}/>
              <Settings/>
            </U.EuiPageHeaderSection>
          </U.EuiPageHeader>
          <WorkArea user={this.state.user}/>
        </U.EuiPageBody>
      </U.EuiPage>
    );
  }
}
