import React, { Dispatch, FunctionComponent, useContext } from 'react';
import {
  EuiButtonIcon,
  EuiButtonIconColor,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiToolTip
} from '@elastic/eui';
import { Item } from '../services/types';

import { I18nContext } from '../contexts/I18nContext';
import { prettyDomain } from '../services/utils';
import { Message } from './Message';

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
  readOnly: boolean, tooltip?: string, isLoading: boolean, value: string, setValue: Dispatch<string>
}> = ({ readOnly, tooltip, isLoading, value, setValue }) => {

  const { i18n } = useContext(I18nContext);
  const placeholder = i18n('diff-summary--placeholder');
  return (<EuiFieldText
    readOnly={readOnly}
    title={tooltip}
    placeholder={placeholder}
    isLoading={isLoading}
    isInvalid={!value.trim()}
    value={value}
    onChange={e => setValue(e.target.value)}
    aria-label={placeholder}
    fullWidth={true}
  />);
};

export const SummaryLabel: FunctionComponent<{
  msgKey?: string, lang?: string
}> = ({ msgKey = undefined, lang = undefined }) => {

  const { i18n } = useContext(I18nContext);

  let summaryLabel = <EuiFlexItem><Message id={'diff-summary--label'}/></EuiFlexItem>;

  if (msgKey && lang) {
    summaryLabel = (
      <EuiFlexGroup gutterSize={'xs'} alignItems={'center'} responsive={false}>
        {summaryLabel}
        <EuiFlexItem grow={false}>
          <ExternalLink
            href={`https://translatewiki.net/w/i.php?title=Special:Translate&showMessage=dibabel-${encodeURIComponent(msgKey)}&group=dibabel&language=${encodeURIComponent(lang)}&filter=&optional=1&action=translate`}
            icon={'globe'} color={'primary'}
            tooltip={i18n('diff-summary--tooltip')}/>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return summaryLabel;
};
