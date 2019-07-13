let envMaker = function envMaker (fsp, path, exec, rest = {}) {
    const env = {
        //@ write: target, text, encoding -> true when done
        write : async function write (originalTarget, text, encoding ='utf8') {
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
        }, 
        //@ read: target, encoding -> file contents
        read : async function read (originalTarget, encoding = 'utf8') {
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
        },
        //@ fetch: url, local file destination, url options, response type -> file saved or data returned
        fetch : async function fetchUrl (url, local, options = {method:'GET'}, type='text') {
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
        },
        //@ mkdir: target -> true
        mkdir : async function mkdir (originalTarget) {
            const target = env.path(originalTarget, 'B');
            env.log(`mkdir: Creating ${path.dirname(target)}`, 'write', 3);
            try {
                await fsp.mkdir(path.dirname(target), {recursive: true});
                env.log(`mkdir: Directory ${path.dirname(target)} now exists`, 'write', 3);
                return true;
            } catch (e) {
                env.error(`mkdir: Failed to create directory ${target}`, e);
            }
        },
        //@ ls: target -> {files, dir}
        ls : async function ls (originalTarget) {
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
        },
        //@ info: target -> ms time {access, modified, change, birth}
        info : async function info (target) {
            target = env.path(target, 'S');
            let b = await fsp.lstat(target);
            return {
                access: b.atimeMs,
                modified : b.mtimeMs,
                change : b.ctimeMs,
                birth : b.birthtimeMs
            };
        }, 
        //@path : short path, default lead of path ->  long path
        path : function pathProxy (originalTarget, defaultLead) {
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
        },
        //@exec : command name, options for the command, options for exec -> stdout from command line (stderror is logged) 
        exec : async function execProxy (cmd, cmdLineOptions={}, execOptions = {}) {
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
        },
        cmds : {
            tex2pdf : function (options ) {
                let osrc = options.src;
                let src = env.path( options.src + '.tex', 'M');
                let out = env.path( ( options.out || options.src) + '.pdf', 'B');
                let str = `latex ${src} && dvips ${osrc}.dvi; && ps2pdf ${osrc} ${out}`;
                return str;
            } 
        },
    
        //@ promiseStarts : empty -> promise
        promiseStarts : function promiseIO () {
            let rej, res;
            let prom = new Promise( (resolve, reject) => {
                res = resolve;
                rej = reject;
            });
            env.promises.push(prom);
            return {res, rej, prom};
        },
        promises : [],
    
        //@log: msg, tag, print level, ...whatever -> true    
        log: function log (msg, tag='general', priority = 1, ...rest) {
            env.logs.push(msg, tag, priority, ...rest);
            if (priority >= env.printPriority) {
                console.log(msg);
            }
            return true;
        },
    
        logs : [],
        printPriority : 3,
        error : function error (msg, data, e) {
            env.errors.push([msg, data]);
            if (e) {
                e.msg = msg + '\n' + e.message;
                throw e;
            }
        },
        errors : [], 
        paths : {
            'R' : '',
            '~' : '',
            'S' : 'src',
            'M' : 'middle',
            'B' : 'build'
        } 
    
    };
    
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
    return env;
};

let environments = {};

{
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
    
    env.hash = async function hash (message) {
        const hash = crypto.createHash('sha256');
        hash.update(message);
        return hash.digest('hex');
    };
}

{
    let env; //fsp replacement needs to see env
    const fsp = {
        //@ writeFile: target, text -> true having saved it in files
        writeFile: async function fspWriteFile (target, data) {
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
                    access : time,
                    modified : time,
                    change : time,
                    birth : time
                };
                dir.value[basename] = file;
            }
            return true;
        },
        //@ readFile: target -> value
        readFile : async function fspReadFile (target) {
            let obj = fsp.get(target);
            if ( (!obj) || (obj.type !== 'file') ) {
                throw `Trying to read non-file ${target}`;
            }
            obj.access = obj.change = (new Date).getTime();
            return obj.value;
        },
        //@ mkdir: target -> makes directories in object as needed
        mkdir : async function fspMkdir (target) {
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
                        access : time,
                        modified : time,
                        change : time,
                        birth : time
                    };
                }
            }, root);
            return true;
        },
        //@ readdir: target -> [dirent objects stating whether something is a file (terminal in the object hierarchy) or directory (pointer) ]
        readdir : async function fspReaddir (target) {
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
        },
        //@ lstat: target -> {access, modified, change, birth in ms}
        lstat : async function fspLstat (target) {
            let {access, modified, change, birth} = fsp.get(target);
            return {
                atimeMs: access, 
                mtimeMs: modified, 
                ctimeMs: change, 
                birthtimeMs: birth
            };
        },
        //@ get: target => file or dir
        get : function fspget (target) {
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
    };
    const path = {
        //@ join: first path, second path, ... -> single path
        join : function pathJoin (...paths) {
            let joined = paths.join(path.sep);
            return path.normalize(joined);
        },  
        //@ normalize: path -> cleaned path
        normalize : function pathNormalize (dotty, returnBits = false) {
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
        }, 
        //@ dirname: path -> path with no file
        dirname : function pathDirname (full) {
            let bits = path.normalize(full, true);
            if (bits.length > 1) {
                bits.pop();
            }
            return bits.join(path.sep);
        },
        sep : '/'
    };
    const exec = () => {};
    const rest = {}; //needed for browser in node for fetch
    env = environments.browser = envMaker(fsp, path, exec, rest);
    env.base = '';
    env.exec = async function execAttempt (cmd, cmdOptions, execOptions) {
        if (has(env.cmds, cmd) ) {
            return await env.cmds[cmd](cmdOptions, execOptions);
        } else {
            env.log(`Exec command ${cmd} not known`, 'exec', 3, cmdOptions, execOptions );
            return null;
        }
    };
    env.hash = async function hash (message) {
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
    };
    {
        const time = (new Date).getTime();
        env.files = {
            type : 'directory',
            value : {},
            access : time,
            modified : time,
            change : time,
            birth : time
        };
    }

    const fetch = require('node-fetch'); //window.fetch replacement
    rest.fetch = fetch;
}

let env = environments.nodejs;

env.printPriority = 0;
env.cmds.date = function () {
    return 'date';
};
env.cmds.ls = function (options) {
    return `ls ${options}`;
};
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
