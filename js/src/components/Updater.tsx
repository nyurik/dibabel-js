import React, { useContext, useState } from 'react';

import { EuiConfirmModal, EuiOverlayMask, EuiText, } from '@elastic/eui';
import { ItemDstLink } from './Snippets';
import { error, getToken, postToApi, success } from '../utils';
import { ToastsContext } from '../contexts/Toasts';
import { CurrentItemContext } from '../contexts/CurrentItem';

import { I18nContext } from '../contexts/I18nContext';
import { Message } from './Message';

export const Updater = ({ comment, onClose }: { comment: string, onClose: () => void }) => {
  const { i18n } = useContext(I18nContext);

  const addToast = useContext(ToastsContext);
  const { setItemStatus, currentItem, syncData, setCurrentItem, updateSavedItem } = useContext(CurrentItemContext);
  const [confirmationStatus, setConfirmationStatus] = useState<'show' | 'saving'>('show');

  const onCopy = async () => {
    try {
      setConfirmationStatus('saving');

      const res = await postToApi(currentItem!.wiki, {
        action: 'edit',
        title: currentItem!.dstFullTitle,
        text: syncData!.newText,
        summary: comment,
        basetimestamp: syncData!.syncInfo.timestamp,
        nocreate: '1',
        token: await getToken(currentItem!.wiki),
      });

      if (res.edit.result !== 'Success') {
        setItemStatus({ status: 'error', error: res.edit.info || JSON.stringify(res.edit) });
        return;
      }

      addToast(success({
        title: (<EuiText><Message id="updatepage-status"
                                  placeholders={[<ItemDstLink item={currentItem!}/>]}/></EuiText>),
        iconType: 'check',
      }));

      updateSavedItem(currentItem!);
      setCurrentItem(undefined);
    } catch (err) {
      addToast(error({
        title: (<EuiText><Message id="updatepage-status-error"
                                  placeholders={[<ItemDstLink item={currentItem!}/>, err.toString()]}/></EuiText>),
      }));
    } finally {
      onClose();
    }
  };

  return (<EuiOverlayMask><EuiConfirmModal
    title={i18n('updatepage-confirm--tooltip')}
    onCancel={onClose}
    onConfirm={onCopy}
    cancelButtonText={i18n('updatepage-confirm--no')}
    confirmButtonText={i18n('updatepage-confirm--yes')}
    buttonColor="primary"
    defaultFocusedButton="confirm"
    confirmButtonDisabled={confirmationStatus !== 'show'}
  >
    <p><Message id="updatepage-confirm--description-part1" placeholders={[<ItemDstLink item={currentItem!}/>]}/>
    </p>
    <p>{i18n('updatepage-confirm--description-part2')}</p>
  </EuiConfirmModal></EuiOverlayMask>);
};
