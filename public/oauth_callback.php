<?php

require_once __DIR__ . '/oauth.php';

/**
 * @throws Exception
 */
function main() {
	session_start();

	if ( !isset( $_GET['oauth_verifier'] ) ) {
		throw new Exception( 'This page should only be access after redirection back from the wiki.' );
	}

	$client = createClient();

	$requestToken = getToken( 'request' );

	// Send an HTTP request to the wiki to retrieve an access token, and save it.
	saveToken( 'access',
		$client->complete( $requestToken,
			$_GET['oauth_verifier'] ) );

	// We no longer need the request token.
	deleteToken( 'request' );

	redirect( '/' );
}

try {
	main();
} catch ( Exception $e ) {
	http_response_code( 400 );
	echo $e->getMessage();
}
