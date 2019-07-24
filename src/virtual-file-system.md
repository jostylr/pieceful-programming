# Virtual file system

This produces two files. The first file is a nodejs version that is a basic
interface into the provided filesystem commands that we generically need. At
least to start, this is a fairly minimal set of commands: write file, read
file, fetch a file, make directory, list a directory, get info, and exec. 

The second file is one appropriate for the browser. Basically, it expects to
have hooked into it an object that provides the f


## Cli

This is loading the command client version. It also contains the browser
version as that can be useful for not doing file stuff, but pretending. 

    let envMaker = _"core";

    let environments = {};

    {
        _"cli block"
    }

    {
        _"browser block"

        const fetch = require('node-fetch'); //window.fetch replacement
        rest.fetch = fetch;
    }

    let env = environments.nodejs;

### cli block

Client specific requires and functions. 


    const fs = require('fs');
    const fsp = fs.promises;
    const path = require('path');
    const cp = require('child_process');
    const util = require('util');
    const exec = util.promisify(cp.exec);
    const fetch = require('node-fetch');
    const crypto = require('crypto');
    
    const rest = {fs, fetch, crypto};

    let env = environments.nodejs = envMaker(fsp, path, exec, rest);
    env.base = process.cwd();

    env.hash = _"node crypto hash";

## Browser

This is loading a browser version of all of this. We build a file system
object that will hold and simulate it all.

    let envMaker = _"core";

    let environments = {};
    
    {
        const process = {}; //sub for node process. 
        _"browser block"
        
    }
    let env = environments.browser;


### browser block
    
    let env; //fsp replacement needs to see env
    const fsp = _"fsp replacement";
    const path = _"path replacement";
    const exec = () => {};
    const rest = {}; //needed for browser in node for fetch
    env = environments.browser = envMaker(fsp, path, exec, rest);
    env.base = '';
    env.exec = _"replace exec";
    env.hash = _"web crypto hash";
    {
        const time = (new Date).getTime();
        env.files = {
            type : 'directory',
            value : {},
            _"time stamp"
        };
    }


## Core

This is the core. It is a function that takes in fsp, path, and exec and
outputs an interface for doing file stuff. 

    function envMaker (fsp, path, exec, rest = {}) {
        const isNumber = _"minimist:isNumber";
        const hasKey = _"minimist:hasKey";

        _"core env"
        env.local = { path }; //so as to access those commands directly
        return env;
    }

### Core Env

    const env = {
        //@ write: target, text, encoding -> true when done
        write : _"write", 
        //@ read: target, encoding -> file contents
        read : _"read",
        //@ fetch: url, local file destination, url options, response type -> file saved or data returned
        fetch : _"fetch",
        //@ mkdir: target -> true
        mkdir : _"mkdir",
        //@ ls: target -> {files, dir}
        ls : _"ls",
        //@ info: target -> ms time {access, modified, change, birth}
        info : _"info", 
        //@path : short path, default lead of path ->  long path
        path : _"path",
        //@exec : command name, options for the command, options for exec -> stdout from command line (stderror is logged) 
        exec : _"exec",

A simple command for doing latex->dvi->ps as an example. 

        cmds : {
            tex2pdf : _"tex2pdf" 
        },

        //@ minimist:  args, options -> args object
        minimist : _"minimist", 
        
        argv : () => process.argv.slice(2),

        //@ promiseStarts : empty -> promise
        promiseStarts : _"promise starts",
        promises : [],
    
        //@log: msg, tag, print level, ...whatever -> true    
        log: _"log",

        logs : [],
        printPriority : 3,

The error function stores an error and throws it. 

        error : function error (msg, data, e) {
            env.errors.push([msg, data]);
            if (e) {
                e.msg = msg + '\n' + e.message;
                throw e;
            }
        },
        errors : [], 
        errorExit : (code = 1) => {process.exitCode = code;},

The paths allow for easy and clear targeting of different directories. 

        paths : {
            'R' : '',
            '~' : '',
            'S' : 'src',
            'M' : 'middle',
            'B' : 'build'
        } 


    };

    _"cache"


### write 

This is where we write the file. If there is an error initially, then we try
to create a directory. Probably could use some more error logic for writing. 

