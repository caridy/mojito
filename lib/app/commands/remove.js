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
exports.usage = 'mojito remove {extension}\n' +
    "\t- extension: the name of the extension to be unplugged.\n";

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

    exports.uninstall(extension, options, callback);
};


/**
 * The uninstall command.
 * @method uninstall
 * @param {string} extension The name of the extension to uninstall.
 * @param {Object} cmdOptions Options for the command.
 * @param {Function} callback A function to invoke on completion.
 */
exports.uninstall = function (extension, cmdOptions, callback) {

    var npm_module = "mojito-" + extension;

    npm.load({}, function (err, npm) {
        if (err) {
            utils.error("NPM failure, please verify your NPM configuration.", exports.usage);
            return;
        }
        npm.ls(npm_module, function (err, data) {
            if (err || !data || !!data.dependencies || !data.dependencies[npm_module]) {
                utils.error("Extension [" + extension + "] is not installed.", exports.usage);
                return;
            }
            exports.undeploy(extension, cmdOptions, function () {
                npm.uninstall(npm_module, function (err, data) {
                    if (err) {
                        console.log("Error trying to remove npm module " + npm_module +
                            ". The application might get into an unstable state after this" +
                            "error, and might require manual intervention.", 'error');
                        utils.error("NPM failure: " + JSON.stringify(err), exports.usage);
                        return;
                    }
                    console.log("Extension [" + extension + "] was uninstalled.");
                    callback();
                });
            });
        });
    });
};


/**
 * The undeploy command. This command execute a routine in
 * the extension module in case the extension had modified
 * the application in any way, restoring it.
 * @method undeploy
 * @param {string} extension The name of the extension to deploy.
 * @param {Object} cmdOptions Options for the command.
 * @param {Function} callback A function to invoke on completion.
 */
exports.undeploy = function (extension, cmdOptions, callback) {

    var mod;

    try {
        mod = require('mojito-' + extension);
    } catch (e) {
        console.log('A [' + extension + '] ...');
        callback();
        return;
    }
    if (mod && mod.undeploy) {
        console.log('Undeploying extension [' + extension + '] ...', 'info');
        mod.undeploy(cmdOptions, callback);
    } else {
        callback();
    }

};