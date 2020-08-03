import React from 'react';
import { EuiIcon, EuiLink, IconSize } from '@elastic/eui';
import { Item } from '../data/types';
import { siteIcons } from '../icons/icons';

export const ItemSrcLink = ({ item: { srcTitleUrl, srcFullTitle } }: {
  item: Item,
}) => {
  return (<EuiLink href={srcTitleUrl} target="_blank">{srcFullTitle}</EuiLink>);
};

export const ItemDstLink = ({ item: { dstTitleUrl, dstFullTitle } }: {
  item: Item,
}) => {
  return (<EuiLink href={dstTitleUrl} target="_blank">{dstFullTitle}</EuiLink>);
};

export const ProjectIcon = ({ item: { project }, size }: {
  item: Item,
  size?: IconSize,
}) => {
  // @ts-ignore
  const siteIcon = siteIcons[project];
  return (<EuiIcon type={siteIcon} size={size ?? 'm'}/>);
};
