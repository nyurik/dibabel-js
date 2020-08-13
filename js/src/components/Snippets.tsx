import React, { ReactNode } from 'react';
import { EuiIcon, EuiLink, IconSize } from '@elastic/eui';
import { Item } from '../data/types';
import { siteIcons } from '../icons/icons';

export const ItemSrcLink = ({ item: { srcTitleUrl, srcFullTitle } }: { item: Item }) => {
  return (<EuiLink href={srcTitleUrl} target={'_blank'}>{srcFullTitle}</EuiLink>);
};

export const ItemDstLink = ({ item: { dstTitleUrl, dstFullTitle } }: { item: Item }) => {
  return (<EuiLink href={dstTitleUrl} target={'_blank'}>{dstFullTitle}</EuiLink>);
};

export const ItemWikidataLink = ({ item: { qid } }: { item: Item }) => {
  return (<EuiLink href={`https://wikidata.org/wiki/${qid}`} target={'_blank'}>{qid}</EuiLink>);
};

export const ItemDiffLink = ({ item: { dstTitle, srcRevId, matchedRevId }, children }: { item: Item, children: ReactNode }) => {
  const href = `https://www.mediawiki.org/w/index.php?title=${encodeURIComponent(dstTitle)}&type=revision&diff=${srcRevId}&oldid=${matchedRevId}`;
  return (<EuiLink href={href} target={'_blank'}>{children}</EuiLink>);
};

export const ProjectIcon = ({ item: { project }, size }: {
  item: Item,
  size?: IconSize,
}) => {
  // @ts-ignore
  const siteIcon = siteIcons[project];
  return (<EuiIcon type={siteIcon} size={size ?? 'm'}/>);
};
