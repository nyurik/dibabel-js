import React, { useState } from 'react';
import { EuiGlobalToastList } from '@elastic/eui';
import { Toast } from '@elastic/eui/src/components/toast/global_toast_list';
import { Toast as ToastNoId } from '../data/languages';

let addToastHandler: (toast: ToastNoId) => void;
let toastId = 0;

// FIXME: A global addToast function seems like a bad design
export function addToast(toast: ToastNoId) {
  addToastHandler(toast);
}

export function Toasts() {
  const [toasts, setToasts] = useState<Array<Toast>>([]);

  const removeToast = (removedToast: ToastNoId) => {
    setToasts(toasts.filter(toast => toast.id !== removedToast.id));
  };

  addToastHandler = (toast) => {
    setToasts(toasts.concat({
      id: (toastId++).toString(),
      ...toast,
    }));
  };

  return (
    <EuiGlobalToastList
      toasts={toasts}
      dismissToast={removeToast}
      toastLifeTimeMs={6000}
    />
  );
}
