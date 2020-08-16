import React from 'react';
import { EuiButtonIcon, EuiLink } from '@elastic/eui';
import { Item } from '../data/types';

export const ExternalLink = ({ href, title }: { href: string, title: string }) => {
  return (<EuiButtonIcon
    color={'text'}
    href={href}
    target={'_blank'}
    iconType="symlink"
    aria-label="Open external link in a new tab"
    title={title}
  />);
};

export const ItemSrcLink = ({ item: { srcTitleUrl, srcFullTitle } }: { item: Item }) => {
  return (<EuiLink href={srcTitleUrl} target={'_blank'}>{srcFullTitle}</EuiLink>);
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
