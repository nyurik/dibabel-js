import React, { Dispatch, useReducer } from 'react';
import { EuiGlobalToastList } from '@elastic/eui';
import { Toast as ToastWithId } from '@elastic/eui/src/components/toast/global_toast_list';
import { Props, ToastNoId } from '../types';

type ToastContextType = Dispatch<ToastNoId | ToastWithId>;

export const ToastsContext = React.createContext<ToastContextType>({} as ToastContextType);

let toastId = 0;

/**
 * Add a new toast, or if toast has an ID, remove it
 */
const applyToastChange = (toasts: ToastWithId[], newOrExistingToast: ToastNoId | ToastWithId) => {
  if (newOrExistingToast.id === undefined) {
    // Adding a new toast
    return toasts.concat({
      id: (toastId++).toString(),
      ...newOrExistingToast,
    });
  } else {
    // Removing existing toast
    return toasts.filter(t => t.id !== newOrExistingToast.id);
  }
};

const ToastsViewer = ({ toasts, doToast }: { toasts: ToastWithId[], doToast: ToastContextType }) => {
  return <EuiGlobalToastList
    toasts={toasts}
    dismissToast={doToast}
    toastLifeTimeMs={8000}
  />;
};

export const ToastsProvider = ({ children }: Props) => {
  const [toasts, doToast] = useReducer(applyToastChange, []);

  return (
    <>
      <ToastsContext.Provider value={doToast}>
        {children}
      </ToastsContext.Provider>
      <ToastsViewer toasts={toasts} doToast={doToast}/>
    </>
  );
};
