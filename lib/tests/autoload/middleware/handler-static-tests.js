/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
YUI.add('mojito-middleware-handler-static-tests', function(Y, NAME) {

    var Assert = YUITest.Assert,
        suite = new YUITest.TestSuite(NAME),
        path = require('path'),
        staticHandler = require(path.join(__dirname, '../../../app/middleware/mojito-handler-static'));

    suite.add(new YUITest.TestCase({

        name: 'static handler tests',

        _handler: null,

        setUp: function() {
            var store = {
                    getAllResources: function () {
                        return {
                            "/compiled.css": {
                                err: null,
                                data: new Buffer('1234567890'),
                                stat: {
                                    mtime: new Date(),
                                    ctime: new Date(),
                                    // this size is different from the data.length since it is suppose to be
                                    // the original size of the compiled buffer
                                    size: 5
                                }
                            }
                        };
                    },
                    getResourceCompiled: function (args, callback) {
                        callback(args.err, args.data, args.stat);
                    },
                    getStaticAppConfig: function() {
                        return {
                            staticHandling: {
                                cache: false,
                                maxAge: null
                            }
                        };
                    }
                };
            this._handler = staticHandler({
                store:  store,
                logger: {
                    log: function() {}
                }
            });

        },

        tearDown: function() {
            this._handler = null;
        },

        'handler calls next() when HTTP method is not HEAD or GET': function() {
            var callCount = 0;

            this._handler({
                    url: '/foo',
                    method: 'PUT'
                }, null, function() {
                callCount++;
            });
            this._handler({
                    url: '/bar',
                    method: 'POST'
                }, null, function() {
                callCount++;
            });

            Assert.areEqual(2, callCount, 'next() handler should have been called');
        },

        'handler detects forbidden calls': function() {
            var callCount = 0,
                errorCode,
                end,
                req = {
                    url: '/foo/../bar.css',
                    method: 'GET'
                },
                res = {
                    writeHead: function (c) {
                        errorCode = c;
                    },
                    end: function () {
                        end = true;
                    }
                };

            this._handler(req, res, function() {
                callCount++;
            });
            Assert.areEqual(0, callCount, 'next() should not be called after a forbidden request.');
            Assert.areEqual(403, errorCode, 'invalid error code for forbidden request.');
            Assert.isTrue(end, 'res.end() should be called after a forbidden request.');
        },

        'handler calls next() when URL is not in RS hash': function() {
            var callCount = 0;

            this._handler({
                    url: '/foo',
                    method: 'GET'
                }, null, function() {
                callCount++;
            });

            Assert.areEqual(1, callCount, 'next() handler should have been called');
        },

        'handler uses cache when possible': function () {
            Assert.skip();
        },

        'handler reads from disk when needed': function () {
            Assert.skip();
        },

        'handler supports forceUpdate option to facilitate development': function () {
            Assert.skip();
        },

        'handler supports compiled resources': function () {
            var req = {
                    url: '/compiled.css',
                    method: 'GET',
                    headers: {}
                },
                res = {
                    writeHead: function (code, header) {
                        resCode = code;
                        resHeader = header;
                    },
                    end: function () {
                        end = true;
                    }
                },
                resCode,
                resHeader,
                end,
                callCount = 0;

            this._handler(req, res, function() {
                callCount++;
            });

            Assert.areEqual(0, callCount, 'next() handler should have not been called');
            Assert.isTrue(end, 'res.end() should be called after serving a compiled response.');
            Assert.areEqual(10, resHeader['Content-Length'], 'the buffer header should dictate the content-length');
        }

    }));

    YUITest.TestRunner.add(suite);

}, '0.0.1');