By default, files go under the build directory. 

    async function write (originalTarget, text, encoding ='utf8') {
        const target = env.path(originalTarget, 'B');
        let {res, rej} = env.promiseStarts('write', target);
        try {
            await fsp.writeFile(target, text, encoding); 
            res();
        } catch (e) {
            try {
                await env.mkdir(originalTarget);
            } catch (e) {
                env.error(`write: failed to create directory for writing ${target}`, e);
            }
            try {
                await fsp.writeFile(target, text, encoding); 
                res();
                env.log(`write: File ${target} written`, 'write', 1);
                return true; //writefile does not return a value other than resolution
            } catch (e) {
                rej(`write: File ${target} failed to be written--${e.msg}`);
                return false;
            }
        }
    }

### read 

This reads a file. 

    async function read (originalTarget, encoding = 'utf8') {
        const target = env.path(originalTarget, 'S');
        let {res, rej} = env.promiseStarts('read', target);
        try {
            env.log(`read: Reading ${target}`, 'read', 1);
            let text = await fsp.readFile(target, {encoding} );
            res(`read: Reading ${target}`);
            return text;
        } catch (e) {
            rej(`read: File ${target} failed to be read--${e.msg}`);
            return false;
        }
    }

### fetch

Fetch is native to the browser and we use node-fetch to use the same code on
the server side. We will stream the response if local is present and we do not
have a files object in the environment. 

    async function fetchUrl (url, local, options = {method:'GET'}, type='text') {
        let fetch =  (rest.fetch ?  rest.fetch : window.fetch);  
        if (local && rest.fs) {
            return fetch(url, options).then(res => {
                const dest = rest.fs.createWriteStream(env.path(local, 'B'));
                res.body.pipe(dest);
            }); 
        } 
        let res = await fetch(url, options);
        let data = await res[type]();
        if (local) {
            return env.write(local, data); 
        } 
        return data;
    }




### mkdir 

Our attitude is to simply make everything we want to make and hope for the
best. This is a good function to overwrite if one wants more caution. 

    async function mkdir (originalTarget) {
        const target = env.path(originalTarget, 'B');
        env.log(`mkdir: Creating ${path.dirname(target)}`, 'write', 3);
        try {
            await fsp.mkdir(path.dirname(target), {recursive: true});
            env.log(`mkdir: Directory ${path.dirname(target)} now exists`, 'write', 3);
            return true;
        } catch (e) {
            env.error(`mkdir: Failed to create directory ${target}`, e);
        }
    }

### ls 

An interface for getting a directory listing, separating into files and
directories, ignoring anything else. We return the listing with the original
target form, allowing for smooth use in later calls.  

    async function ls (originalTarget) {
        let target = env.path(originalTarget, 'S');
        let list = await fsp.readdir(target, {withFileTypes:true});
        let files = [];
        let dirs = [];
        list.forEach( (dirent) => {
            if (dirent.isFile() ) {
                files.push(path.join(originalTarget, dirent.name) );
            }
            if (dirent.isDirectory() ) {
                dirs.push(path.join(originalTarget, dirent.name) );
            }
        });
        env.log(`ls: Directory ${target} read`, 'read', 1, {files, dirs});
        return {files, dirs};
    }



### info

This takes in a file name and gives out when it was last accessed (read), modified (write),
changed (read or write), and created. 

    async function info (target) {
        target = env.path(target, 'S');
        let b = await fsp.lstat(target);
        return {
            access: b.atimeMs,
            modified : b.mtimeMs,
            change : b.ctimeMs,
            birth : b.birthtimeMs
        };
    }


### path 

This is a function body that takes in a target directory and a default base
toggle and outputs a fully realized target path. This function expects the
toggle to be indicated by `./`. The toggle is converted to uppercase.

Example: `B./stuff/to/build`


    function pathProxy (originalTarget, defaultLead) {
        let target = path.normalize(originalTarget);
        let ind = target.indexOf('./');
        let lead;
        if (ind !== -1) {
            lead = target.slice(0,ind).toUpperCase();
            target = target.slice(ind+2).trim();
        } else {
            lead = defaultLead || 'B';
        }
        let paths = env.paths;
        if (has(paths, lead) ) {
            target = path.join(env.base, paths[lead], target);
        } else {
            env.error(`Base ${lead} not a valid path toggle. Target: ${target} with default ${env.paths[defaultLead]}`);  
        }
        return target;
    }

