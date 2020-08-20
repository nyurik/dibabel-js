import React, { Dispatch, DispatchWithoutAction, useContext, useState } from 'react';

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiText,
  EuiTextAlign,
} from '@elastic/eui';
import { error, sleep, success } from '../utils';
import { ToastsContext } from '../contexts/Toasts';

import { I18nContext } from '../contexts/I18nContext';
import { Message } from './Message';
import { AllDataContext } from '../contexts/AllData';
import { uniq } from 'lodash';
import { ItemDstLink, ItemSrcLink, NotMultisiteDepsWarning } from './Snippets';
import { Item } from '../types';

const Picker = ({ disabled, placeholder, value, setValue, options }: {
  disabled: boolean,
  placeholder: string,
  value: string | undefined,
  setValue: Dispatch<string | undefined>,
  options: string[],
}) => {
  const onTitleChange = (choices: EuiComboBoxOptionOption<string>[]) => {
    if (choices && choices.length > 0) {
      setValue(choices[0].label);
    } else {
      setValue(undefined);
    }
  };

  const opts = options.sort().map(v => ({ label: v }));
  return (<EuiComboBox
    placeholder={placeholder}
    singleSelection={{ asPlainText: true }}
    options={opts}
    isDisabled={disabled || options.length === 0}
    selectedOptions={value ? opts.filter(v => v.label === value) : []}
    onChange={onTitleChange}
  />);
};

export const AddNew = ({ onClose }: { onClose: DispatchWithoutAction }) => {
  const { i18n } = useContext(I18nContext);
  const addToast = useContext(ToastsContext);

  // TODO
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [status, setStatus] = useState<'show' | 'saving'>('show');
  const [pageTitle, setPageTitle] = useState<string | undefined>();
  const [wiki, setWiki] = useState<string | undefined>();
  const { allItems } = useContext(AllDataContext);

  const onCopy = async () => {
    try {
      setStatus('saving');

      // const res = await postToApi(currentItem!.wiki, {
      //   action: 'edit',
      //   title: currentItem!.dstFullTitle,
      //   text: syncData!.newText,
      //   summary: comment,
      //   basetimestamp: syncData!.syncInfo.timestamp,
      //   nocreate: '1',
      //   token: await getToken(currentItem!.wiki),
      // });
      //
      // if (res.edit.result !== 'Success') {
      //   setItemStatus({ status: 'error', error: res.edit.info || JSON.stringify(res.edit) });
      //   return;
      // }

      await sleep(3000);

      // TODO
      const newItem: Item = {
        dstTitleUrl: `https://dibabel.toolsforge.org/`,
        lang: 'xx',
        project: 'wikipedia',
        dstFullTitle: pageTitle!,
      } as Item;

      // FIXME I18N
      addToast(success({
        title: (<EuiText><Message id="Page $1 has been successfully created (Not really, just testing)"
                                  placeholders={[(<ItemDstLink item={newItem}/>)]}/></EuiText>),
        iconType: 'check',
        toastLifeTimeMs: 15000
      }));

      // updateSavedItem(currentItem!);
    } catch (err) {
      addToast(error({
        // FIXME: change message ID
        title: (<EuiText><Message id="Error saving $1:  $2"
                                  placeholders={['LINK_TODO', err.toString()]}/></EuiText>),
      }));
    } finally {
      onClose();
    }
  };

  let pageHelpText = undefined;
  let knownWikis = 0;
  let wikiOptions: string[] = [];
  let existsOn: Set<string> = new Set();

  // TODO: decide how to produce this
  let item: Item | null = null;

  if (pageTitle) {
    // TODO: download a full list of wikis instead of this
    const items = allItems.filter(v => v.srcFullTitle === pageTitle);
    if (items.length > 0) {
      item = items[0];
      pageHelpText = (<ItemSrcLink item={item}/>);
    }
    existsOn = new Set(items.map(v => v.wiki));
    wikiOptions = uniq(allItems.map(v => v.wiki));
    knownWikis = wikiOptions.length;
    wikiOptions = wikiOptions.filter(v => !existsOn.has(v));
  }

  let warnings = undefined;
  if (item && item.notMultisiteDeps) {
    warnings = (
      <EuiFormRow label={i18n('Attention')}>
        <NotMultisiteDepsWarning item={item}/>
      </EuiFormRow>);
  }

  const setNewPageTitle = (newTitle: string | undefined) => {
    // Make sure that if the wiki has already been chosen and title changes,
    // wiki is kept only if it doesn't have the new title
    setPageTitle(newTitle);
    let newWiki;
    if (newTitle) {
      newWiki = allItems.some(v => v.srcFullTitle === newTitle && v.wiki === wiki) ? undefined : wiki;
    } else {
      newWiki = undefined;
    }
    if (wiki !== newWiki) {
      setWiki(newWiki);
    }
  };

  // FIXME I18N
  return (<EuiOverlayMask><EuiModal onClose={onClose} maxWidth={'60%'}>
    <EuiModalHeader>
      <EuiModalHeaderTitle>{i18n('Copy page to another wiki...')}</EuiModalHeaderTitle>
    </EuiModalHeader>
    <EuiModalBody>
      <EuiForm>
        <EuiFormRow label={i18n('A page to copy')} helpText={pageHelpText}>
          <Picker disabled={status !== 'show'} placeholder={i18n('Select a page to copy')} value={pageTitle}
                  setValue={setNewPageTitle}
                  options={uniq(allItems.map(v => v.srcFullTitle))}/>
        </EuiFormRow>
        <EuiFormRow label={i18n('Target wiki')}
                    helpText={pageTitle ? i18n('Already exists on $1 out of $2 wikis.', existsOn.size, knownWikis) : undefined}>
          <Picker disabled={status !== 'show'} placeholder={i18n('Select target wiki')} value={wiki} setValue={setWiki}
                  options={wikiOptions}/>
        </EuiFormRow>
        {warnings}
      </EuiForm>
    </EuiModalBody>
    <EuiModalFooter>
      <EuiTextAlign textAlign="left"><EuiBadge color={'accent'}>NOT IMPLEMENTED</EuiBadge></EuiTextAlign>
      <EuiButtonEmpty onClick={onClose}>{i18n('Cancel')}</EuiButtonEmpty>
      <EuiButton isDisabled={status !== 'show' || !pageTitle || !wiki}
                 onClick={onCopy}
                 color={warnings ? 'danger' : 'primary'}
                 isLoading={status === 'saving'}
                 fill>{i18n('Create!')}</EuiButton>
    </EuiModalFooter>
  </EuiModal>
  </EuiOverlayMask>);
};
