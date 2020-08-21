import React, { useContext } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiToolTip } from '@elastic/eui';
import { GroupDefsType, Item } from '../types';
import { sortBy } from 'lodash';
import { I18nContext } from '../contexts/I18nContext';

export const GroupSelector = (props: {
  groupDefs: GroupDefsType,
  groupSelection: Array<keyof Item>,
  setGroupSelection: (value: Array<keyof Item>) => void,
}) => {
  const { i18n } = useContext(I18nContext);
  const optsAsMap = Object.fromEntries(
    Object.entries(props.groupDefs).map(
      ([k, v]) => [k, { label: i18n(v.groupI18n), 'data-group': k, 'data-order': v.order }]
    )
  );

  const onChange = (groupChoices: EuiComboBoxOptionOption<string>[]) => {
    // perform stable sort to keep values with the same order as was chosen by the user
    props.setGroupSelection(
      sortBy(groupChoices, (v: any) => parseInt(v['data-order'])).map((v: any) => v['data-group']));
  };

  return (
    <EuiToolTip anchorClassName="eui-displayBlock"
                content={i18n('dibabel-filters-groupby--tooltip')}>
      <EuiComboBox
        fullWidth={true}
        placeholder={i18n('dibabel-filters-groupby--placeholder')}
        options={Object.values(optsAsMap)}
        selectedOptions={props.groupSelection.map(v => optsAsMap[v])}
        onChange={onChange}
        isClearable={true}
      />
    </EuiToolTip>);

};