For the browser, we need to do path.normalize and path.join for this method.



### exec

A generic exec function that takes in a cmd name, looks it up in env.cmds, and
then produces a string that can be fed into a child process, and that is
executed. The second argument is an object which the cmd function uses to
convert into string arguments, a process each command function deals with
differently. The exec function will localize the cwd for execOptions if
provided, using the 'middle' directory as a default. 

    async function execProxy (cmd, cmdLineOptions={}, execOptions = {}) {
        if ( ! has(env.cmds, cmd) ) {
            env.error(`Unknown command ${cmd}`);
            return;
        }  
        let cmdString = env.cmds[cmd](cmdLineOptions);
        if (execOptions.cwd) {
            execOptions.cwd = env.path(execOptions.cwd, 'M');
        }
        let obj = await exec(cmdString, execOptions);
        if (obj.stderror) {
            env.log(`Standard Error in command ${cmd}: ${obj.stderror}`, 'exec', 3);
        }
        return obj.stdout; // stderr, stdout as properties
    }

### promise starts

This creates a promise that resolves after the IO is done. The idea is that
the promise array is being monitored

    function promiseIO () {
        let rej, res;
        let prom = new Promise( (resolve, reject) => {
            res = resolve;
            rej = reject;
        });
        env.promises.push(prom);
        return {res, rej, prom};
    }

### log

A basic log function. The idea is to have a priority level that we can set to
determine what gets printed to the console. The logs array will contain the
full. 

    function log (msg, tag='general', priority = 1, ...rest) {
        env.logs.push(msg, tag, priority, ...rest);
        if (priority >= env.printPriority) {
            console.log(msg);
        }
        return true;
    }

### Cache

We also have a cache which can decide whether an operation is needed or not to
be done. It has, by default, the keys to objects read, write, and url.  There
is a method, saveCache that saves it to a file. By default, it excludes the
read objects. To delete a cache, use the delete command on a key, probably
expanding a target first. 

    env.cache = {
        read : {},
        write : {},
        url : {}
    };

    env.saveCache = async function saveCache (target) {
        target = target || 'b./.cache';
        let cache = {...env.cache};
        delete cache.read;
        let str = JSON.stringify(cache);
        env.write(target, str);
    };

    env.loadCache = async function loadCache (target) {
        target = target || 'b./.cache';
        try {
            let data = await env.read(target);
            env.cache = JSON.parse(data);
            if (!env.cache.read) {
                env.cache.read = {};
            }
        } catch (e) {
            env.log(`Failed to load cache ${target}`, 'cache', 3, e);
        }
    };

    env.checkCache  = async function checkCache (target, data, type='write') {
        const hashed = env.cache[type][target];
        if (hashed) {
            const newHash = env.hash(data);
            return ( (hashed === newHash) ? 'same' : 'different');
        } 
        return 'new';
    };
        

### Node crypto hash

This is where we do a hash according to the crypto module in node. This is
from the node docs.

async to match browser behavior. 

    async function hash (message) {
        const hash = crypto.createHash('sha256');
        hash.update(message);
        return hash.digest('hex');
    }

### Web Crypto Hash

This is where we use the crypto api in a browser to hash. This is from the MDN
docs.

    async function hash (message) {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const buffer = await window.crypto.subtle.digest('SHA-256', data);
        const byteArray = new Uint8Array(buffer);
        const hexCodes = [...byteArray].map(value => {
            const hexCode = value.toString(16);
            const paddedHexCode = hexCode.padStart(2, '0');
            return paddedHexCode;
        });
        return hexCodes.join('');
    }


### Tex2Pdf

This is an example command line function. It takes in a source tex file and it
processes it through dvi and ps and into a pdf. There is also the more direct
pdflatex; which one to use depends on the packages one needs. If one uses
pstricks, for example, one needs ps. 

