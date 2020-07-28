import React, { useState } from 'react';
import { EuiGlobalToastList } from '@elastic/eui/es/components/toast';

let addToastHandler;
let toastId = 0;

export function addToast(toast) {
  addToastHandler(toast);
}

export function Toasts() {
  const [toasts, setToasts] = useState([]);

  const removeToast = removedToast => {
    setToasts(toasts.filter(toast => toast.id !== removedToast.id));
  };

  addToastHandler = (toast) => {
    setToasts(toasts.concat({
      id: toastId++,
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
