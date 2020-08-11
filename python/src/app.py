from dataclasses import dataclass
from pathlib import Path

import mwoauth
import yaml
from dibabel.QueryCache import QueryCache
from flask import Flask, jsonify, session, flash
from flask import redirect, request

app = Flask(__name__)

for file in ('default.yaml', 'secret.yaml'):
    path = Path(__file__).parent / '..' / file
    print(f"Reading config from {path}")
    with path.open('r', encoding='utf-8') as stream:
        app.config.update(yaml.safe_load(stream))

cache = QueryCache('../cache')


def create_consumer_token():
    return mwoauth.ConsumerToken(app.config["CONSUMER_KEY"], app.config["CONSUMER_SECRET"])


@app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


@app.route("/data")
def data():
    with cache.create_session() as state:
        return jsonify(cache.get_data(state))


@app.route("/page/<qid>/<site>")
def page(qid: str, site: str):
    with cache.create_session() as state:
        return jsonify(cache.get_page(state, qid, site))


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
    access_token = mwoauth.AccessToken(**session['access_token'])
    return jsonify(mwoauth.identify(app.config["OAUTH_MWURI"], create_consumer_token(), access_token))


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
    app.run()
