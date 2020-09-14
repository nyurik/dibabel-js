import json
import signal
from datetime import datetime
from pathlib import Path
from time import sleep

import atexit
import mwoauth
import yaml
from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask, jsonify, session, flash, abort, Response
from flask import redirect, request
from pywikiapi import ApiError
from requests_oauthlib import OAuth1

from .dibabel.Controller import Controller
from .dibabel.DataTypes import Domain
from .dibabel.SessionState import SessionState

is_shutting_down = False
default_signal_handlers = {}


def handle_stop_signal(sig_num, stack_frame):
    global is_shutting_down
    is_shutting_down = True
    print(f"Shutting down dibabel with ({sig_num}) ...")
    if sig_num in default_signal_handlers:
        sleep(5)
        print("Calling default handler...")
        return default_signal_handlers[sig_num](sig_num, stack_frame)


for sig in [signal.SIGINT, signal.SIGTERM]:
    handler = signal.getsignal(sig)
    if callable(handler):
        default_signal_handlers[sig] = handler
    signal.signal(sig, handle_stop_signal)

app = Flask(__name__)

for file in ('default.yaml', 'secret.yaml'):
    path = Path(__file__).parent / '..' / file
    print(f"Reading config from {path}")
    with path.open('r', encoding='utf-8') as stream:
        app.config.update(yaml.safe_load(stream))

print(f"Running as {app.config['CONSUMER_KEY']}")
cache_file = Path('../cache/cache.sqlite')

site_data_file = Path('../../js/public/sitedata.json')
print(f"Loading site data from {site_data_file}")
allowed_domain = set((v["url"].replace("https://", "") for v in json.loads(site_data_file.read_text())["sites"]))


def refresher():
    if not is_shutting_down:
        print(f'Refreshing state at {datetime.utcnow()}...')
        with SessionState(cache_file, user_requested=False) as state:
            Controller(state).refresh_state()
        print(f'Done refreshing state at {datetime.utcnow()}...')


# Make sure we have the latest data by occasionally refreshing it
scheduler = BackgroundScheduler()
scheduler.add_job(func=refresher, trigger="interval", seconds=300)
scheduler.start()
atexit.register(lambda: scheduler.shutdown())


def _create_consumer_token():
    return mwoauth.ConsumerToken(app.config["CONSUMER_KEY"], app.config["CONSUMER_SECRET"])


@app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


@app.route("/data")
def get_data():
    _validate_not_stopping()
    print(f"++++ /data")
    with SessionState(cache_file, user_requested=True) as state:
        return jsonify(Controller(state).get_data())


@app.route("/page/<qid>/<domain>")
def get_page(qid: str, domain: str):
    _validate_not_stopping()
    print(f"++++ /page/{qid}/{domain}")
    _validate_domain(domain)
    with SessionState(cache_file, user_requested=True) as state:
        return jsonify(Controller(state).get_page(qid, domain))


@app.route('/login')
def login():
    _validate_not_stopping()
    print(f"++++ /login")
    try:
        redirect_url, request_token = mwoauth.initiate(app.config["OAUTH_MWURI"], _create_consumer_token())
    except:
        app.logger.exception('mwoauth.initiate failed')
        return redirect('/')
    else:
        session['request_token'] = dict(zip(request_token._fields, request_token))
        return redirect(redirect_url)


@app.route('/userinfo')
def userinfo():
    _validate_not_stopping()
    print(f"++++ /userinfo")
    try:
        access_token = mwoauth.AccessToken(**session['access_token'])
    except KeyError:
        return abort(Response('Not authenticated', 403))
    identity = mwoauth.identify(app.config["OAUTH_MWURI"], _create_consumer_token(), access_token)
    # TODO: remove this -- needed to track any changes being done while testing
    print(f"******************** {identity['username']}")
    return jsonify(identity)


@app.route('/api/<domain>', methods=['POST'])
def call_api(domain: str):
    _validate_not_stopping()
    print(f"++++ /api/{domain}")
    _validate_domain(domain)
    try:
        access_token = mwoauth.AccessToken(**session['access_token'])
    except KeyError:
        return abort(Response('Not authenticated', 403))
    consumer_token = _create_consumer_token()
    auth = OAuth1(consumer_token.key,
                  client_secret=consumer_token.secret,
                  resource_owner_key=access_token.key,
                  resource_owner_secret=access_token.secret)

    with SessionState(cache_file, user_requested=True) as state:
        site = state.get_site(domain)
        params = request.get_json()
        action = params.pop('action')
        filename = f'{datetime.utcnow()}-{action}'
        if action == 'edit':
            modifying = 'nocreate' in params
            print(f"{'**** Modifying' if modifying else 'Creating'} page {params['title']} at {domain}")
            filename += ('modify' if modifying else 'create')
        is_token = action == 'query' and 'meta' in params and params['meta'] == 'tokens'
        if not is_token:
            record_to_log(filename, domain, params)
        try:
            result = site(action, EXTRAS=dict(auth=auth), NO_LOGIN=True, POST=True, **params)
            if not is_token:
                record_to_log(filename, domain, result)
        except ApiError as err:
            print("----------------------------boom")
            print(repr(err.data))
            if 'text' in err.data:
                record_to_log(filename, domain, dict(err=repr(err.data), text=repr(err.data.text)))
                print(err.data.text)
            else:
                record_to_log(filename, domain, dict(err=repr(err.data)))
            print("----------------------end")
            return abort(Response('API boom', 500))
        return jsonify(result)


@app.route('/oauth_callback.php')
def oauth_callback():
    print(f"++++ /oauth_callback.php")
    if 'request_token' not in session:
        flash('OAuth callback failed, do you have your cookies disabled?')
        return redirect('/')

    consumer_token = _create_consumer_token()
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
    print(f"++++ /logout")
    session.clear()
    return redirect('/')


def _validate_domain(domain: Domain):
    if domain not in allowed_domain:
        return abort(Response('Invalid domain', 400))


def _validate_not_stopping():
    if is_shutting_down:
        return abort(Response('Shutting down', 500))


def record_to_log(filename: str, domain: Domain, data: dict):
    try:
        clone = {k: v for k, v in data.items() if k != 'token'}
        f = Path(__file__).parent / '..' / '..' / '..' / 'logs'
        f.mkdir(exist_ok=True)
        f = f / (filename + '.log')
        with f.open(mode='a', encoding='utf-8') as f:
            f.write(f"\n\nDOMAIN: {domain}\n")
            f.write(json.dumps(clone, ensure_ascii=False, indent=2))
    except Exception as ex:
        print('error logging: ', ex)


if __name__ == "__main__":
    # Prevent double-loading in debug mode
    app.run(use_reloader=False)
