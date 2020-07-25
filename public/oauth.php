<?php

// Require the library and set up the classes we're going to use in this second part of the demo.
require_once __DIR__ . '/../vendor/autoload.php';

use MediaWiki\OAuthClient\Client;
use MediaWiki\OAuthClient\ClientConfig;
use MediaWiki\OAuthClient\Consumer;
use MediaWiki\OAuthClient\Token;

/**
 * Configure the OAuth client with the URL and consumer details from the /.secret.php file.
 *
 * @return Client
 */
function createClient() {
	/** @noinspection PhpIncludeInspection */
	require_once __DIR__ . '/../.secret.php';

	/** @noinspection PhpUndefinedVariableInspection */
	$conf = new ClientConfig( $OAUTH_CONFIG['url'] );

	$conf->setConsumer( new Consumer( $OAUTH_CONFIG['consumer_key'],
		$OAUTH_CONFIG['consumer_secret'] ) );

	return new Client( $conf );
}

/**
 * Save oauth token into the session
 *
 * @param string $type request or access
 * @param Token $token
 */
function saveToken( $type, $token ) {
	session_start();
	$_SESSION["${type}_key"] = $token->key;
	$_SESSION["${type}_secret"] = $token->secret;
}

/**
 * Load oauth token from the session
 *
 * @param string $type request or access
 *
 * @return Token
 */
function getToken( $type ) {
	session_start();
	return new Token( $_SESSION["${type}_key"],
		$_SESSION["${type}_secret"] );
}

/**
 * Delete oauth token from the sesion
 *
 * @param string $type request or access
 */
function deleteToken( $type ) {
	unset( $_SESSION["${type}_key"], $_SESSION["${type}_secret"] );
}

function redirect( $href ) {
	header( 'Location: ' . $href );
	http_response_code( 303 );
}
