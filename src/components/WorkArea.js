import React from 'react';
import * as U from '@elastic/eui';
import { userPending, userUnknown } from "./User";

export class WorkArea extends React.Component {
  render() {
    switch (this.props.user) {
      case userPending:
      case userUnknown:
        return "";
      default:
        return <U.EuiPageContent>
          <U.EuiPageContentHeader>
            <U.EuiPageContentHeaderSection>
              <U.EuiTitle>
                <h2>Content title</h2>
              </U.EuiTitle>
            </U.EuiPageContentHeaderSection>
          </U.EuiPageContentHeader>
          <U.EuiPageContentBody>Content body</U.EuiPageContentBody>
        </U.EuiPageContent>;
    }
  }
}
