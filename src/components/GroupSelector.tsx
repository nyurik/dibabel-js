import React, { useMemo } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { GroupDefsType } from '../data/types';

export const GroupSelector = (props: {
  groupDefs: GroupDefsType,
  groupSelection: Array<string>,
  setGroupSelection: (value: Array<string>) => void,
}) => {
  const [options, optsAsMap]: [
    Array<EuiComboBoxOptionOption<string>>,
    { [key: string]: EuiComboBoxOptionOption<string> }
  ] = useMemo(() => {

    const optsAsMap = Object.fromEntries(
      Object.entries(props.groupDefs).map(
        ([k, v]) => [k, { label: v.groupName, 'data-group': k }]
      )
    );
    return [Object.values(optsAsMap), optsAsMap];
  }, [props.groupDefs]);

  const onChange = (groupChoices: Array<EuiComboBoxOptionOption<string>>) => {
    props.setGroupSelection(groupChoices.map((v: any) => v['data-group']));
  };

  return (<EuiComboBox
    fullWidth={true}
    placeholder="Group by ..."
    options={options}
    selectedOptions={props.groupSelection.map(v => optsAsMap[v])}
    onChange={onChange}
    isClearable={true}
  />);

};
