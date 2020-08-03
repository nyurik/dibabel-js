import React from 'react';
import { EuiLink } from '@elastic/eui';
import { Item } from '../data/types';

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
