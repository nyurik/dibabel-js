<?php

require_once __DIR__ . '/oauth.php';

/**
 * @throws Exception
 */
function main() {
	session_start();

	if ( isset( $_GET['oauth_logout'] ) ) {
		session_destroy();
		redirect( '/' );
		return;
	}

	$client = createClient();

	if ( isset( $_GET['oauth_login'] ) ) {
		// Send an HTTP request to the wiki to get the authorization URL and a Request Token.
		list( $authUrl, $token ) = $client->initiate();
		saveToken( 'request',
			$token );
		redirect( $authUrl );
	} elseif ( isset( $_GET['oauth_identity'] ) ) {
		// Get user identify and return it to the client
		$json = json_encode( $client->identify( getToken( 'access' ) ) );
		header( 'Content-Type: application/json' );
		echo $json;
	} elseif ( isset( $_GET['oauth_call'] ) ) {
		$is_post = $_SERVER['REQUEST_METHOD'] === 'POST';
		$token = getToken( 'access' );
		$params = [];
		parse_str( $_SERVER['QUERY_STRING'],
			$params );

		$server = $params['oauth_call'];
		unset( $params['oauth_call'] );

		if ( !preg_match( '/^([-_a-z0-9]+\\.)?(wikipedia|wikimedia|wikibooks|wikiversity|wikinews|wiktionary|wikisource|wikiquote|wikivoyage|wikidata|mediawiki)\\.(beta\\.wmflabs\\.)?org$/',
			$server ) ) {
			throw new Exception( 'Unsupported server name (the "call" param)' );
		}

		$response = $client->makeOAuthCall( $token,
			"https://$server/w/api.php?" . http_build_query( $params ),
			$is_post,
			$is_post ? $_POST : null );

		header( 'Content-Type: application/json' );
		echo $response;
	} else {
		throw new Exception( 'Invalid usage' );
	}
}

try {
	main();
} catch ( Exception $e ) {
	http_response_code( 400 );
	echo $e->getMessage();
}
