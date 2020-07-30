import { ReactComponent as incubatorIcon } from '../icons/site_incubator.svg';
import { ReactComponent as mediawikiIcon } from '../icons/site_mediawiki.svg';
import { ReactComponent as metaIcon } from '../icons/site_meta.svg';
import { ReactComponent as wikibooksIcon } from '../icons/site_wikibooks.svg';
import { ReactComponent as wikidataIcon } from '../icons/site_wikidata.svg';
import { ReactComponent as wikinewsIcon } from '../icons/site_wikinews.svg';
import wikipediaIconUrl from '../icons/site_wikipedia.svg'; // SVG uses namespaces that do not parse well in React
import { ReactComponent as wikiquoteIcon } from '../icons/site_wikiquote.svg';
import { ReactComponent as wikisourceIcon } from '../icons/site_wikisource.svg';
import { ReactComponent as wikispeciesIcon } from '../icons/site_wikispecies.svg';
import { ReactComponent as wikiversityIcon } from '../icons/site_wikiversity.svg';
import { ReactComponent as wikivoyageIcon } from '../icons/site_wikivoyage.svg';
import { ReactComponent as wiktionaryIcon } from '../icons/site_wiktionary.svg';

import templateIconUrl from '../icons/type_template.svg';
import moduleIconUrl from '../icons/type_module.svg';

export const siteIcons = {
  incubator: incubatorIcon,
  mediawiki: mediawikiIcon,
  meta: metaIcon,
  wikibooks: wikibooksIcon,
  wikidata: wikidataIcon,
  wikinews: wikinewsIcon,
  wikipedia: wikipediaIconUrl,
  wikiquote: wikiquoteIcon,
  wikisource: wikisourceIcon,
  wikispecies: wikispeciesIcon,
  wikiversity: wikiversityIcon,
  wikivoyage: wikivoyageIcon,
  wiktionary: wiktionaryIcon,
};

export const typeIcons = {
  module: moduleIconUrl,
  template: templateIconUrl,
};
