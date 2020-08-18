declare module '*.scss' {
  const content: { [className: string]: string };
  export = content;
}

declare var Prism: any;

declare module '@wikimedia/react.i18n'; // {  export = { BananaContext, IntlProvider };}