We use the cwd option to ensure that the auxilary files are put in the
specified cwd or in the middle directory. The input and output can be in
different directories from the middle build step files. 


    function (options ) {
        let osrc = options.src;
        let src = env.path( options.src + '.tex', 'M');
        let out = env.path( ( options.out || options.src) + '.pdf', 'B');
        let str = `latex ${src} && dvips ${osrc}.dvi; && ps2pdf ${osrc} ${out}`;
        return str;
    }
            


## FSP Replacement

This replaces any calls to fsp:  writeFile, readFile, 

    {
        //@ writeFile: target, text -> true having saved it in files
        writeFile: _"fsp writeFile",
        //@ readFile: target -> value
        readFile : _"fsp readFile",
        //@ mkdir: target -> makes directories in object as needed
        mkdir : _"fsp mkdir",
        //@ readdir: target -> [dirent objects stating whether something is a file (terminal in the object hierarchy) or directory (pointer) ]
        readdir : _"fsp readdir",
        //@ lstat: target -> {access, modified, change, birth in ms}
        lstat : _"fsp lstat",
        //@ get: target => file or dir
        get : _"fsp get"
    }


A note about leading and trailing slashes: path.normalize keeps them so I did
in the simulation as well. This is also important for a stand alone toggle
such as `b./` with nothing else after it. But fspget and fspmkdir both ignore
any extra slashes (get split into empty names, and they just skip them). 


### fsp writeFile

This writes a file. 

    async function fspWriteFile (target, data) {
        let lastSlash = target.lastIndexOf(path.sep);
        let dirname = target.slice(0, lastSlash);
        let basename = target.slice(lastSlash+1);
        let dir = fsp.get(dirname);
        if ( (!dir) || (dir.type !== 'directory') ) {
            throw `Directory does not exist for ${target} to be saved`;
        }
        let file;
        if (has(dir.value, basename) ) {
            file = dir.value[basename];
            file.modified = file.change = (new Date).getTime();
            file.value = data;
        } else {
            let time = (new Date).getTime();
            file = {
                type : 'file',
                value : data,
                _"time stamp"
            };
            dir.value[basename] = file;
        }
        return true;
    }

### Time stamp

This is repeated a few times. 

    access : time,
    modified : time,
    change : time,
    birth : time

### fsp readFile

This reads a file value

    async function fspReadFile (target) {
        let obj = fsp.get(target);
        if ( (!obj) || (obj.type !== 'file') ) {
            throw `Trying to read non-file ${target}`;
        }
        obj.access = obj.change = (new Date).getTime();
        return obj.value;
    }

### fsp mkdir

This creates directories, recursively. 

    async function fspMkdir (target) {
        let root = fsp.get('');
        let dirnames = target.split(path.sep);
        dirnames.reduce ( (acc, name) => {
            if (!name) { return acc;} 
            if (has(acc.value, name) ) {
                return acc.value[name];
            } else {
                let time = (new Date).getTime();
                acc.modified = acc.change = time;
                return acc.value[name] = {
                    value : {},
                    type : 'directory',
                    _"time stamp"
                };
            }
        }, root);
        return true;
    }

### fsp readdir

Read a directory. Returns list with key: {isFile, isDirectory, name} 

    async function fspReaddir (target) {
        let obj = fsp.get(target);
        if (obj.type !== 'directory') {
            throw `Trying to list non-directory ${target}`;
        }
        let fal = () => false;
        let tru = () => true;
        let dir = obj.value;
        let ret = Object.keys(dir).map( (name) => {
            let type = dir[name].type;
            let dirent = {name};
            if (type === 'file') {
                dirent.isFile = tru;
                dirent.isDirectory = fal;
            } else if (type === 'directory') {
                dirent.isFile = fal;
                dirent.isDirectory = tru;
            } else {
                env.error(`Files object should only have directories or files: ${name} is type ${type}`, obj);
            }
            return dirent;
        });
        return ret;
    }

### fsp lstat

Get info from object. 

    async function fspLstat (target) {
        let {access, modified, change, birth} = fsp.get(target);
        return {
            atimeMs: access, 
            mtimeMs: modified, 
            ctimeMs: change, 
            birthtimeMs: birth
        };
    }



### fsp get

