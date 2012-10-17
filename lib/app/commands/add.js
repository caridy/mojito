/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */


/*jslint anon:true, sloppy:true, nomen:true, node:true*/


var libpath = require('path'),
    utils = require(libpath.join(__dirname, '../../management/utils')),
    Mojito = require(libpath.join(__dirname, '../../mojito')),
    npm = require("npm");

/**
 * The usage string for this command.
 */
exports.usage = 'mojito add {extension}\n' +
    "\t- extension: the name of the extension to plug in.\n";

/**
 * The options list for this command.
 */
exports.options = [];


/**
 * The run() method which handles processing for this command.
 * @param {Array} params Optional parameters to the command.
 * @param {Object} options Optional options for the command.
 * @param {Function} callback Function to invoke on commmand completion.
 */
exports.run = function (params, options, callback) {
    var extension = params[0],
        cwd = process.cwd();

    if (!params[0]) {
        params[0] = '';
    }

    if (!extension) {
        utils.error("Extension name is required", exports.usage);
        return;
    }

    // Are we in a Mojito App?
    utils.isMojitoApp(cwd, exports.usage, true);

    exports.install(extension, options, callback);
};


/**
 * The install command.
 * @method install
 * @param {string} extension The name of the extension to install.
 * @param {Object} cmdOptions Options for the command.
 * @param {Function} callback A function to invoke on completion.
 */
exports.install = function (extension, cmdOptions, callback) {

    var npm_module = "mojito-" + extension;

    npm.load({}, function (err, npm) {
        if (err) {
            utils.error("NPM failure, please verify your NPM configuration.", exports.usage);
            return;
        }
        npm.install(npm_module, function (err, data) {
            if (err) {
                if (err.code === 'E404') {
                    utils.error("Invalid extension name or version, please verify NPM package: " +
                        npm_module, exports.usage);
                } else {
                    utils.error("NPM failure: " + JSON.stringify(err), exports.usage);
                }
                return;
            }

            exports.deploy(extension, cmdOptions, function () {
                console.log("Extension [" + extension + "] was installed.");
                callback();
            });
        });
    });
};


/**
 * The deploy command. This command execute a routine in
 * the extension module in case the extension has to modify
 * the application in any way.
 * @method deploy
 * @param {string} extension The name of the extension to deploy.
 * @param {Object} cmdOptions Options for the command.
 * @param {Function} callback A function to invoke on completion.
 */
exports.deploy = function (extension, cmdOptions, callback) {

    var mod;

    try {
        mod = require('mojito-' + extension);
    } catch (e) {
        callback();
        return;
    }
    if (mod && mod.undeploy) {
        console.log('Deploying extension [' + extension + '] ...', 'info');
        mod.deploy(cmdOptions, callback);
    } else {
        callback();
    }

};