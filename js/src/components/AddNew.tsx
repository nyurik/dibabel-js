import React, { Dispatch, DispatchWithoutAction, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { uniq } from 'lodash';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
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

import { AllDataContext } from '../contexts/AllData';
import { ToastsContext } from '../contexts/Toasts';
import { I18nContext } from '../contexts/I18nContext';
import { AddNewClone, isItem, Item } from '../services/types';
import { error, getSummaryMsgFromStatus, splitNs, success, titleCase } from '../services/utils';
import { createItem, createSitelink } from '../services/StateStore';
import { Message } from './Message';
import { Comment, ItemDstLink, ItemSrcLink, ItemWikidataLink, SummaryLabel } from './Snippets';
import { DependenciesList } from './DependenciesList';
import { diffBlock } from './ItemDiffBlock';
import { SettingsContext } from '../contexts/Settings';
import { UserContext, UserState } from '../contexts/UserContext';

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

export const AddNew = ({ onClose, initWith }: { onClose: DispatchWithoutAction, initWith?: AddNewClone }) => {
  const { i18n } = useContext(I18nContext);
  const { createSummaryMsg, siteData } = useContext(SettingsContext);
  const { addToast, internalError } = useContext(ToastsContext);
  const { user } = useContext(UserContext);
  const { allItems, loadItem, editItem, updateSavedItem } = useContext(AllDataContext);

  const [status, setStatus] = useState<'show' | 'loaded' | 'saving'>('show');
  const [pageTitle, setPageTitle] = useState<string | undefined>();
  const [wiki, setWiki] = useState<string | undefined>();
  const [dstTitle, setDstTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [commentEdited, setCommentEdited] = useState<boolean>();
  const [fakeItem, setFakeItem] = useState<Item | undefined>();

  let pageHelpText = undefined;
  let knownWikis = 0;
  let wikiOptions: string[] = [];
  let existsOn: Set<string> = new Set();

  let item: Item | null = null;

  const setTarget = useCallback(async (newTitle: string | undefined, newWiki: string | undefined) => {
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
    let newDstTitle;
    if (pageTitle !== newTitle) {
      setPageTitle(newTitle);
      newDstTitle = newTitle ? splitNs(newTitle)[1] : '';
      setDstTitle(newDstTitle);
    } else {
      newDstTitle = dstTitle;
    }
    if (newTitle && newWiki) {
      setStatus('show');
      const { type, title, srcTitleUrl, srvPage } = allItems.find(v => v.srcFullTitle === newTitle)!;
      const itm = createItem(type, title, srcTitleUrl, srvPage, {
        domain: newWiki, status: 'new', title: titleCase(type) + ':' + newDstTitle
      });

      await loadItem(itm);

      if (isItem(itm)) {
        if (itm.content?.changeType === 'new') {
          if (!comment || !commentEdited) {
            setComment(createSummaryMsg(itm));
            setCommentEdited(false);
          }
          setStatus('loaded');
        } else {
          // Item was just created
          setWiki(undefined);
        }
        setFakeItem(itm);
      }
    } else if (fakeItem) {
      setFakeItem(undefined);
      setStatus('show');
    }
  }, [allItems, comment, commentEdited, createSummaryMsg, dstTitle, fakeItem, loadItem, pageTitle, wiki]);

  const loadedInfo = useMemo(() => {
    if (!fakeItem) {
      return;
    }

    const result = [
      <EuiSpacer size={'xl'}/>,
      <EuiFormRow fullWidth={true} label={i18n('table-header-deps--label')}>
        <DependenciesList item={fakeItem}/>
      </EuiFormRow>
    ];

    if (fakeItem.content && fakeItem.content.changeType === 'new') {
      result.push(
        <EuiSpacer size={'xxl'}/>,
        <EuiFormRow fullWidth={true} label={i18n('create-page-content--label')}>
          {diffBlock(fakeItem, internalError)}
        </EuiFormRow>
      );
    }
    return React.Children.toArray(result);
  }, [fakeItem, i18n, internalError]);

  const setNewComment = (newComment: string) => {
    if (newComment !== comment) {
      setComment(newComment);
      setCommentEdited(true);
    }
  };

  const onCopy = useCallback(async () => {
    if (!pageTitle || !wiki || !fakeItem || !fakeItem.content || fakeItem.content.changeType !== 'new' || !dstTitle) {
      return;  // safety and make typescript happy
    }

    try {
      setStatus('saving');

      await editItem(fakeItem, comment);
      if (fakeItem.contentStatus!.status === 'error') {
        addToast(error({
          title: (<Message id="create-page-error--title"
                           placeholders={[<ItemDstLink item={fakeItem}/>, fakeItem.contentStatus!.error]}/>),
        }));
        setStatus('loaded');
        return;
      }

      let res = await createSitelink(siteData, fakeItem);
      if (!res.success) {
        addToast(error({
          title: (<Message id="create-page-error-wd--title"
                           placeholders={[
                             <ItemDstLink item={fakeItem}/>,
                             <ItemWikidataLink item={fakeItem}/>,
                             res.edit.info || JSON.stringify(res.edit)]}/>),
        }));
        setStatus('loaded');
        return;
      }

      addToast(success({
        title: (<Message id="create-page-success--title"
                         placeholders={[<ItemDstLink item={fakeItem}/>]}/>),
        iconType: 'check',
      }));

      updateSavedItem(fakeItem);
      onClose();

    } catch (err) {
      addToast(error({
        title: (<Message id="create-page-error--title"
                         placeholders={[<ItemDstLink item={fakeItem}/>, err.toString()]}/>),
      }));
      setStatus('loaded');
    }
  }, [addToast, comment, dstTitle, editItem, fakeItem, onClose, pageTitle, siteData, updateSavedItem, wiki]);

  useEffect(() => {
      if (initWith) {
        setTarget(initWith.titleNoNs, initWith.wiki);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initWith]);

  if (pageTitle) {
    const items = allItems.filter(v => v.srcFullTitle === pageTitle);
    existsOn = new Set(items.map(v => v.wiki));

    wikiOptions = siteData.sites.filter(v => !v.closed).map(v => v.url.substring('https://'.length));
    knownWikis = wikiOptions.length;
    wikiOptions = wikiOptions.filter(v => !existsOn.has(v));

    if (items.length > 0) {
      item = items[0];
      pageHelpText = (
        <p>
          <ItemSrcLink item={item}/><br/>
          {i18n('create-page-wiki--info', existsOn.size, knownWikis)}
        </p>);
    }
  }

  const isLoggedIn = user.state === UserState.LoggedIn;

  return (<EuiOverlayMask><EuiModal onClose={onClose}>
    <EuiModalHeader>
      <EuiModalHeaderTitle>{i18n('create-page-header--label')}</EuiModalHeaderTitle>
    </EuiModalHeader>
    <EuiModalBody>
      <EuiForm>
        <EuiFormRow fullWidth={true} label={i18n('create-page-page--label')} helpText={pageHelpText}>
          <Picker disabled={status === 'saving'} placeholder={i18n('create-page-page--placeholder')} value={pageTitle}
                  setValue={(v) => setTarget(v, wiki)} options={uniq(allItems.map(v => v.srcFullTitle))}/>
        </EuiFormRow>
        <EuiFormRow fullWidth={true} label={i18n('create-page-wiki--label')}>
          <Picker disabled={status === 'saving'}
                  placeholder={pageTitle ? i18n('create-page-wiki--placeholder') : i18n('create-page-page--placeholder')}
                  value={wiki}
                  setValue={(v) => setTarget(pageTitle, v)}
                  options={wikiOptions}/>
        </EuiFormRow>
        <EuiFormRow fullWidth={true} label={i18n('create-page-target--label')}>
          <EuiFieldText
            prepend={pageTitle ?
              (<EuiText className={'euiFieldTExt'} size={'s'}>
                {pageTitle.split(':')[0] + ':'}
              </EuiText>) : ''}
            disabled={!pageTitle}
            placeholder={pageTitle ? i18n('create-page-target--placeholder') : i18n('create-page-page--placeholder')}
            isLoading={status === 'saving'}
            isInvalid={!dstTitle.trim()}
            value={dstTitle}
            onChange={e => setDstTitle(e.target.value)}
            aria-label={i18n('create-page-target--placeholder')}
            fullWidth={true}
          />
        </EuiFormRow>
        <EuiSpacer size={'m'}/>
        {loadedInfo}
      </EuiForm>
    </EuiModalBody>
    <EuiModalFooter>
      <EuiFlexGroup gutterSize={'s'} justifyContent={'spaceBetween'} alignItems={'center'}>
        <EuiFlexItem grow={false}>
          <SummaryLabel msgKey={fakeItem && getSummaryMsgFromStatus('new')}
                        lang={fakeItem && fakeItem.lang}/>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <Comment
            readOnly={!isLoggedIn || status !== 'loaded' || !dstTitle}
            tooltip={isLoggedIn ? undefined : i18n('diff-content--login-error')}
            isLoading={false}
            value={comment}
            setValue={setNewComment}/>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiButtonEmpty onClick={onClose}>{i18n('create-page-cancel--label')}</EuiButtonEmpty>
      <EuiButton isDisabled={!isLoggedIn || status !== 'loaded' || !comment.trim() || !dstTitle}
                 onClick={isLoggedIn ? onCopy : undefined}
                 title={isLoggedIn ? undefined : i18n('diff-content--login-error')}
                 color={'primary'}
                 isLoading={status === 'saving'}
                 fill>{i18n('create-page-create--label')}</EuiButton>
    </EuiModalFooter>
  </EuiModal>
  </EuiOverlayMask>);
};
