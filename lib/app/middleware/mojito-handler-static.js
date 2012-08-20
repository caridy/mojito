/*
 * Ext JS Connect
 * Copyright(c) 2010 Sencha Inc.
 * MIT Licensed
 *
 * Modified by Yahoo!
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Yahoo! Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*
 * Connect staticProvider middleware adapted for Mojito *
 ********************************************************
 * This was modified to allow load all files from the
 * Mojito development environment instead of one static
 * directory.
 ********************************************************
 */

/*jslint anon:true, sloppy:true, nomen:true*/


/*
 * Module dependencies.
 */
var mime = require('mime'),
    pa = require('path'),
    parseUrl = require('url').parse,
    logger,
    NAME = 'StaticHandler';

/*
 * File buffer cache.
 */
var _cache = {};

/*
 * Check if `req` and response `headers`.
 *
 * @param {IncomingMessage} req
 * @param {Object} headers
 * @return {Boolean}
 * @api private
 */
function modified(req, headers) {
    var modifiedSince = req.headers['if-modified-since'],
        lastModified = headers['Last-Modified'],
        noneMatch = req.headers['if-none-match'],
        etag = headers.ETag;

    // Check If-None-Match
    if (noneMatch && etag && noneMatch === etag) {
        return false;
    }

    // Check If-Modified-Since
    if (modifiedSince && lastModified) {
        modifiedSince = new Date(modifiedSince);
        lastModified = new Date(lastModified);
        // Ignore invalid dates
        if (!isNaN(modifiedSince.getTime())) {
            if (lastModified <= modifiedSince) {
                return false;
            }
        }
    }

    return true;
}

/*
 * Return an ETag in the form of size-mtime.
 *
 * @method etag
 * @param {Object} data buffer with the content to be flushed
 * @param {Object} stat filesystem stat for the static file.
 * @return {String}
 * @api private
 */
function etag(data, stat) {
    // using data.lenght instead of stat.size to support compilation
    return data.length + '-' + Number(stat.mtime);
}

/*
 * Respond with 304 "Not Modified".
 *
 * @method notModified
 * @param {ServerResponse} res
 * @param {Object} headers
 * @api private
 */
function notModified(res, headers) {
    // Strip Content-* headers
    Object.keys(headers).forEach(function(field) {
        if (0 === field.indexOf('Content')) {
            delete headers[field];
        }
    });
    res.writeHead(304, headers);
    res.end();
}

/*
 * Respond with 403 "Forbidden".
 *
 * @method forbidden
 * @param {ServerResponse} res
 * @api private
 */
function forbidden(res) {
    var body = 'Forbidden';
    res.writeHead(403, {
        'Content-Type': 'text/plain',
        'Content-Length': body.length
    });
    res.end(body);
}

/*
 * Clear the memory cache for `key` or the entire cache.
 *
 * @method clearCache
 * @param {String} key
 * @api public
 */
function clearCache(key) {
    if (key) {
        delete _cache[key];
    } else {
        _cache = {};
    }
}


/*
 * Static file server.
 *
 * Options:
 *
 *   - `root`     Root path from which to serve static files.
 *   - `maxAge`   Browser cache maxAge in milliseconds, defaults to 0
 *   - `cache`    When true cache files in memory indefinitely,
 *                until invalidated by a conditional GET request.
 *                When given, maxAge will be derived from this value.
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */
function staticProvider(store, globalLogger) {
    logger = globalLogger;
    var appConfig = store.getStaticAppConfig(),
        options = appConfig.staticHandling || {},
        cache = options.cache,
        maxAge = options.maxAge,
        urls = store.getAllResources();

    if (cache && !maxAge) {
        maxAge = cache;
    }
    maxAge = maxAge || 0;

    return function(req, res, next) {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            return next();
        }

        var url = parseUrl(req.url),
            path = url.pathname,
            hit,
            head = (req.method === 'HEAD');


        function done(hit) {
            if (!options.forceUpdate && !modified(req, hit.headers)) {
                logger.log(path + ' was not modified', 'debug', NAME);
                notModified(res, hit.headers);
            } else {
                res.writeHead(200, hit.headers);
                res.end(head ? undefined : hit.body);
            }
        }


        // TODO: [Issue 87] we should be able to just remove this, because
        // Mojito closes all bad URLs down.
        // Potentially malicious path
        if (path.indexOf('..') !== -1) {
            return forbidden(res);
        }

        logger.log('serving static path: ' + path, 'debug', 'static-handler');

        // Use the resource store as a URI "rewriter" here.
        if (!urls[path]) {
            return next();
        }

        // Cache hit
        if (cache && (hit = _cache[path])) {
            logger.log(path + ' was read from cache', 'debug', NAME);
            return done(hit);
        }

        store.getResourceCompiled(urls[path], function (err, data, stat) {

            if (err) {
                logger.log('err serving: ' + path, 'warn', NAME);
                return next(err);
            }

            // Serve the content of the file using buffers
            var mimetype = mime.lookup(path),
                charset = mime.charsets.lookup(mimetype),
                headers;

            // Response headers
            headers = {
                'Content-Type': mimetype + (charset ? '; charset=' +
                    charset : ''),
                'Content-Length': data.length,
                'Last-Modified': options.forceUpdate ? new Date().toUTCString() : stat.ctime.toUTCString(),
                'Cache-Control': 'public max-age=' + (maxAge / 1000),
                // Return an ETag in the form of size-mtime.
                'ETag': etag(data, stat)
            };

            hit = {
                headers: headers,
                body: data
            };

            // TODO: [Issue 92] This is not even being used here...
            // remove and revisit (the _cache use is commented out below)
            // Cache support
            if (cache) {
                _cache[path] = hit;
            }

            logger.log(path + ' was read from disk', 'debug', NAME);
            done(hit);

        });

    };
}


/**
 * Export function to create the static handler.
 * @param {Object} config The configuration data for the handler.
 * @return {Object} A static handler.
 */
module.exports = function(config) {
    return staticProvider(config.store, config.logger);
};
