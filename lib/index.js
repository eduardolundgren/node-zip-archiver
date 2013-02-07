/*
* Copyright (c) 2013, Liferay Inc. All rights reserved.
* Code licensed under the BSD License
*
* @author Eduardo Lundgren <eduardolundgren@gmail.com>
*/

var fs = require('fs'),
    path = require('path'),
    findit = require('walkdir'),
    archiver = require('archiver'),
    zipStart = new Date();

var Zip = function(path) {
    var instance = this;

    if (!path) {
        throw "You need to specify the zip path.";
    }
    var zip = archiver.createZip({ level: 1 });
    zip.pipe(fs.createWriteStream(path));
    instance.zip = zip;
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
            instance._scan(paths, opt_basepath, function(paths) {
                instance.add(paths, opt_callback, opt_basepath);
            });
            return;
        }
    }

    var zip = instance.zip,
        filepath = paths.pop();

    if (filepath) {
        filepath = path.join(opt_basepath || '', filepath);
        fs.stat(filepath, function(err, stat) {
            if (!stat) {
                console.log('File ' + filepath + ' not found.');
                instance.add(paths, opt_callback, opt_basepath);
            }
            else if (stat.isFile()) {
                console.log(filepath);
                instance.zip.addFile(
                    fs.createReadStream(filepath), {
                        name: filepath
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
        zip = instance.zip;

    zip.finalize(function(err, written) {
        if (opt_callback) {
            opt_callback.call(instance);
        }
    });
};

Zip.prototype._scan = function(folder, opt_basepath, opt_callback) {
    var instance = this,
        finder = findit.find(folder),
        paths = [];

    finder.on('path', function(file) {
        paths.push(path.relative(opt_basepath, file));
    });
    finder.on('end', function() {
        if (opt_callback) {
            opt_callback.call(instance, paths);
        }
    });
};

exports.Zip = Zip;