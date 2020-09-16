import React, { Dispatch, useCallback, useReducer } from 'react';
import { EuiGlobalToastList, EuiText } from '@elastic/eui';
import { Toast as ToastWithId } from '@elastic/eui/src/components/toast/global_toast_list';
import { Props, ToastNoId } from '../services/types';
import { error } from '../services/utils';

type ToastContextType = {
  addToast: Dispatch<ToastNoId | ToastWithId>,
  internalError: Dispatch<string>,
};

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

const ToastsViewer = ({ toasts, doToast }: { toasts: ToastWithId[], doToast: Dispatch<ToastWithId> }) => {
  return <EuiGlobalToastList
    toasts={toasts}
    dismissToast={doToast}
    toastLifeTimeMs={8000}
  />;
};

export const ToastsProvider = ({ children }: Props) => {
  const [toasts, doToast] = useReducer(applyToastChange, []);

  const internalError = useCallback((msg: string) => {
    console.error(msg);
    doToast(error({
      title: 'INTERNAL ERROR',
      text: (<EuiText>{msg.toString()}</EuiText>),
    }));
    debugger;
  }, []);

  return (
    <>
      <ToastsContext.Provider value={{ addToast: doToast, internalError }}>
        {children}
      </ToastsContext.Provider>
      <ToastsViewer toasts={toasts} doToast={doToast}/>
    </>
  );
};
