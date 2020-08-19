import React, { useContext } from 'react';
import { EuiButtonIcon, EuiButtonIconColor, EuiLink } from '@elastic/eui';
import { Item } from '../types';

import { I18nContext } from '../contexts/I18nContext';

export const ExternalLink = (
  { href, title, icon = 'symlink', color = 'text' }: { href: string, title: string, icon?: string, color?: EuiButtonIconColor }
) => {
  const { i18n } = useContext(I18nContext);

  return (<EuiButtonIcon
    color={color}
    href={href}
    target={'_blank'}
    iconType={icon}
    aria-label={i18n('dibabel-table-externallink--aria')}
    title={title}
  />);
};

export const ItemSrcLink = ({ item, linkToWD = true }: { item: Item, linkToWD?: boolean }) => {
  return (<><EuiLink href={item.srcTitleUrl}
                     target={'_blank'}>{item.srcFullTitle}</EuiLink>{
    linkToWD ? (<>{' '}[<ItemWikidataLink item={item}/>]</>) : null
  }</>);
};

export const ItemDstLink = ({ item: { dstTitleUrl, lang, project, dstFullTitle } }: { item: Item }) => {
  return (
    <EuiLink href={dstTitleUrl} target={'_blank'}>{prettyDomain(lang, project)}&nbsp;/&nbsp;{dstFullTitle}</EuiLink>);
};

export const ItemWikidataLink = ({ item: { qid } }: { item: Item }) => {
  return (<EuiLink href={`https://wikidata.org/wiki/${qid}`} target={'_blank'}>{qid}</EuiLink>);
};

export const prettyDomain = (lang: string, project: string) => {
  return lang !== '-' ? `${lang}.${project}` : project;
};
