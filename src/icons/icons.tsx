/**
 * https://commons.wikimedia.org/wiki/File:Incubator-logo.svg
 * NielsF / CC BY-SA (https://creativecommons.org/licenses/by-sa/3.0)
 */
import { ReactComponent as incubatorIcon } from './site_incubator.svg';


import { ReactComponent as mediawikiIcon } from './site_mediawiki.svg';
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
import wikipediaIconUrl from './site_wikipedia.svg'; // SVG uses namespaces that do not parse well in React
import { ReactComponent as wikiquoteIcon } from './site_wikiquote.svg';
import { ReactComponent as wikisourceIcon } from './site_wikisource.svg';
import { ReactComponent as wikispeciesIcon } from './site_wikispecies.svg';
import { ReactComponent as wikiversityIcon } from './site_wikiversity.svg';
import { ReactComponent as wikivoyageIcon } from './site_wikivoyage.svg';
import { ReactComponent as wiktionaryIcon } from './site_wiktionary.svg';

/**
 * https://commons.wikimedia.org/wiki/File:Commons-icon.svg
 * Notnarayan / CC BY-SA (https://creativecommons.org/licenses/by-sa/3.0)
 */
import { ReactComponent as commonsIcon } from './site_commons.svg';

/**
 * https://commons.wikimedia.org/wiki/File:Wikimania.svg
 * User:Tlogmer / CC BY-SA (https://creativecommons.org/licenses/by-sa/3.0)
 */
import wikimaniaIconUrl from './site_wikimania.svg';


import templateIconUrl from './type_template.svg';
import moduleIconUrl from './type_module.svg';

export const siteIcons = {
  commons: commonsIcon,
  incubator: incubatorIcon,
  mediawiki: mediawikiIcon,
  meta: metaIcon,
  species: wikispeciesIcon,
  wikibooks: wikibooksIcon,
  wikidata: wikidataIcon,
  wikimania: wikimaniaIconUrl,
  wikinews: wikinewsIcon,
  wikipedia: wikipediaIconUrl,
  wikiquote: wikiquoteIcon,
  wikisource: wikisourceIcon,
  wikiversity: wikiversityIcon,
  wikivoyage: wikivoyageIcon,
  wiktionary: wiktionaryIcon,
};

export const typeIcons = {
  module: moduleIconUrl,
  template: templateIconUrl,
};
