declare module '*.scss' {
  const content: { [className: string]: string };
  export = content;
}

declare var Prism: any;

declare module '@wikimedia/react.i18n' {
  interface MessageProps {
    id: string
    placeholders?: any[]
  }

  export class Message extends React.Component<MessageProps & any, any> {}

  export const BananaContext: React.Context<{
    i18n: (id: string, ...args: any) => string
  }>;

  export const IntlProvider: React.ContextProvider<{}>;
}

declare module 'banana-i18n';
