<?php

$OAUTH_CONFIG = [

	// Create a new app token at
	//     https://meta.wikimedia.beta.wmflabs.org/wiki/Special:OAuthConsumerRegistration/propose?wpname=DiBabel&wpoauthVersion=2
	//       &wpcallbackUrl=https%3A%2F%2Fdibabel.toolforge.org%2Foauth_callback.php
	//       &wpemail=yuriastrakhan@gmail.com
	//       &wpdescription=A%20tool%20to%20help%20users%20keep%20modules%20and%20templates%20in%20sync%20across%20multiple%20wikis.%20See%20%20https%3A%2F%2Fwww.mediawiki.org%2Fwiki%2FMultilingual_Templates_and_Modules
	//
	// select:
	//   * High-volume editing
	//   * Edit existing pages
	//   * Edit protected pages
	//   * Create, edit, and move pages

	// Configure the oauth authentication server.
	// Not that this URL must be of the long form with 'title=Special:OAuth', and not a clean URL.
	'url' => 'https://meta.wikimedia.beta.wmflabs.org/w/index.php?title=Special:OAuth',

	// When you register, you will get a consumer key and secret. Put these here (and for real
	// applications, keep the secret secret! The key is public knowledge.).
	'key' => '',
	'secret' => '',

];
