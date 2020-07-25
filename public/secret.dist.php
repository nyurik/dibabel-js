<?php

$OAUTH_CONFIG = [

	// Create a new app token at
	//     https://meta.wikimedia.beta.wmflabs.org/wiki/Special:OAuthConsumerRegistration/propose

	// Configure the oauth authentication server.
	// Not that this URL must be of the long form with 'title=Special:OAuth', and not a clean URL.
	'url' => 'https://meta.wikimedia.beta.wmflabs.org/w/index.php?title=Special:OAuth',

	// When you register, you will get a consumer key and secret. Put these here (and for real
	// applications, keep the secret secret! The key is public knowledge.).
	'consumerKey' => '',
	'consumerSecret' => '',

];