This retrieves an item. If it does not exist at the target, it returns an
undefined value. 
    
    function fspget (target) {
        let root = env.files;
        if (!target) { return root;}
        let dirnames = target.split(path.sep);
        return dirnames.reduce ( (acc, name) => {
            if (!acc) {return undefined;}
            if (!name) { return acc; }
            if (has(acc.value, name) ) {
                return acc.value[name];
            } else {
                return undefined;
            }
        }, root);
    }


## Path Replacement

This needs to only replace path.join, path.normalize, and path.dirname. It
does not need to be robust, hopefully, as the paths should be pretty tame. 

    {
        //@ join: first path, second path, ... -> single path
        join : _"path join",  
        //@ normalize: path -> cleaned path
        normalize : _"path normalize", 
        //@ dirname: path -> path with no file
        dirname : _"path dirname",
        sep : '/', 
        //@ basename : path, ext -> post directory stuff, exclude extension if provided
        basename : _"path basename",
        //@ extname : path -> extension
        extname : _"path extname"
    }

### Path Join

This joins up the paths

    function pathJoin (...paths) {
        let joined = paths.join(path.sep);
        return path.normalize(joined);
    }

### Path Normalize

Here we split on the path separator, removing any empty bits and `.` and
removing both `..` and the prior entry to it. 

We need to preserve leading and trailing path separator. 

    function pathNormalize (dotty, returnBits = false) {
        let start = false;
        let end = false;
        if (dotty[0] === path.sep) {
            start = true;
            dotty = dotty.slice(1);
        }
        if (dotty.slice(-1) === path.sep) {
            end = true;
            dotty = dotty.slice(0,-1);
        }
        let bits = dotty.split(path.sep);
        let i = 0; 
        while (i < bits.length) {
            let bit = bits[i];
            if ((bit === '') || (bit === '.')) {
                bits.splice(i, 1);
                if (bits.length <= 1) {
                    break;
                } else {
                    continue;
                }
            }
            if ( (bit === '..') && (i>1)) {
                bits.splice(i-1, 2);
                i -= 1;
                continue;
            }
            i += 1;
        }
        if (start) { bits.unshift('');}
        if (end) { bits.push(''); }
        if (returnBits) {
            return bits;
        } else {
            return bits.join(path.sep);
        }
    }

### path dirname

This uses path.normalize and is the reason for the return bits option so that
we can strip the last entry and then join. 

    function pathDirname (full) {
        let bits = path.normalize(full, true);
        if (bits.length > 1) {
            bits.pop();
        }
        return bits.join(path.sep);
    }


### path extname

This searches for the last dot after the last separator and takes what comes
after it. 

    function pathExtname (full) {
        let bits = path.normalize(full, true);
        let bit = bits[bits.length -1];
        return bit.split('.')[1] || '';
    }


### path basename

This takes the filename and returns it, ignoring the extension if provided. 

    function pathBasename (full, ext) {
        let bits = path.normalize(full, true);
        let bit = bits[bits.length-1];
        if (ext) {
            return bit.split(ext)[0] || '';
        } else {
            return bit;
        }
    }


## Replace Exec 

Exec is hard to replace. So it looks up the command string in execs and
failing that, it logs it.  This replaces the exec in environment rather than
the node child process exec. This is because the cmdOptions is best as it is
without being concatenated. 

    async function execAttempt (cmd, cmdOptions, execOptions) {
        if (has(env.cmds, cmd) ) {
            return await env.cmds[cmd](cmdOptions, execOptions);
        } else {
            env.log(`Exec command ${cmd} not known`, 'exec', 3, cmdOptions, execOptions );
            return null;
        }
    }


## Sample for Cli

