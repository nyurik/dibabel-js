import React, { useContext } from 'react';
import { EuiButtonIcon, EuiButtonIconColor, EuiCallOut, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { Item } from '../types';

import { I18nContext } from '../contexts/I18nContext';
import { prettyDomain } from '../utils';
import { Message } from './Message';

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

function formatLinks(site: string, links: Array<string>) {
  return (<ul>
    {links.map(el => (
      <li key={el}><EuiLink href={`https://${site}/wiki/${el}`} target={'_blank'}>{el}</EuiLink></li>))}
  </ul>);
}

export const NotMultisiteDepsWarning = ({ item }: { item: Item }) => {
  const { i18n } = useContext(I18nContext);
  return (
    <EuiCallOut title={i18n('dibabel-diff-header-warnings--multisite-head')} color={'warning'}
                iconType={'alert'}>
      <EuiText><Message id="dibabel-diff-header-warnings--multisite"
                        placeholders={[<ItemSrcLink item={item} linkToWD={false}/>,
                          <ItemWikidataLink item={item}/>]}/></EuiText>
      <EuiSpacer size={'s'}/>
      <EuiText>{formatLinks(item.wiki, item.notMultisiteDeps!)}</EuiText>
    </EuiCallOut>
  );
};

export const MultisiteDepsNotOnDstWarning = ({ item }: { item: Item }) => {
  const { i18n } = useContext(I18nContext);
  return (
    <EuiCallOut title={i18n('dibabel-diff-header-warnings--dependencies-head', item.wiki)}
                color={'warning'}
                iconType={'alert'}>
      <EuiText><Message id="dibabel-diff-header-warnings--dependencies"
                        placeholders={[<EuiLink href={`https://${item.wiki}`}
                                                target={'_blank'}>{item.wiki}</EuiLink>]}/></EuiText>
      <EuiSpacer size={'s'}/>
      <EuiText>{formatLinks(item.srcSite, item.multisiteDepsNotOnDst!)}</EuiText>
    </EuiCallOut>
  );
}
