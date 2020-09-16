import React, { useContext } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiToolTip } from '@elastic/eui';
import { groupDefs } from '../services/types';
import { sortBy } from 'lodash';
import { I18nContext } from '../contexts/I18nContext';
import { SelectionContext } from '../contexts/SelectionContext';

export const GroupSelector = () => {
  const { i18n } = useContext(I18nContext);
  const { groupSelection, setGroupSelection } = useContext(SelectionContext);

  const optsAsMap = Object.fromEntries(
    Object.entries(groupDefs).map(
      ([k, v]) => [k, { label: i18n(v.groupI18n), 'data-group': k, 'data-order': v.order }]
    )
  );

  const onChange = (groupChoices: EuiComboBoxOptionOption<string>[]) => {
    // perform stable sort to keep values with the same order as was chosen by the user
    setGroupSelection(
      sortBy(groupChoices, (v: any) => parseInt(v['data-order'])).map((v: any) => v['data-group']));
  };

  return (
    <EuiToolTip anchorClassName="eui-displayBlock" content={i18n('filters-groupby--tooltip')}>
      <EuiComboBox
        fullWidth={true}
        placeholder={i18n('filters-groupby--placeholder')}
        options={Object.values(optsAsMap)}
        selectedOptions={groupSelection.map(v => optsAsMap[v])}
        onChange={onChange}
        isClearable={true}
      />
    </EuiToolTip>);
};
