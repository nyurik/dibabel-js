import React, { useCallback, useContext, useState } from 'react';

import { EuiConfirmModal, EuiOverlayMask, EuiText, } from '@elastic/eui';
import { ItemDstLink } from './Snippets';
import { error, getToken, postToApi, success } from '../utils';
import { ToastsContext } from '../contexts/Toasts';
import { CurrentItemContext } from '../contexts/CurrentItem';

export const Updater = ({ comment, onClose }: { comment: string, onClose: () => void }) => {
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
        title: (<EuiText><ItemDstLink item={currentItem!}/>{' '}was updated</EuiText>),
        iconType: 'check',
      }));

      updateSavedItem(currentItem!);
      setCurrentItem(undefined);
    } catch (err) {
      addToast(error({
        title: (<EuiText>Error saving{' '}<ItemDstLink item={currentItem!}/>{' - ' + err.toString()}</EuiText>),
      }));
    } finally {
      onClose();
    }
  };

  return (<EuiOverlayMask><EuiConfirmModal
    title="Updating wiki page"
    onCancel={onClose}
    onConfirm={onCopy}
    cancelButtonText="No, take me back"
    confirmButtonText="Yes, do it!"
    buttonColor="primary"
    defaultFocusedButton="confirm"
    confirmButtonDisabled={confirmationStatus !== 'show'}
  >
    <p>You&rsquo;re about to edit <ItemDstLink item={currentItem!}/></p>
    <p>Are you sure you want to do this?</p>
  </EuiConfirmModal></EuiOverlayMask>);
};
