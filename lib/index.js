/*
* Copyright (c) 2013, Liferay Inc. All rights reserved.
* Code licensed under the BSD License
*
* @author Eduardo Lundgren <eduardolundgren@gmail.com>
*/

var fs = require('fs'),
    path = require('path'),
    walkdir = require('walkdir'),
    archiver = require('archiver'),
    zipStart = new Date();

var Zip = function(config) {
    var instance = this;
    if (!config.file) {
        throw "You need to specify the zip output file.";
    }
    var zip = archiver.createZip({
        level: 1,
        comment: config.comment
    });
    zip.pipe(fs.createWriteStream(config.file));
    instance.zip = zip;
    instance.config = config;
};

Zip.prototype.add = function(paths, opt_callback, opt_basepath) {
    var instance = this;

    if (typeof paths === 'string') {
        if (!fs.existsSync(paths)) {
            console.log('File ' + paths + ' not found.');
            return;
        }

        var statSync = fs.statSync(paths);

        if (statSync.isFile()) {
            paths = [paths];
        }
        else if (statSync.isDirectory()) {
            opt_basepath = paths;
            paths = walkdir.sync(paths);
        }
    }

    var config = instance.config,
        filepath = paths.pop(),
        relative;

    if (filepath) {
        relative = path.join(config.root, opt_basepath, path.relative(opt_basepath, filepath));
        fs.stat(filepath, function(err, stat) {
            if (!stat) {
                console.log('File ' + filepath + ' not found.');
                instance.add(paths, opt_callback, opt_basepath);
            }
            else if (stat.isFile()) {
                console.log('Added ', filepath);
                instance.zip.addFile(
                    fs.createReadStream(filepath), {
                        name: relative
                    },
                    function() {
                        instance.add(paths, opt_callback, opt_basepath);
                    }
                );
            }
            else {
                instance.add(paths, opt_callback, opt_basepath);
            }
        });
    }
    else {
        if (opt_callback) {
            opt_callback.call(instance, paths);
        }
    }
};

Zip.prototype.done = function(opt_callback) {
    var instance = this,
        config = instance.config,
        zip = instance.zip;

    zip.finalize(function(err) {
        if (opt_callback) {
            opt_callback.call(instance);
        }
    });
};

exports.Zip = Zip;
