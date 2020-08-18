import React from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { GroupDefsType, Item } from '../types';
import { sortBy } from 'lodash';

export const GroupSelector = (props: {
  groupDefs: GroupDefsType,
  groupSelection: Array<keyof Item>,
  setGroupSelection: (value: Array<keyof Item>) => void,
}) => {
  const optsAsMap = Object.fromEntries(
    Object.entries(props.groupDefs).map(
      ([k, v]) => [k, { label: v.groupName, 'data-group': k, 'data-order': v.order }]
    )
  );

  const onChange = (groupChoices: Array<EuiComboBoxOptionOption<string>>) => {
    // perform stable sort to keep values with the same order as was chosen by the user
    props.setGroupSelection(
      sortBy(groupChoices, (v: any) => parseInt(v['data-order'])).map((v: any) => v['data-group']));
  };

  return (<EuiComboBox
    fullWidth={true}
    placeholder={'i18n.dibabel-filters-groupby--placeholder'}
    title={'i18n.dibabel-filters-groupby--title'}
    options={Object.values(optsAsMap)}
    selectedOptions={props.groupSelection.map(v => optsAsMap[v])}
    onChange={onChange}
    isClearable={true}
  />);

};
