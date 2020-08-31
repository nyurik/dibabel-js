from pathlib import Path

import atexit
import mwoauth
import yaml
from apscheduler.schedulers.background import BackgroundScheduler
from dibabel.QueryCache import QueryCache
from flask import Flask, jsonify, session, flash, abort, Response
from flask import redirect, request
from pywikiapi import ApiError
from requests_oauthlib import OAuth1

app = Flask(__name__)

for file in ('default.yaml', 'secret.yaml'):
    path = Path(__file__).parent / '..' / file
    print(f"Reading config from {path}")
    with path.open('r', encoding='utf-8') as stream:
        app.config.update(yaml.safe_load(stream))

print(f"Running as {app.config['CONSUMER_KEY']}")
cache = QueryCache('../cache')


def refresher():
    print(f"Refreshing state...")
    cache.refresh_state()


# Make sure we have the latest data by occasionally refreshing it
scheduler = BackgroundScheduler()
scheduler.add_job(func=refresher, trigger="interval", seconds=300)
scheduler.start()
atexit.register(lambda: scheduler.shutdown())


def create_consumer_token():
    return mwoauth.ConsumerToken(app.config["CONSUMER_KEY"], app.config["CONSUMER_SECRET"])


@app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


@app.route("/data")
def get_data():
    with cache.create_session(user_requested=True) as state:
        return jsonify(cache.get_data(state))


@app.route("/page/<qid>/<domain>")
def get_page(qid: str, domain: str):
    with cache.create_session(user_requested=True) as state:
        return jsonify(cache.get_page(state, qid, domain))


@app.route('/login')
def login():
    try:
        redirect_url, request_token = mwoauth.initiate(app.config["OAUTH_MWURI"], create_consumer_token())
    except:
        app.logger.exception('mwoauth.initiate failed')
        return redirect('/')
    else:
        session['request_token'] = dict(zip(request_token._fields, request_token))
        return redirect(redirect_url)


@app.route('/userinfo')
def userinfo():
    try:
        access_token = mwoauth.AccessToken(**session['access_token'])
    except KeyError:
        return abort(Response('Not authenticated', 403))
    identity = mwoauth.identify(app.config["OAUTH_MWURI"], create_consumer_token(), access_token)
    # TODO: remove this -- needed to track any changes being done while testing
    print(f"******************** {identity['username']}")
    return jsonify(identity)


@app.route('/api/<domain>', methods=['POST'])
def call_api(domain: str):
    if domain not in cache.sites_metadata:
        return abort(Response('Unrecognized domain', 400))
    try:
        access_token = mwoauth.AccessToken(**session['access_token'])
    except KeyError:
        return abort(Response('Not authenticated', 403))
    consumer_token = create_consumer_token()
    auth = OAuth1(consumer_token.key,
                  client_secret=consumer_token.secret,
                  resource_owner_key=access_token.key,
                  resource_owner_secret=access_token.secret)
    with cache.create_session(user_requested=True) as state:
        site = state.get_site(domain)
        params = request.get_json()
        action = params.pop('action')
        if action == 'edit':
            print(f"{'**** Modifying' if 'nocreate' in params else 'Creating'} page {params['title']} at {domain}")
        try:
            result = site(action, EXTRAS=dict(auth=auth), NO_LOGIN=True, POST=True, **params)
        except ApiError as err:
            print("----------------------------boom")
            print(repr(err.data))
            if 'text' in err.data:
                print(err.data.text)
            print("----------------------end")
            return abort(Response('API boom', 500))
        return jsonify(result)


@app.route('/oauth_callback.php')
def oauth_callback():
    if 'request_token' not in session:
        flash('OAuth callback failed, do you have your cookies disabled?')
        return redirect('/')

    consumer_token = create_consumer_token()
    try:
        access_token = mwoauth.complete(
            app.config["OAUTH_MWURI"],
            consumer_token,
            mwoauth.RequestToken(**session['request_token']),
            request.query_string)

        identity = mwoauth.identify(app.config["OAUTH_MWURI"], consumer_token, access_token)
    except:
        flash('OAuth callback caused an exception, aborting')
        app.logger.exception('OAuth callback failed')
    else:
        session['access_token'] = dict(zip(access_token._fields, access_token))
        session['username'] = identity['username']

    return redirect('/')


@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')


if __name__ == "__main__":
    # Prevent double-loading in debug mode
    app.run(use_reloader=False)
