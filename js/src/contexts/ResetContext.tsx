import React, { DispatchWithoutAction, useState } from 'react';
import { Props } from '../services/types';

export type ResetContextType = {
  resetIndex: number,
  resetAll: DispatchWithoutAction,
}

export const ResetContext = React.createContext<ResetContextType>({} as ResetContextType);

export const ResetProvider = ({ children }: Props) => {
  const [resetIndex, setResetIndex] = useState<number>(0);

  return (
    <ResetContext.Provider
      value={{
        resetIndex,
        resetAll: () => setResetIndex(resetIndex + 1),
      }}>
      {children}
    </ResetContext.Provider>
  );
};

