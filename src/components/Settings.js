import React from 'react';
import * as U from '@elastic/eui';

export class Settings extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };
  }

  onButtonClick() {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  }

  closePopover() {
    this.setState({
      isPopoverOpen: false,
    });
  }

  switchDarkMode() {
    alert('NOT IMPLEMENTED');
  }

  render() {
    const button = (<U.EuiButtonIcon
      iconType="gear"
      onClick={this.onButtonClick.bind(this)}
      aria-label="Open options menu"
      color="text"
    />);

    return <U.EuiPopover
      button={button}
      isOpen={this.state.isPopoverOpen}
      closePopover={this.closePopover.bind(this)}>
      <U.EuiPopoverTitle>Options</U.EuiPopoverTitle>
      <div className="guideOptionsPopover">
        <U.EuiSwitch
          label="Night mode"
          checked
          disabled
          onChange={this.switchDarkMode.bind(this)}
        />
      </div>
    </U.EuiPopover>;
  }
}