This is a sample file for the client

    _"cli"

    env.printPriority = 0;
    env.cmds.date = _"date";
    env.cmds.ls = _"exec ls";
    (async function main () {
        let temp;

        console.log(await env.ls('b./sample'));
        console.log(await env.ls(''));
        
        console.log((await env.read('virtual-file-system.md')).slice(0,100));
        console.log((await env.read('R./README.md')).slice(0,100));
        await env.write('temp.txt', 'Hi ' + Math.random());
        console.log((await env.read('b./temp.txt')));
        console.log((await env.info('b./temp.txt')));
        console.log(await env.exec('date'));
        console.log(await env.exec('ls', '-alsh', {cwd:'b./sample'})); 
        console.log((await env.fetch('https://jostylr.com')).slice(0,100));
        await env.fetch('https://jostylr.com', 'jostylr.html');


        let text = 'hey dude';
        env.cache.write['b./dude.txt'] = await env.hash(text);
        env.checkCache('b./dude.txt', text, 'write');
        await env.saveCache('b./.cache');
        let oldcache = env.cache;
        env.cache = {}; //don't do this, just testing that loading is really loading
        await env.loadCache('b./.cache');
        let newcache = env.cache;
        console.log('old cache', oldcache, '\n---\nnewcache', newcache); 

        console.log('browser time');

        env = environments.browser;
        await env.write('cool', 'dude value');
        console.log('hello', env.files.value.build);
 
        temp = await env.ls('b./');
        console.log(temp);
        temp = await env.read('b./cool');
        console.log(temp);
        temp = await env.info('b./cool');
        console.log('info: b./cool', temp);
        await env.fetch('https://jostylr.com', 'b./html/me.html');
        temp = await env.read('b./html/me.html');
        console.log('reading my homepage', temp.slice(100,200));

    })();


