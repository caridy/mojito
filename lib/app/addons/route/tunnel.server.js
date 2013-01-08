/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */


/*jslint anon:true, nomen:true*/
/*global YUI*/


/**
 * @module TunnelRouteAddon
 */
YUI.add('addon-route-tunnel', function (Y, NAME) {

    'use strict';

    var RX_MULTI_SLASH_ALL = /\/+/g;

    function trimSlash(str) {
        if ('/' === str.charAt(str.length - 1)) {
            return str.substring(0, str.length - 1);
        }
        return str;
    }

    function TunnelServer(config) {
        var staticAppConfig = config.store.getAppConfig({}),
            staticPrefix = (staticAppConfig.staticHandling &&
                    staticAppConfig.staticHandling.prefix) ||
                    '/static',
            tunnelPrefix = staticAppConfig.tunnelPrefix ||
                    '/tunnel';

        tunnelPrefix = trimSlash(('/' + tunnelPrefix).replace(RX_MULTI_SLASH_ALL, '/'));
        staticPrefix = trimSlash(('/' + staticPrefix).replace(RX_MULTI_SLASH_ALL, '/'));

        this._router = config.route;
        this._store  = config.store;

        // TODO: add routes
        if (tunnelPrefix) {
            this._router.route(tunnelPrefix,
                    Y.bind(this._handleRpc, this));
        }
        if (staticPrefix) {
            this._router.route(staticPrefix + '/:type/specs/:basename',
                    Y.bind(this._handleSpec, this));
            this._router.route(staticPrefix + '/:type/definition.json',
                    Y.bind(this._handleType, this));
        }
    }

    /*
    * store.client.js expandInstance() makes an RPC call to the TunnelServer.
    * The header 'x-mojito-header' (read here and set in
    * store.client.js) tells the server not to try to route the URL, it gets handled
    * by this critter. The targeted URL _might actually exist_ but we need to make
    * sure that it _does not_ if the mojito header is set to 'tunnel'.
    */
    TunnelServer.prototype = {


        _handleSpec: function (req, res, next) {
            var name,
                instance = {},
                my = this,
                type = req.params.type,
                basename = req.params.basename;

            // if we are not in a tunnel get out of here fast
            if (req.headers['x-mojito-header'] !== 'tunnel') {
                next();
            }

            name = basename.split('.').slice(0, -1).join('.') || null;

            if (!type || !name) {
                my._sendError(res, 'Not found: ' + req.url, 500);
                return;
            }

            instance.base = type;

            if (name !== 'default') {
                instance.base += ':' + name;
            }

            this._store.expandInstanceForEnv('client', instance, req.context,
                function (err, data) {
                    if (err) {
                        my._sendError(res, 'Error opening: ' + req.url + '\n' +
                            err,
                            500
                            );
                        return;
                    }
                    my._sendData(res, data);
                });
        },


        _handleType: function (req, res, next) {
            var instance = {},
                my = this,
                type = req.params.type;

            // if we are not in a tunnel get out of here fast
            if (req.headers['x-mojito-header'] !== 'tunnel') {
                next();
            }

            if (!type) {
                my._sendError(res, 'Not found: ' + req.url, 500);
                return;
            }

            instance.type = type;

            this._store.expandInstanceForEnv('client', instance, req.context,
                function (err, data) {
                    if (err) {
                        my._sendError(res, 'Error opening: ' + req.url + '\n' +
                            err,
                            'debug',
                            'Tunnel:specs'
                            );
                        return;
                    }
                    my._sendData(res, data);
                });
        },


        _handleRpc: function (req, res, next) {
            var data = req.body,
                command = data;

            // if we are not in a tunnel get out of here fast
            if ((req.headers['x-mojito-header'] !== 'tunnel') ||
                    ('POST' !== req.method)) {
                next();
            }

            // when taking in the client context on the server side, we have to
            // override the runtime, because the runtime switches from client to server
            if (!command.context) {
                command.context = {};
            }
            command.context.runtime = 'server';

            // all we need to do is expand the instance given within the RPC call
            // and attach it within a "tunnelCommand", which will be handled by
            // Mojito instead of looking up a route for it.
            this._store.expandInstance(command.instance, command.context,
                function (err, inst) {
                    // replace with the expanded instance
                    command.instance = inst;
                    req.command = {
                        action: command.action,
                        instance: {
                            // Magic here to delegate to tunnelProxy.
                            base: 'tunnelProxy'
                        },
                        params: {
                            body: {
                                proxyCommand: command
                            }
                        },
                        context: data.context
                    };
                    next();
                });
        },


        _sendError: function (res, msg, code) {
            this._sendData(res, {error: msg}, (code || 500));
        },


        _sendData: function (res, data, code) {
            res.writeHead((code || 200), {
                'content-type': 'application/json; charset="utf-8"'
            });
            res.end(JSON.stringify(data, null, 4));
        }


    };

    Y.namespace('mojito.addons.route').tunnel = TunnelServer;

}, '0.1.0', {requires: [
    'mojito'
]});
