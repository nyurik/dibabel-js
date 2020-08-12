import React, { useMemo } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { GroupDefsType, Item } from '../data/types';
import { sortBy } from 'lodash';

export const GroupSelector = (props: {
  groupDefs: GroupDefsType,
  groupSelection: Array<keyof Item>,
  setGroupSelection: (value: Array<keyof Item>) => void,
}) => {
  const [options, optsAsMap]: [
    Array<EuiComboBoxOptionOption<string>>,
    { [key: string]: EuiComboBoxOptionOption<string> }
  ] = useMemo(() => {

    const optsAsMap = Object.fromEntries(
      Object.entries(props.groupDefs).map(
        ([k, v]) => [k, { label: v.groupName, 'data-group': k, 'data-order': v.order }]
      )
    );
    return [Object.values(optsAsMap), optsAsMap];
  }, [props.groupDefs]);

  const onChange = (groupChoices: Array<EuiComboBoxOptionOption<string>>) => {
    // perform stable sort to keep values with the same order value as is
    props.setGroupSelection(
      sortBy(groupChoices, (v: any) => parseInt(v['data-order'])).map((v: any) => v['data-group']));
  };

  return (<EuiComboBox
    fullWidth={true}
    placeholder={'Group by ...'}
    title={'Group table by one or more fields.'}
    options={options}
    selectedOptions={props.groupSelection.map(v => optsAsMap[v])}
    onChange={onChange}
    isClearable={true}
  />);

};
