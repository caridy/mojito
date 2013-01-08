/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */


/*jslint node:true, nomen:true*/
/*global YUI*/


/**
 * @module CookiesRouteAddon
 */
YUI.add('addon-route-cookie', function (Y, NAME) {

    'use strict';

    var express = require('express');

    /**
     * create a cokkies parser addon for Y.Router
     */
    Y.namespace('mojito.addons.route').cookie = function (config) {
        config.router.cookie = express.cookieParser();
    };

}, '0.1.0', {requires: [
    'mojito'
]});
