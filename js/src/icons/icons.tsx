/**
 * https://commons.wikimedia.org/wiki/File:Incubator-logo.svg
 * NielsF / CC BY-SA (https://creativecommons.org/licenses/by-sa/3.0)
 */
import { ReactComponent as incubatorIcon } from './site_incubator.svg';

import { ReactComponent as mediawikiIcon } from './site_mediawiki.svg';

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
import { ReactComponent as wikidataIcon } from './site_wikidata.svg';
import { ReactComponent as wikinewsIcon } from './site_wikinews.svg';
import { ReactComponent as wikipediaIcon } from './site_wikipedia.svg';
import { ReactComponent as wikisourceIcon } from './site_wikisource.svg';
import { ReactComponent as wikispeciesIcon } from './site_wikispecies.svg';
import { ReactComponent as wikiversityIcon } from './site_wikiversity.svg';
import { ReactComponent as wikivoyageIcon } from './site_wikivoyage.svg';

/**
 * Does not show correctly in React
 */
import wikiquoteIconUrl from './site_wikiquote.svg';

/**
 * Does not show correctly in React
 */
import wiktionaryIconUrl from './site_wiktionary.svg';

/**
 * https://commons.wikimedia.org/wiki/File:Commons-icon.svg
 * Notnarayan / CC BY-SA (https://creativecommons.org/licenses/by-sa/3.0)
 */
import { ReactComponent as commonsIcon } from './site_commons.svg';

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

export const siteIcons = {
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
  wikiquote: wikiquoteIconUrl,
  wikisource: wikisourceIcon,
  wikiversity: wikiversityIcon,
  wikivoyage: wikivoyageIcon,
  wiktionary: wiktionaryIconUrl,
};

export const typeIcons = {
  module: moduleIcon,
  template: templateIcon,
};
