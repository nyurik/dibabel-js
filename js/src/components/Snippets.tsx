import React from 'react';
import { EuiButtonIcon, EuiIcon, IconSize } from '@elastic/eui';
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
  return <><ExternalLink href={srcTitleUrl}/>{srcFullTitle}</>;
};

export const ItemDstLink = ({ item: { dstTitleUrl, dstFullTitle } }: { item: Item }) => {
  return <><ExternalLink href={dstTitleUrl}/>{dstFullTitle}</>;
};

export const ItemWikidataLink = ({ item: { qid } }: { item: Item }) => {
  return <><ExternalLink href={`https://wikidata.org/wiki/${qid}`}/>{qid}</>;
};

export const ProjectIcon = ({ item: { project }, size }: {
  item: Item,
  size?: IconSize,
}) => {
  // @ts-ignore
  const siteIcon = siteIcons[project];
  return (<EuiIcon type={siteIcon} size={size ?? 'm'}/>);
};
