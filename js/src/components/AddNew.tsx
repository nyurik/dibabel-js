import React, { Dispatch, DispatchWithoutAction, useContext, useMemo, useState } from 'react';
import { uniq } from 'lodash';

import {
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
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { AllDataContext, SyncLoader } from '../contexts/AllData';
import { ToastsContext } from '../contexts/Toasts';
import { I18nContext } from '../contexts/I18nContext';
import { Item } from '../services/types';
import { error, fixMwLinks, getSummaryLink, getSummaryMsgFromStatus, success } from '../services/utils';
import { createItem, editItem } from '../services/StateStore';
import { Message } from './Message';
import { Comment, ItemDstLink, ItemSrcLink } from './Snippets';
import { DependenciesList } from './DependenciesList';
import { ItemDiffBlock } from './ItemDiffBlock';
import { SettingsContext } from '../contexts/Settings';
import { CurrentItemContext } from '../contexts/CurrentItem';

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
    fullWidth={true}
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
  const { i18nInLocale } = useContext(SettingsContext);
  const { addToast } = useContext(ToastsContext);
  const { updateSavedItem } = useContext(CurrentItemContext);

  const [status, setStatus] = useState<'show' | 'loaded' | 'saving'>('show');
  const [pageTitle, setPageTitle] = useState<string | undefined>();
  const [wiki, setWiki] = useState<string | undefined>();
  const [comment, setComment] = useState<string>('');
  const [commentEdited, setCommentEdited] = useState<boolean>();
  const [info, setInfo] = useState<SyncLoader | undefined>();
  const { allItems, loadItem } = useContext(AllDataContext);

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

  const setTarget = async (newTitle: string | undefined, newWiki: string | undefined) => {
    // Make sure that if the wiki has already been chosen and title changes,
    // wiki is kept only if it doesn't have the new title
    if (pageTitle === newTitle && wiki === newWiki) {
      return;
    }
    if (newTitle && newWiki) {
      newWiki = allItems.some(v => v.srcFullTitle === newTitle && v.wiki === newWiki) ? undefined : newWiki;
    } else {
      newWiki = undefined;
    }
    if (wiki !== newWiki) {
      setWiki(newWiki);
    }
    if (pageTitle !== newTitle) {
      setPageTitle(newTitle);
    }
    if (newTitle && newWiki) {
      setStatus('show');
      const { qid, type, title, srcTitleUrl, srvPage } = allItems.find(v => v.srcFullTitle === newTitle)!;
      const newInfo = await loadItem(qid, newWiki);
      if (newInfo.newItem) {
        // Item was just created
        setWiki(undefined);
      } else {
        newInfo.newItem = createItem(type, title, srcTitleUrl, srvPage, {
          domain: newWiki, status: 'new', title: srvPage.primaryTitle,
        });
        setInfo(newInfo);
        if (newInfo && newInfo.content && newInfo.content.changeType === 'new') {
          if (!comment || !commentEdited) {
            debugger;
            setComment(fixMwLinks(await i18nInLocale(
              newInfo.newItem.lang, getSummaryMsgFromStatus('new'), getSummaryLink(newInfo.newItem))));
            setCommentEdited(false);
          }
          setStatus('loaded');
        }
      }
    } else if (info) {
      setInfo(undefined);
      setStatus('show');
    }
  };

  const loadedInfo = useMemo(() => {
    if (!info || !info.newItem) {
      return;
    }
    const result = [];
    result.push(
      <EuiFormRow fullWidth={true} label={i18n('Dependencies')}>
        <DependenciesList item={info.newItem}/>
      </EuiFormRow>
    );
    if (info.content && info.content.changeType === 'new') {
      result.push(
        <EuiFormRow fullWidth={true} label={i18n('Content')}>
          <ItemDiffBlock type={info.newItem.type}
                         oldText={info.content.newText}
                         newText={info.content.newText}/>
        </EuiFormRow>
      );
    }
    return (<>{result}</>);
  }, [i18n, info]);

  const setNewComment = (newComment: string) => {
    debugger;
    newComment = newComment.trim();
    if (newComment !== comment) {
      setComment(newComment);
      setCommentEdited(true);
    }
  };

  const onCopy = async () => {
    try {
      if (!pageTitle || !wiki || !info || !info.newItem || !info.content || info.content.changeType !== 'new') {
        return;  // safety and make typescript happy
      }

      setStatus('saving');

      const res = await editItem(info.newItem, info.content, comment);

      if (res.edit.result !== 'Success') {
        addToast(error({
          title: (<EuiText><Message id="create-page--error"
                                    placeholders={[res.edit.info || JSON.stringify(res.edit)]}/></EuiText>),
        }));
        setStatus('loaded');
        return;
      }

      addToast(success({
        title: (<EuiText><Message id="create-page--success"
                                  placeholders={[<ItemDstLink item={info.newItem}/>]}/></EuiText>),
        iconType: 'check',
      }));

      updateSavedItem(info.newItem);
      onClose();

    } catch (err) {
      addToast(error({
        // FIXME: change message ID
        title: (<EuiText><Message id="Error creating $1:  $2"
                                  placeholders={['LINK_TODO', err.toString()]}/></EuiText>),
      }));
      setStatus('loaded');
    }
  };

  // FIXME I18N
  return (<EuiOverlayMask><EuiModal onClose={onClose}>
    <EuiModalHeader>
      <EuiModalHeaderTitle>{i18n('Create a new copy')}</EuiModalHeaderTitle>
    </EuiModalHeader>
    <EuiModalBody>
      <EuiForm>
        <EuiFormRow fullWidth={true} label={i18n('A page to copy')} helpText={pageHelpText}>
          <Picker disabled={status === 'saving'} placeholder={i18n('Select a page to copy')} value={pageTitle}
                  setValue={(v) => setTarget(v, wiki)} options={uniq(allItems.map(v => v.srcFullTitle))}/>
        </EuiFormRow>
        <EuiFormRow fullWidth={true} label={i18n('Target wiki')}
                    helpText={pageTitle ? i18n('Already exists on $1 out of $2 wikis.', existsOn.size, knownWikis) : undefined}>
          <Picker disabled={status === 'saving'} placeholder={i18n('Select target wiki')} value={wiki}
                  setValue={(v) => setTarget(pageTitle, v)} options={wikiOptions}/>
        </EuiFormRow>
        <EuiSpacer size={'m'} />
        {loadedInfo}
      </EuiForm>
    </EuiModalBody>
    <EuiModalFooter>
      <Comment readOnly={false} isLoading={false} value={comment} setValue={setNewComment}/>
      <EuiButtonEmpty onClick={onClose}>{i18n('Cancel')}</EuiButtonEmpty>
      <EuiButton isDisabled={status !== 'loaded'}
                 onClick={onCopy}
                 color={'primary'}
                 isLoading={status === 'saving'}
                 fill>{i18n('Create!')}</EuiButton>
    </EuiModalFooter>
  </EuiModal>
  </EuiOverlayMask>);
};