[sample/cli.js](# "save:")

### date

This is not needed, but as a test of exec, here is a simple function. 

    function () {
        return 'date';
    }

### exec ls

This runs the actual ls command. Also just a sample rune. 

    function (options) {
        return `ls ${options}`;
    }



## Minimist

This is a minorly modified version of
[minimist](https://github.com/substack/minimist)  under the MIT license


    function minimist (args, opts) {
        if (!opts) opts = {};
        
        let flags = { bools : {}, strings : {}, unknownFn: null };

        if (typeof opts['unknown'] === 'function') {
            flags.unknownFn = opts['unknown'];
        }

        if (typeof opts['boolean'] === 'boolean' && opts['boolean']) {
            flags.allBools = true;
        } else {
            [].concat(opts['boolean']).filter(Boolean).forEach(function (key) {
                flags.bools[key] = true;
            });
        }
        
        let aliases = {};
        Object.keys(opts.alias || {}).forEach(function (key) {
            aliases[key] = [].concat(opts.alias[key]);
            aliases[key].forEach(function (x) {
                aliases[x] = [key].concat(aliases[key].filter(function (y) {
                    return x !== y;
                }));
            });
        });

        [].concat(opts.string).filter(Boolean).forEach(function (key) {
            flags.strings[key] = true;
            if (aliases[key]) {
                flags.strings[aliases[key]] = true;
            }
        });

        let defaults = opts['default'] || {};
        
        let argv = { _ : [] };
        Object.keys(flags.bools).forEach(function (key) {
            setArg(key, defaults[key] === undefined ? false : defaults[key]);
        });
        
        let notFlags = [];

        if (args.indexOf('--') !== -1) {
            notFlags = args.slice(args.indexOf('--')+1);
            args = args.slice(0, args.indexOf('--'));
        }

        function argDefined(key, arg) {
            return (flags.allBools && /^--[^=]+$/.test(arg)) ||
                flags.strings[key] || flags.bools[key] || aliases[key];
        }

        function setArg (key, val, arg) {
            if (arg && flags.unknownFn && !argDefined(key, arg)) {
                if (flags.unknownFn(arg) === false) return;
            }

            let value = !flags.strings[key] && isNumber(val)
                ? Number(val) : val
            ;
            setKey(argv, key.split('.'), value);
            
            (aliases[key] || []).forEach(function (x) {
                setKey(argv, x.split('.'), value);
            });
        }

        function setKey (obj, keys, value) {
            let o = obj;
            keys.slice(0,-1).forEach(function (key) {
                if (o[key] === undefined) o[key] = {};
                o = o[key];
            });

            let key = keys[keys.length - 1];
            if (o[key] === undefined || flags.bools[key] || typeof o[key] === 'boolean') {
                o[key] = value;
            }
            else if (Array.isArray(o[key])) {
                o[key].push(value);
            }
            else {
                o[key] = [ o[key], value ];
            }
        }
        
        function aliasIsBoolean(key) {
            return aliases[key].some(function (x) {
                return flags.bools[x];
            });
        }

        for (let i = 0; i < args.length; i++) {
            let arg = args[i];
            
            if (/^--.+=/.test(arg)) {
                // Using [\s\S] instead of . because js doesn't support the
                // 'dotall' regex modifier. See:
                // http://stackoverflow.com/a/1068308/13216
                let m = arg.match(/^--([^=]+)=([\s\S]*)$/);
                let key = m[1];
                let value = m[2];
                if (flags.bools[key]) {
                    value = value !== 'false';
                }
                setArg(key, value, arg);
            }
            else if (/^--no-.+/.test(arg)) {
                let key = arg.match(/^--no-(.+)/)[1];
                setArg(key, false, arg);
            }
            else if (/^--.+/.test(arg)) {
                let key = arg.match(/^--(.+)/)[1];
                let next = args[i + 1];
                if (next !== undefined && !/^-/.test(next)
                && !flags.bools[key]
                && !flags.allBools
                && (aliases[key] ? !aliasIsBoolean(key) : true)) {
                    setArg(key, next, arg);
                    i++;
                }
                else if (/^(true|false)$/.test(next)) {
                    setArg(key, next === 'true', arg);
                    i++;
                }
                else {
                    setArg(key, flags.strings[key] ? '' : true, arg);
                }
            }
            else if (/^-[^-]+/.test(arg)) {
                let letters = arg.slice(1,-1).split('');
                
                let broken = false;
                for (let j = 0; j < letters.length; j++) {
                    let next = arg.slice(j+2);
                    
                    if (next === '-') {
                        setArg(letters[j], next, arg);
                        continue;
                    }
                    
                    if (/[A-Za-z]/.test(letters[j]) && /=/.test(next)) {
                        setArg(letters[j], next.split('=')[1], arg);
                        broken = true;
                        break;
                    }
                    
                    if (/[A-Za-z]/.test(letters[j])
                    && /-?\d+(\.\d*)?(e-?\d+)?$/.test(next)) {
                        setArg(letters[j], next, arg);
                        broken = true;
                        break;
                    }
                    
                    if (letters[j+1] && letters[j+1].match(/\W/)) {
                        setArg(letters[j], arg.slice(j+2), arg);
                        broken = true;
                        break;
                    }
                    else {
                        setArg(letters[j], flags.strings[letters[j]] ? '' : true, arg);
                    }
                }
                
                let key = arg.slice(-1)[0];
                if (!broken && key !== '-') {
                    if (args[i+1] && !/^(-|--)[^-]/.test(args[i+1])
                    && !flags.bools[key]
                    && (aliases[key] ? !aliasIsBoolean(key) : true)) {
                        setArg(key, args[i+1], arg);
                        i++;
                    }
                    else if (args[i+1] && /true|false/.test(args[i+1])) {
                        setArg(key, args[i+1] === 'true', arg);
                        i++;
                    }
                    else {
                        setArg(key, flags.strings[key] ? '' : true, arg);
                    }
                }
            }
            else {
                if (!flags.unknownFn || flags.unknownFn(arg) !== false) {
                    argv._.push(
                        flags.strings['\_'] || !isNumber(arg) ? arg : Number(arg)
                    );
                }
                if (opts.stopEarly) {
                    argv._.push.apply(argv._, args.slice(i + 1));
                    break;
                }
            }
        }
        
        Object.keys(defaults).forEach(function (key) {
            if (!hasKey(argv, key.split('.'))) {
                setKey(argv, key.split('.'), defaults[key]);
                
                (aliases[key] || []).forEach(function (x) {
                    setKey(argv, x.split('.'), defaults[key]);
                });
            }
        });
        
        if (opts['--']) {
            argv['--'] = new Array();
            notFlags.forEach(function(key) {
                argv['--'].push(key);
            });
        }
        else {
            notFlags.forEach(function(key) {
                argv._.push(key);
            });
        }

        return argv;
    }

[hasKey]()

Helper function to detect presence of chained key

    function hasKey (obj, keys) {
        let o = obj;
        keys.slice(0,-1).forEach(function (key) {
            o = (o[key] || {});
        });

        let key = keys[keys.length - 1];
        return key in o;
    }

[isNumber]() 

Test for being a number.

    function isNumber (x) {
        if (typeof x === 'number') return true;
        if (/^0x[0-9a-f]+$/i.test(x)) return true;
        return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(x);
    }


