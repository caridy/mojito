/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */


/*jslint node:true, nomen:true*/
/*global YUI*/


/**
 * @module BodyRouteAddon
 */
YUI.add('addon-route-body', function (Y, NAME) {

    'use strict';

    var express = require('express');

    /**
     * create a body parser addon for Y.Router
     */
    Y.namespace('mojito.addons.route').body = function (config) {
        config.router.body = express.bodyParser();
    };

}, '0.1.0', {requires: [
    'mojito'
]});
