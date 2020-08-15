import React from 'react';
import { EuiButtonIcon, EuiIcon, IconSize, EuiLink } from '@elastic/eui';
import { Item } from '../data/types';
import { siteIcons } from '../icons/icons';

export const ExternalLink = ({ href }: { href: string }) => {
  return (<EuiButtonIcon
    color={'text'}
    href={href}
    target={'_blank'}
    iconType="symlink"
    aria-label="Open external link in a new tab"
  />);
};

export const ItemSrcLink = ({ item: { srcTitleUrl, srcFullTitle } }: { item: Item }) => {
  return (<EuiLink href={srcTitleUrl} target={'_blank'}>{srcFullTitle}</EuiLink>);
};

export const ItemDstLink = ({ item: { dstTitleUrl, lang, project, dstFullTitle } }: { item: Item }) => {
  const site = lang !== '-' ? `${lang}.${project}` : project;
  return (<EuiLink href={dstTitleUrl} target={'_blank'}>{site}&nbsp;/&nbsp;{dstFullTitle}</EuiLink>);
};

export const ItemWikidataLink = ({ item: { qid } }: { item: Item }) => {
  return (<EuiLink href={`https://wikidata.org/wiki/${qid}`} target={'_blank'}>{qid}</EuiLink>);
};

export const ProjectIcon = ({ item: { project }, size }: {
  item: Item,
  size?: IconSize,
}) => {
  // @ts-ignore
  const siteIcon = siteIcons[project];
  return (<EuiIcon type={siteIcon} size={size ?? 'm'}/>);
};
