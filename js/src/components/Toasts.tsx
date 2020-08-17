import React, { Dispatch, ReactChild, useReducer } from 'react';
import { EuiGlobalToastList } from '@elastic/eui';
import { Toast as ToastWithId } from '@elastic/eui/src/components/toast/global_toast_list';
import { Props } from '../data/types';
import { EuiToastProps } from '@elastic/eui/src/components/toast/toast';

/**
 * This overrides EUI's own toast interface to remove the ID requirement (auto-added later)
 * FIXME: Can this be done with importing Toast from @elastic/eui/src/components/toast/global_toast_list and using Exclude<> ?
 */
export interface ToastNoId extends EuiToastProps {
  // id: string;
  text?: ReactChild;
  toastLifeTimeMs?: number;
}

type ToastContextType = Dispatch<ToastNoId | ToastWithId>;

export const ToastsContext = React.createContext<ToastContextType>({} as ToastContextType);

let toastId = 0;

const reducer = (toasts: ToastWithId[], newOrExistingToast: ToastNoId | ToastWithId) => {
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
  const [toasts, doToast] = useReducer(reducer, []);

  return (
    <>
      <ToastsContext.Provider value={doToast}>
        {children}
      </ToastsContext.Provider>
      <ToastsViewer toasts={toasts} doToast={doToast}/>
    </>
  );
};
