import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';

/**
 * https://commons.wikimedia.org/wiki/File:Incubator-logo.svg
 * NielsF / CC BY-SA (https://creativecommons.org/licenses/by-sa/3.0)
 */
import incubatorIcon from './project_icons_small/incubator-icon-48px.png';

import mediawikiIcon from './project_icons_small/mediawiki-icon-48px.png';

/**
 * https://commons.wikimedia.org/wiki/File:Wikimedia_Community_Logo.svg
 * real name: Artur Jan Fijałkowskipl.wiki: WarXcommons: WarXmail: [1]jabber: WarX@jabber.orgirc: [2] / Public domain
 */
import { ReactComponent as metaIcon } from './site_meta.svg';

/**
 * https://commons.wikimedia.org/wiki/File:Wikibooks-logo.svg
 * User:Bastique, User:Ramac et al. / CC BY-SA (https://creativecommons.org/licenses/by-sa/3.0)
 */
import { ReactComponent as wikibooksIcon } from './site_wikibooks.svg';

/**
 * https://commons.wikimedia.org/wiki/File:Wikidata-logo.svg
 * User:Planemad / Public domain
 */
import wikidataIcon from './project_icons_small/wikidata-icon-48px.png';
import wikinewsIcon from './project_icons_small/wikinews-icon-48px.png';
import wikipediaIcon from './project_icons_small/wikipedia-icon-48px.png';
import wikisourceIcon from './project_icons_small/wikisource-icon-48px.png';
import wikispeciesIcon from './project_icons_small/wikispecies-icon-48px.png';
import wikiversityIcon from './project_icons_small/wikiversity-icon-48px.png';
import wikivoyageIcon from './project_icons_small/wikivoyage-icon-48px.png';
import wikiquoteIcon from './project_icons_small/wikiquote-icon-48px.png';
import wiktionaryIcon from './project_icons_small/wiktionary-icon-48px.png';

/**
 * https://commons.wikimedia.org/wiki/File:Commons-icon.svg
 * Notnarayan / CC BY-SA (https://creativecommons.org/licenses/by-sa/3.0)
 */
import commonsIcon from './project_icons_small/commons-icon-48px.png';

/**
 * https://commons.wikimedia.org/wiki/File:Wikimania.svg
 * User:Tlogmer / CC BY-SA (https://creativecommons.org/licenses/by-sa/3.0)
 * heavily modified
 */
import { ReactComponent as wikimaniaIcon } from './site_wikimania.svg';

import { ReactComponent as templateIcon } from './type_template.svg';
import { ReactComponent as moduleIcon } from './type_module.svg';

/**
 * https://commons.wikimedia.org/wiki/File:Create-protection-shackle-no-text.svg
 * XYZtSpace (talk · contribs) / Public domain
 */
export { ReactComponent as lockIcon } from './lock.svg';

// /**
//  * https://commons.wikimedia.org/wiki/File:Octicons-git-compare.svg
//  * GitHub [MIT (http://opensource.org/licenses/mit-license.php) or OFL (http://scripts.sil.org/cms/scripts/page.php?item_id=OFL_web)]
//  */
// export { ReactComponent as diffIcon } from './diff.svg';

/**
 * Designed by user:Iniquity
 * https://www.mediawiki.org/wiki/User:Iniquity
 * partially based on
 * https://commons.wikimedia.org/wiki/File:Wikimedia_Community_Logo.svg
 * real name: Artur Jan Fijałkowskipl.wiki: WarXcommons: WarXmail: [1]jabber: WarX@jabber.orgirc: [2] / Public domain
 */
export { ReactComponent as logoIcon } from './logo.svg';

export const icons: { [name: string]: any } = {
  // projects
  commons: commonsIcon,
  incubator: incubatorIcon,
  mediawiki: mediawikiIcon,
  meta: metaIcon,
  species: wikispeciesIcon,
  wikibooks: wikibooksIcon,
  wikidata: wikidataIcon,
  wikimania: wikimaniaIcon,
  wikinews: wikinewsIcon,
  wikipedia: wikipediaIcon,
  wikiquote: wikiquoteIcon,
  wikisource: wikisourceIcon,
  wikiversity: wikiversityIcon,
  wikivoyage: wikivoyageIcon,
  wiktionary: wiktionaryIcon,
  // Types
  module: moduleIcon,
  template: templateIcon,
};

// Cache all medium size icons as EuiIcon objects
export const iconsEuiMedium = Object.fromEntries(Object.entries(icons).map(
  ([name, icon]) => [name, (<EuiToolTip content={name[0].toUpperCase() + name.substring(1)}><EuiIcon type={icon} size={'m'} /></EuiToolTip>)]
));
