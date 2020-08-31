import React, { Dispatch, DispatchWithoutAction, useContext, useMemo, useState, useCallback, useEffect } from 'react';
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
  EuiFieldText,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { AllDataContext, SyncLoader } from '../contexts/AllData';
import { ToastsContext } from '../contexts/Toasts';
import { I18nContext } from '../contexts/I18nContext';
import { AddNewClone, Item } from '../services/types';
import {
  error,
  fixMwLinks,
  getSummaryLink,
  getSummaryMsgFromStatus,
  splitNs,
  success,
  titleCase
} from '../services/utils';
import { createItem, createSitelink, editItem } from '../services/StateStore';
import { Message } from './Message';
import { Comment, ItemDstLink, ItemSrcLink, ItemWikidataLink, SummaryLabel } from './Snippets';
import { DependenciesList } from './DependenciesList';
import { ItemDiffBlock } from './ItemDiffBlock';
import { SettingsContext } from '../contexts/Settings';
import { CurrentItemContext } from '../contexts/CurrentItem';
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
  const { getSummaryMsg, siteData } = useContext(SettingsContext);
  const { addToast } = useContext(ToastsContext);
  const { updateSavedItem } = useContext(CurrentItemContext);
  const { user } = useContext(UserContext);

  const [status, setStatus] = useState<'show' | 'loaded' | 'saving'>('show');
  const [pageTitle, setPageTitle] = useState<string | undefined>();
  const [wiki, setWiki] = useState<string | undefined>();
  const [dstTitle, setDstTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [commentEdited, setCommentEdited] = useState<boolean>();
  const [info, setInfo] = useState<SyncLoader | undefined>();
  const { allItems, loadItem } = useContext(AllDataContext);

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
    if (pageTitle !== newTitle) {
      setPageTitle(newTitle);
      setDstTitle(newTitle ? splitNs(newTitle)[1] : '');
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
          domain: newWiki, status: 'new', title: titleCase(type) + ':' + dstTitle,
        });
        setInfo(newInfo);
        if (newInfo && newInfo.content && newInfo.content.changeType === 'new') {
          if (!comment || !commentEdited) {
            setComment(fixMwLinks(getSummaryMsg(newInfo.newItem.lang, getSummaryMsgFromStatus('new'), getSummaryLink(newInfo.newItem))));
            setCommentEdited(false);
          }
          setStatus('loaded');
        }
      }
    } else if (info) {
      setInfo(undefined);
      setStatus('show');
    }
  }, [allItems, comment, commentEdited, dstTitle, getSummaryMsg, info, loadItem, pageTitle, wiki]);

  const loadedInfo = useMemo(() => {
    if (!info || !info.newItem) {
      return;
    }

    const result = [
      <EuiSpacer size={'xl'}/>,
      <EuiFormRow fullWidth={true} label={i18n('table-header-deps--label')}>
        <DependenciesList item={info.newItem}/>
      </EuiFormRow>
    ];

    if (info.content && info.content.changeType === 'new') {
      result.push(
        <EuiSpacer size={'xxl'}/>,
        <EuiFormRow fullWidth={true} label={i18n('create-page-content--label')}>
          <ItemDiffBlock type={info.newItem.type}
                         oldText={info.content.newText}
                         newText={info.content.newText}/>
        </EuiFormRow>
      );
    }
    return (<>{result}</>);
  }, [i18n, info]);

  const setNewComment = (newComment: string) => {
    newComment = newComment.trim();
    if (newComment !== comment) {
      setComment(newComment);
      setCommentEdited(true);
    }
  };

  const onCopy = useCallback(async () => {
    if (!pageTitle || !wiki || !info || !info.newItem || !info.content || info.content.changeType !== 'new' || !dstTitle) {
      return;  // safety and make typescript happy
    }

    try {
      setStatus('saving');

      let res = await editItem(info.newItem, info.content, comment);
      if (res.edit.result !== 'Success') {
        addToast(error({
          title: (<Message id="create-page-error--title"
                           placeholders={[
                             <ItemDstLink item={info.newItem}/>,
                             res.edit.info || JSON.stringify(res.edit)]}/>),
        }));
        setStatus('loaded');
        return;
      }

      res = await createSitelink(siteData, info.newItem);
      if (res.edit.result !== 'Success') {
        addToast(error({
          title: (<Message id="create-page-error-wd--title"
                           placeholders={[
                             <ItemDstLink item={info.newItem}/>,
                             <ItemWikidataLink item={info.newItem}/>,
                             res.edit.info || JSON.stringify(res.edit)]}/>),
        }));
        setStatus('loaded');
        return;
      }

      addToast(success({
        title: (<Message id="create-page-success--title"
                         placeholders={[<ItemDstLink item={info.newItem}/>]}/>),
        iconType: 'check',
      }));

      updateSavedItem(info.newItem);
      onClose();

    } catch (err) {
      addToast(error({
        title: (<Message id="create-page-error--title"
                         placeholders={[<ItemDstLink item={info.newItem}/>, err.toString()]}/>),
      }));
      setStatus('loaded');
    }
  }, [addToast, comment, dstTitle, info, onClose, pageTitle, siteData, updateSavedItem, wiki]);

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
          <SummaryLabel msgKey={info && getSummaryMsgFromStatus('new')}
                        lang={info && info.newItem!.lang}/>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <Comment
            readOnly={!isLoggedIn || status !== 'loaded' || !dstTitle}
            tooltip={isLoggedIn ? undefined : i18n('diff-content--login-error') }
            isLoading={false}
            value={comment}
            setValue={setNewComment}/>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiButtonEmpty onClick={onClose}>{i18n('create-page-cancel--label')}</EuiButtonEmpty>
      <EuiButton isDisabled={!isLoggedIn || status !== 'loaded' || !comment || !dstTitle}
                 onClick={isLoggedIn ? onCopy : undefined}
                 title={isLoggedIn ? undefined : i18n('diff-content--login-error')}
                 color={'primary'}
                 isLoading={status === 'saving'}
                 fill>{i18n('create-page-create--label')}</EuiButton>
    </EuiModalFooter>
  </EuiModal>
  </EuiOverlayMask>);
};
