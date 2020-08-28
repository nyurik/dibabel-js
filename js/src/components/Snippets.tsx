import React, { useContext, FunctionComponent, Dispatch } from 'react';
import { EuiButtonIcon, EuiButtonIconColor, EuiLink, EuiToolTip, EuiFieldText } from '@elastic/eui';
import { Item } from '../services/types';

import { I18nContext } from '../contexts/I18nContext';
import { prettyDomain } from '../services/utils';

export const ExternalLink = (
  { href, title, tooltip, icon = 'symlink', color = 'text' }: {
    href: string,
    title?: string,
    tooltip: string,
    icon?: string,
    color?: EuiButtonIconColor,
  }
) => {
  const { i18n } = useContext(I18nContext);

  return (<EuiToolTip title={title} content={tooltip}><EuiButtonIcon
    color={color}
    href={href}
    target={'_blank'}
    iconType={icon}
    aria-label={i18n('table-externallink--aria')}
  /></EuiToolTip>);
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

export const Comment: FunctionComponent<{
  readOnly: boolean, isLoading: boolean, value: string, setValue: Dispatch<string>
}> = ({ readOnly, isLoading, value, setValue }) => {

  const { i18n } = useContext(I18nContext);
  const placeholder = i18n('diff-summary--placeholder');
  return (<EuiFieldText
    readOnly={readOnly}
    placeholder={placeholder}
    isLoading={isLoading}
    isInvalid={!value.trim()}
    value={value}
    onChange={e => setValue(e.target.value)}
    aria-label={placeholder}
    fullWidth={true}
  />);
};
