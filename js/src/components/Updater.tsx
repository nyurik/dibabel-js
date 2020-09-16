import React, { useContext, useState } from 'react';

import { EuiConfirmModal, EuiOverlayMask, } from '@elastic/eui';
import { ItemDstLink } from './Snippets';
import { error, success } from '../services/utils';
import { ToastsContext } from '../contexts/Toasts';

import { I18nContext } from '../contexts/I18nContext';
import { Message } from './Message';
import { Item } from '../services/types';
import { AllDataContext } from '../contexts/AllData';

export const Updater = ({ comment, onClose }: { comment: string, onClose: () => void }): null | React.ReactElement => {
  const { i18n } = useContext(I18nContext);
  const { addToast, internalError } = useContext(ToastsContext);
  const { editItem, updateSavedItem, currentItem, setCurrentItem } = useContext(AllDataContext);

  const [confirmationStatus, setConfirmationStatus] = useState<'show' | 'saving'>('show');

  const item = currentItem as Item;
  const itemContent = item ? item.content : undefined;

  if (!currentItem || !itemContent || itemContent.changeType === 'ok') {
    internalError('Missing or OK item');
    return null;
  }

  const onCopy = async () => {
    try {
      setConfirmationStatus('saving');

      await editItem(currentItem, comment);
      if (currentItem.contentStatus!.status === 'error') {
        return;
      }

      addToast(success({
        title: (<Message id="updatepage-status" placeholders={[<ItemDstLink item={currentItem}/>]}/>),
        iconType: 'check',
      }));

      updateSavedItem(currentItem);
      setCurrentItem(undefined);
    } catch (err) {
      addToast(error({
        title: (<Message id="updatepage-status-error"
                         placeholders={[<ItemDstLink item={currentItem}/>, err.toString()]}/>),
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
    <p>
      <Message id="updatepage-confirm--description-part1" placeholders={[<ItemDstLink item={currentItem}/>]}/>
    </p>
    <p>{i18n('updatepage-confirm--description-part2')}</p>
  </EuiConfirmModal></EuiOverlayMask>);
};
