import React, { Dispatch, useMemo, useState } from 'react';
import { EuiGlobalToastList } from '@elastic/eui';
import { Toast as ToastWithId } from '@elastic/eui/src/components/toast/global_toast_list';
import { Props, Toast } from '../data/types';

export type ToastContextType = Dispatch<Toast>;

export const ToastsContext = React.createContext<ToastContextType>({} as ToastContextType);

let toastId = 0;

export function ToastsProvider({ children }: Props) {
  const [toasts, setToasts] = useState<Array<ToastWithId>>(() => []);

  const removeToast = (removedToast: ToastWithId) => {
    setToasts(toasts.filter(toast => toast.id !== removedToast.id));
  };

  const addToast = (toast: Toast) => {
    setToasts(toasts => toasts.concat({
      id: (toastId++).toString(),
      ...toast,
    }));
  };

  // FIXME: need to stop repainting the entire screen on every added toast
  const content = useMemo(() => (<ToastsContext.Provider value={addToast}>
    {children}
  </ToastsContext.Provider>), [children]);

  return (
    <>
      {content}
      <EuiGlobalToastList
        toasts={toasts}
        dismissToast={removeToast}
        toastLifeTimeMs={6000}
      />
    </>
  );
}
