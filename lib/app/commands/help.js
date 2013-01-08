/*
 * Copyright (c) 2011-2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */


/*jslint anon:true, sloppy:true, nomen:true*/


var fs = require('fs');


/**
 * The Help Command object. All testable methods and attributes
 * are properties of this object.
 */
function Help () {
}


/**
 * Show top-level help, which is simply a list of available commands. Command
 * names are taken from the names of the JavaScript files in the same location
 * as the help command itself.
 */
function helpTop() {
    var store = Help.CLI.getStore(),
        list = [],
        i;

    commands = store.getResourceVersions({
        type: 'command'
    }) || [];

    for (i = 0; i < commands.length; i += 1) {
        if (commands[i] && commands[i].name) {
            list.push(commands[i].name);
        }
    }
    console.log('Available commands: ' + list.join(', '));
}


/**
 * Show help for the specified command. The help is obtained by loading the
 * corresponding module and accessing the 'help' or 'usage' value. If the
 * command does not exist, an error is reported and top level help is shown.
 * @param {string} commandName The name of the command to provide help for.
 */
function helpCommand(commandName) {
    var command;

    try {
        command = commandName && Help.CLI.getCommand(commandName);
    } catch (e) {
        console.log('No such command: ' + commandName);
        helpTop();
        return;
    }

    if (!command) {
        console.log('No such command: ' + commandName);
        helpTop();
    } else {
        console.log(command.help || command.usage ||
                ('No help available for command: ' + commandName));
    }
}


/**
 * Standard usage string export.
 */
Help.usage = 'mojito help [command]';


/**
 * Standard run method hook export.
 */
 Help.run = function (params, options, callback) {
    if (params[0]) {
        helpCommand(params[0]);
    } else {
        helpTop();
    }
};


/**
 * Export the Help command object, which includes all testable functions.
 * @type {Function}
 */
module.exports = Help;