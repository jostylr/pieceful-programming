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
const has = function (obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
};

const Weaver = function Weaver (
    organs = {directives:{}, commands:{}, parsers:{}, env:{}}
) {
    if (!organs) {
        throw Error('Weaver requires commands, directives, parsers, etc');
    }
    const weaver = this;
    
    let tracker = weaver.tracker = function trackerShell (sym, str, args) {
        return tracker.log(sym, str, args);
    };
    tracker.log = function logTracker (sym, str, args) {
        let me = tracker.get(sym);
        let log;
        log = [str, args];
        me.logs.push(log);
        if (me.debug || tracker.debug) {
            env.log(`DEBUG(${me.id}): ${log[0]}`, 'tracker', 4, log[1]);
        }
        if (tracker.logs) {
            tracker.logs.push([me.id, ...log]); 
        }
        return me;
    };
    tracker.new = function newTracker (scope, str = '', args) {
        let sym = Symbol();
        let me = { 
            logs : [], 
            sym, 
            type:'promises', 
            needsMe : [], 
            self : scope
        };
        if (typeof scope === 'string') {
            me.id = scope;
        } else {
            while (scope) {
                
                if (has(scope, "id") ) {
                    me.id = scope.id;
                    break;
                }
                
                if (has(scope, "fullname") ) {
                    me.id = scope.fullname;
                    break;
                }
                
                if (has(scope, "scope") ) {
                    scope = scope.scope;
                    continue;
                }
            
                if (has(scope, "context") ) {
                    scope = scope.context;
                    continue;
                }
            
                //ran out of possibilities
                me.id = 'No ID';
                console.log(str, args, scope, me);
                break;
            
            }
        }
        tracker.promises[sym] = me;
        tracker.log(sym, 'New Symbol Established', scope);
        tracker.log(sym, str, args);
        return me;
    };
    tracker.fail = function failTracker (sym, str, args) {
        let err = (str || '');
        let me = tracker.log(sym, err, args);
        tracker.failed[sym] = me;
        me.type = 'failed';
        me.failed = [err,  args];
        delete tracker.promises[sym];
        return me;
    };
    tracker.done = function doneTracker (sym, str, args) {
        let me = tracker.log(sym, 'DONE: ' + (str || ''), args);
        tracker.finished[sym] = me;
        me.type = 'finished';
        delete tracker.promises[sym];
        return me;
    };
    tracker.get = function getTracker (sym) {
        let me = tracker.promises[sym] ||
            tracker.finished[sym] || 
            tracker.failed[sym];
        if (!me) {throw Error('no corresponding tracker symbol');}
        return me;
    };
    tracker.add = function addTracker (sym, str = '', needy) {
        let me = tracker.log(sym, str, tracker.get(needy).id);
        me.needsMe.push(needy);
        return me;
    };
    tracker.self = function selfTracker (sym, str = '', self) {
        let me = tracker.log(sym, str, self);
        me.self = self;
        return me;
    };
    tracker.report = function reportTracker (indent = '  ') {
        let report;
        let self = reportTracker;
        let mapper = self.mapper.bind(weaver);
        let joiner = self.joiner.bind(weaver);
        let failed = self.failed.bind(weaver);
        let blocked = self.blocked.bind(weaver);
        
        let root = Object.getOwnPropertySymbols(tracker.failed);
    
        if (root.length > 0) {
            let ids = root.map(mapper);
            let trails = ids.map( (root) => joiner(root, indent) );
            report = failed(trails, root);
    
        } else {
            let unfinished = Object.getOwnPropertySymbols(tracker.promises);
            if (unfinished.length > 0) {
    
                let needs = unfinished.reduce( (acc, el) => {
                    let me = tracker.get(el);
                    if (me.needsMe.length > 0 ) {
                        acc.push(...me.needsMe);
                    }
                    return acc;
                }, []);
                
                root = unfinished.filter( (el) => !needs.includes(el) );
                let ids = root.map(mapper);
                let trails = ids.map( (root) => joiner(root, indent) );
                report = blocked(trails, root);
                
            }   
        }
        return report;
    };
    tracker.report.mapper = function mapper (el) {
        let me = tracker.get(el);
        let id = me.id;
        if (!id) { env.log(me); id = 'No-ID'; }
        if (me.needsMe.length > 0) {
            let ids = me.needsMe.map(mapper);    
            return [id, ids];
        } else {
            return [id, []];
        }
    };
    tracker.report.joiner = function recurse (arr = [], indent = '  ', curIndent) {
        if (typeof curIndent === 'undefined') {
            curIndent = indent;
        }
        let id = arr[0];
        let ids = arr[1];
        if ( (Array.isArray(ids) ) && ( ids.length > 0)) {
            let trails = ids.
                map( (arr) => recurse(arr, indent, curIndent + indent)).
                map( (str) => curIndent + str).
                join( '\n' + curIndent + '---\n');
            return id + '\n' + trails;
        } else {
            return id;
        }
    };
    tracker.report.failed = function failed (trails, roots) {    
        let tracker = this.tracker;
    
        trails = trails.map( (str, idx) => {
            let err = tracker.get(roots[idx]).failed;
            return str + 
            '\nFAILURE REPORT: ' + err[0] + 
            '\n' + err[1].stack;
        });
    
        return 'FAILED:\n' + trails.join('\n---\n');
    };
    tracker.report.blocked = function blocked (trails, roots) {
        let tracker = this.tracker;
    
        trails = trails.map ( (str, idx) => {
            let logs = tracker.get(roots[idx]).logs;
            let logstr = logs.map( log => log[0] + 
                    ( ( typeof log[1] !== 'undefined') ? 
                        ':' + JSON.stringify(log[1]) :
                        '' 
                    )).
                join('\n');
            return str + '\n---\n' + logstr;
        });
    
        return 'DID NOT FINISH:\n' + 
            trails.join('\n===\n'); 
    };
    
    
    tracker.promises = {};
    tracker.finished = {};
    tracker.failed = {};
    tracker.logs = [];
    tracker.reporterDepth = 20;


    let env = organs.env || {};
    weaver.changeEnv = (newEnv) => { env = newEnv; };

    //the actual values
    weaver.v = {
        web : {},
        commands : Object.assign({
            get : ()=> {}, 
            pipe : () => {},
            compose : () => {}, 
            '*' :() => {}, //short version of compose
            compile :() => {},
            log : () => {},
        }, organs.commands || {}),
        directives : organs.directives || {},
        parsers : organs.parsers || {}
    };
    //the promises 
    weaver.p = {
        web : {},
        commands: {},
        directives : {},
        parser : {}
    };

    const makePromise = function makePromise (type, name) {
        let rej, res, prom;
        prom = new Promise ( (resolve, reject) => {
            rej = reject;
            res = resolve;
        });
        let t = weaver.promiseLabels[type] || type;
        prom.id = `${t}/${name}`;
        let {sym} = tracker.new(prom.id, 'Making new promise', prom);
        prom.
            then( (res) => {tracker.done(sym, 'Promise resolved', res);}).
            catch( (rej) => {tracker.fail(sym, 'Promise failed', rej);});
    
        return {reject:rej, resolve:res, prom, sym};
    };
    const makeArgProcessor = function makeArgProcessor(state, sym) {
        return async function argProcessor (arg, i) {
            let ret;
            if (!arg) {
                ret = undefined;
            } else if (has(arg, 'value') ) {
                ret = arg.value;
            } else if (arg.cmd) {
                tracker(sym, 'Running command for argument processing', [i, arg.cmd]);
                ret = await runCommand.call(state, arg, sym);
            } 
            tracker(sym, 'Argument processed', [i, ret]); 
            return ret;
        };
    };
    const runCommand = async function runCommand (piece = {}, sym) {
        tracker(sym, 'run command called', piece);
        if (has(piece, 'value') ) { 
            tracker(sym, 'Run command returned', piece.value);
            return piece.value;
        }
        let scope = this;
        if (!piece.cmd) { 
            tracker.fail(sym, 'run command called but no command to execute');
            return piece.value = undefined; 
        }
        let {cmd, args=[]} = piece;
        tracker(sym, 'command called', cmd);
        let override;
        if (has(piece, 'inputs') ) {
            let inputs = piece.inputs;
            let input = inputs[0];
            let skip = false;
            args.forEach( (el, idx) => {
                if (el.cmd && (el.cmd === 'pipeInput') ) {
                    if (el.args && el.args.length) {
                        if (el.args.length === 1) {
                            if (el.args[0] === '!') {
                                args[idx].value = undefined;
                                skip = true;
                            } else if (el.args[0][0] === '^') {
                                if (input) {
                                    override = input;
                                    args[idx].value = undefined;
                                } 
                            } else {
                                args[idx].value = inputs[el.args[0]].value;
                            }
                        } else {
                            args[idx].value = el.args.map( (arg => input[arg] ));
                        }
                    } else { //@ by itself
                        skip = true;
                        args[idx].value = input.value;
                    }
                }
            });
            if ( (!skip) && (input && (typeof input.value !== 'undefined') ) ) {
                if (has(piece, 'bind') ) {
                    if (piece.bind !== true) {
                        args.splice(piece.bind, 0, input);
                    } 
                } else {
                    args.unshift(input);
                }
            }
        }
        let ret;
    
    
    
    
        if (cmd === 'pipe') {
            let input;
            let pipes = args;
            tracker(sym, 'pipe started');
            let pipeVals = [];
            for (let i = 0; i < pipes.length; i += 1) {
                let nxtPiece = pipes[i];
                tracker(sym, 'Next pipe', nxtPiece);
                if (nxtPiece.cmd) {
                    nxtPiece.inputs = pipeVals.slice();
                    nxtPiece.value = await runCommand.call(scope, nxtPiece, sym);
                } else if ( !has(nxtPiece, 'value') ) {
                    tracker.fail('failed cmd in pipe', {nxtPiece, i});
                    nxtPiece.value = undefined;
                }
                input = nxtPiece;
                tracker(sym, 'One pipe done', [i, input.value]);
                pipeVals.unshift(input);
            }
            ret = input.value;
        } else if (cmd === 'get') {
            let arg = args[0].value || '';
            if (arg === '') { // no actual call for anything so empty value return
                ret = '';
            } else if (Array.isArray(arg) ) { // list of sections
                let names = [];
                let proms = arg.map( (arg) => {
                    let nodeName = weaver.syntax.getFullNodeName(arg, scope.context);
                    let nodeProm = weaver.getNode(nodeName, sym);
                    names.push(nodeName);
                    return nodeProm;
                });
                let vals = (await Promise.all(proms)).map(el => el.value);
                ret = {};
                vals.forEach( (el, idx) => {
                    ret[names[idx]] = el;
                } );
            } else {
                let nodeName = weaver.syntax.getFullNodeName(arg, scope.context);
                let nodeProm = weaver.getNode(nodeName, sym);
                ret = (await nodeProm);
            }
        } else if ((cmd === 'compose') || (cmd === '*' )) {
            tracker(sym, 'composing');
            let funs = JSON.stringify(args);
            let oldScope = scope;
            let oldSym = sym;
            ret = async function composed (...newArgs) {
                let {scope, sym} = this;
                let localFuns = JSON.parse(funs);
                tracker(sym, 'composed command called', {oldSym, oldScope, funs});
                localFuns = weaver.syntax.descentSpecial(localFuns, newArgs, oldScope);
                tracker(sym, 'Arguments have been replaced', localFuns);
                let pipes = {
                    cmd : 'pipes',
                    args : funs,
                };
                tracker(sym, 'Running pipe formed by composition');
                let ret = await runCommand.call(scope, pipes, sym);   
                tracker(sym, 'composed command finished', ret);
                return ret;
            
            };
        } else if (cmd === 'compile') {
            let text = (args[0]) ? args[0].value : '';
            if ( (typeof text !== 'string' ) || (text === '') ) {
                tracker(sym, 'Compile called, but no understandable text', text);
                ret = ''; 
            } else {
                let codeParserName = (args[2]) ? args[2].value : 'up';
                tracker(sym, 'Parsing text for compile', {text, codeParserName});
                let codeParser = await weaver.waitForFunction('parsers', codeParserName, sym);
                let parsed = codeParser({text, type:'code', start: piece.start});
                tracker(sym, 'Text parsed for compile', parsed);
                let fakeFrag = (args[1] ? args[1].value : '#');
                let fakeName = weaver.syntax.getFullNodeName(fakeFrag, scope.context);
                let fakeScope = {fullname : fakeName };
                {
                    let bits = fakeName.split('::');
                    fakeScope.prefix = bits.shift();
                    bits = bits[0].split('/');
                    let last = bits.pop();
                    let lastbits = last.split(':');
                    bits.push(lastbits.shift()); // put main bit back after colon stripped
                    fakeScope.lv1only = bits.shift();
                    fakeScope.lv1 = fakeScope.prefix + '::' + fakeScope.lv1only;
                    fakeScope.majorname = fakeScope.lv1;
                    //warn if majorname and fullname are not the same. 
                }
            
                let node = {
                    pieces : parsed, 
                    scope : fakeScope
                };
                
                let vals; 
            
                let name = 'Fake Compile Name - ' + fakeName;
                tracker(sym, 'About to start compiling', name);
                vals = [];
                { 
                    let pieces = node.pieces;
                    let n = pieces.length;
                    for (let idx = 0; idx < n; idx += 1) {
                        let piece = pieces[idx];
                        if (has(piece, 'value') ) {
                            tracker(sym, 'Piece had value', piece.value);
                            vals.push(piece.value);
                            continue;
                        }
                        if  ( has(piece, 'cmd') )   {
                            let scope = makeScope({
                                tracking : 'creating piece ' + idx + ' of node ' + name, 
                                context : node, 
                                top : piece }
                            );
                            tracker(sym, 'Calling command on piece', [idx, piece]);
                            let val = await runCommand.call(scope, piece, sym);
                            if ( (piece.indent) && ( typeof val === 'string') ) {
                                val  = val.replace(/\n/g, piece.indent );
                            }
                            tracker(sym, 'Command finished', [idx, val] ); 
                            piece.value = val;
                            vals.push(piece.val);
                            continue;
                        }
                        tracker.fail(sym, 'Piece found without a value or cmd property', idx);
                        piece.value = '';
                        vals.push('');
                        break;
                    }
                }
            
                tracker(sym, 'Compiling done', vals);
                ret = vals.join(''); //no transform; if make a nicer version in transform then use that
            
            }
        } else if (cmd === 'log') {
            tracker(sym, 'logging arguments');
            env.log('Log:' + args.join('\n---\n') + '\n', 5, args); 
            ret = args[0];
        } else { 
            if ( (cmd.length > 1) && (cmd[cmd.length-1] === '*') ) {
                let f = async function seq (ind) {
                    let arg = seq.args[ind];
                    let ret; 
                    if (arg) {
                        if (has(arg, 'value') ) {
                            ret = arg.value;
                        } else {
                            tracker(sym, 'Running sequence command', [ind, arg]);
                            ret = (await runCommand.call(scope, arg, sym)); 
                        }
                    }
                    tracker(sym,'Sequence value', [ind, ret]); 
                    return ret;  //if no arg, ret is undefined intentionally
                };
                f.args = args;
                args = [{value : f}];
            } 
            let comm = await weaver.waitForFunction('commands', cmd, sym);
            tracker(sym, 'Process command arguments');
            let argProcessor = makeArgProcessor(scope, sym);
            let actualArgs = [];
            let n = args.length;
            for (let i = 0; i < n; i += 1) {
                let arg = await argProcessor(args[i], i);
                actualArgs.push(arg);
            }
            actualArgs = actualArgs.filter( (el => (typeof el !== 'undefined')  ) ); 
            piece.actualArgs = actualArgs;
            tracker(sym, 'Ready to run command', actualArgs);
            ret = await comm.apply({sym, tracker, scope }, actualArgs ); 
        }
        tracker(sym, 'Command finished', ret);
        if (override) {
            ret = override.value;
            tracker(sym, 'Overriding result, using previous pipe input', ret);
        } 
        piece.value = ret;
        return ret;
    };
    const makeScope = function (obj = {}) {
        obj.tracking = obj.tracking || '';
        obj.context = obj.context || {};
        obj.vars = obj.vars || {}; //for using to store stuff in shared context. 
        obj.top = obj.top || {}; //the top piece of a piece chain
        return obj;
    };
    weaver.syntax = {
        descentSpecial : function descentSpecial (arr, args, scope) {
            return arr.reduce( (ret, piece) => {
                if (has(piece, 'value') ) { //base case
                    let val = piece.value;
                    if ( (typeof val === 'string') && (val[0] === '$') ) {
                        piece.special = val;
                        val = val.slice(1);
                        if (val.match(/\.\./) ) { //splicing
                            let splice = val.split('..').map((el) => parseInt(el, 10) );
                            let start = splice[0] || 0;
                            let end = splice[1] || args.length;
                            args.slice(start, end).forEach( (el, idx) => {
                                el.special = val + ':' + (start + idx);
                                ret.push(el); 
                            });
                            return ret;
                        } 
        
                        if (val[0] === '$') { //escape
                            piece.value = val; //dropped one dollar sign
                        } else if (val.match(/[1-9][0-9]*/) ) {
                            let arg =  args[val];
                            if (arg) {
                                piece = arg;
                                piece.special = val;
                            } else {    
                                piece.value = null;
                                piece.special = 'no such arg given:' + val;
                            }
                        } else {
                            piece.value = scope[val];
                        }
                    }
                } else if (has(piece, 'args') ) { //descend
                    piece.args = descentSpecial(piece.args, args, scope);
                    ret.push(piece);
                } 
                ret.push(piece);
                return ret;
            }, []);
        },
        getFullNodeName : function getFullNodeName (frag, curNode) {
            if (has(curNode, 'scope') ) {
                curNode = curNode.scope;
            }
            if (frag === '::') {
                return curNode.prefix + '::^';
            }
            if (frag === ':') {
                return curNode.majorname;
            }
            if (frag === '#') {
                return curNode.lv1;
            }
            if (frag === '#:') {
                return curNode.fullname;
            }
            if (frag[0] === ':') {
                return curNode.majorname + frag;
            }
            if (frag.slice(0,2) === '#:') {
                return curNode.lv1 + frag.slice(1);
            }
            if (frag.slice(0,3) === '../') {
                if (frag.slice(3,6) === '../') {
                    return curNode.lv1 + frag.slice(6);
                } else if (curNode.lv3) {
                    return curNode.lv2 + frag.slice(3);
                } else {
                    return curNode.lv1 + frag.slice(3);
                }
            }
            if (frag.indexOf('::') === -1) {
                return (curNode.prefix || '') + '::' + frag;
            }
        
            return frag;
        }
    };

    weaver.promiseLabels = {
        'parsers' : 'P',
        'directives' : 'D',
        'commands' : 'C',
        'nodes' : 'N'
    };
    
    //external api, probably should make read only
    weaver.waitForFunction = async function waitForFunction ( type, name, sym) {
        let f = weaver.v[type][name]; 
        if (!f) {
            let prr = weaver.p[type][name];
            if (!prr) {
                prr = makePromise(type, name);
                weaver.p[type][name] = prr;
            }
            if (typeof sym !== 'undefined') {
                tracker.add(prr.sym, 'Waiting for function', sym);
                tracker(sym, `Waiting for definition of ${type}`, name);
            }
            f = await prr.prom;
        }
        return f;
    };
    weaver.addCommands = function (commands = {}, prefix='') {
        let weCommands = weaver.v.commands;
        let weWait = weaver.p.commands;
        Object.keys(commands).forEach( (key) => {
            const name = prefix + key;
            const old = weCommands[name];
            const comm = commands[key];
            if (old && old.original !== comm.toString() ) {
                tracker('Reassigning command name', {
                    name, oldF: old.toString(), newF:comm.toString()
                });
                throw new Error('Reassigning command ' + name );
            }
            tracker('adding new command', {name});
            let f = weCommands[name] = comm;
            let prom = weWait[name];
            if (prom) {
                prom.resolve(f);
            }
        });
    
    }   ;
    weaver.addDirectives =  function (directives = {}, prefix='') {
        let weDirectives = weaver.v.directives;
        let weWait = weaver.p.directives;
        Object.keys(directives).forEach( (key) => {
            const name = prefix + key;
            const old = weDirectives[name];
            const dire = directives[key];
            if (old && old.original !== dire.toString() ) {
                tracker('Reassigning directive name', {
                    name, oldF: old.toString(), newF:dire.toString()
                });
                throw new Error('Reassigning directive ' + name );
            }
            tracker('adding new directive', {name});
            let f = weDirectives[name] = dire;
            let prom = weWait[name];
            if (prom) {
                prom.resolve(f);
            }
        });
    
    }   ;
    weaver.addParsers = function (parsers = {}, prefix='') {
        let weParsers = weaver.v.parsers;
        let weWait = weaver.p.parsers;
        Object.keys(parsers).forEach( (key) => {
            const name = prefix + key;
            const old = weParsers[name];
            const pars = parsers[key];
            if (old && old.original !== pars.toString() ) {
                tracker('Reassigning parser name', {
                    name, oldF: old.toString(), newF:pars.toString()
                });
                throw new Error('Reassigning parser ' + name );
            }
            tracker('adding new parser', {name});
            let f = weParsers[name] = pars;
            let prom = weWait[name];
            if (prom) {
                prom.resolve(f);
            }
        });
    
    }   ;
    weaver.runDirective = async function runDirective (name, data, parSym) {
        let {
            tracking=`directive ${name} from ${data.scope.fullname}`,
            args = [],
            target = '',
            src = ''
        } = data;
        let id =`${name}:${src}=>${target}`; 
        const {sym} = tracker.new(id, 'Directive queued', {name, data});
        tracker.add(sym, 'Directive needed', parSym);
        let dire = await weaver.waitForFunction('directives', name, sym);
    
        let scope = makeScope({tracking, context : data});
        let argProcessor = makeArgProcessor(scope, sym);
        tracker(sym, 'Processing directive arguments');
        try {
            let actualArgs = [];
            let n = args.length;
            for (let i = 0; i < n; i += 1) {
                let arg = await argProcessor(args[i], i);
                actualArgs.push(arg);
            }
            actualArgs = actualArgs.filter( (el => (typeof el !== 'undefined')  ) ); 
            data.actualArgs = actualArgs;
            tracker(sym, 'Running directive', { actualArgs });
            let ret = await dire.call({env, weaver, scope, tracker,sym}, {src, target, args:actualArgs});
            data.value = ret;
            //weaver.full(data);
            tracker.done(sym, 'directive done', ret);
            return ret;
        } catch (e) {
            tracker.fail(sym, 'Directive had an error', e);
            e.message = e.message + `Directive ${name} had an error`;
            throw e; 
        }
    };
    weaver.addPieces = async function processWeb (collective, parSym) {
        let {web = {}, directives = [] } = collective; 
        delete collective.web;
        delete collective.directives;
        let {sym} = tracker.new(
            collective, 
            'Processing of web and directives started',
            {web, directives}
        );
        tracker.add(sym, 'Web parent', parSym);
    
        let dproms = Promise.all( directives.map( async function processDir (d) {
            tracker(sym, 'Directive called', d);
            let prom = weaver.runDirective.call(d.scope, d.directive, d, sym);
            let v = await prom;
            tracker(sym, 'Directive finished', [d,v]);
            return [d,v];
        }));
        dproms.then( () => {
            tracker(sym, 'All listed directives called');
        }).catch( (rej) => {
            tracker.fail(sym, 'Directive calling went bad', rej);
        });
    
        const names = Object.keys(web);
        const wvWeb = weaver.v.web;
        const prWeb = weaver.p.web;
        let proms = Promise.all(names.map( async function (name) {
            let node = web[name];
            let vals; // local to piece values
            let prr = prWeb[name];
            if (!prr) {
                prr = prWeb[name] = makePromise('nodes', name);
            }
            let nSym = prr.sym;
            tracker.self(nSym, 'Starting to process node', node); 
            if (has(node,'pieces')) {
                let sym = nSym; // for make promise piece to use
                tracker(sym, 'About to start computing values for the code');
                vals = [];
                { 
                    let pieces = node.pieces;
                    let n = pieces.length;
                    for (let idx = 0; idx < n; idx += 1) {
                        let piece = pieces[idx];
                        if (has(piece, 'value') ) {
                            tracker(sym, 'Piece had value', piece.value);
                            vals.push(piece.value);
                            continue;
                        }
                        if  ( has(piece, 'cmd') )   {
                            let scope = makeScope({
                                tracking : 'creating piece ' + idx + ' of node ' + name, 
                                context : node, 
                                top : piece }
                            );
                            tracker(sym, 'Calling command on piece', [idx, piece]);
                            let val = await runCommand.call(scope, piece, sym);
                            if ( (piece.indent) && ( typeof val === 'string') ) {
                                val  = val.replace(/\n/g, piece.indent );
                            }
                            tracker(sym, 'Command finished', [idx, val] ); 
                            piece.value = val;
                            vals.push(piece.val);
                            continue;
                        }
                        tracker.fail(sym, 'Piece found without a value or cmd property', idx);
                        piece.value = '';
                        vals.push('');
                        break;
                    }
                }
                tracker(sym, 'Node values computed', vals);
            } else {
                vals = [''];
                tracker(nSym, 'No code pieces to process');
            }
            tracker(nSym, 'About to transform the values', vals);
            vals = vals ||  [];
            if (vals.every( (el) => (typeof el === 'string') ) ){
                vals = vals.join('');
                tracker(nSym, 'Concatenated values', vals);
            }
            
            if (node.transform && node.transform.length > 0) {
                let n = node.transform.length;
                let scope = makeScope({
                    tracking : 'transforming value of ' + name,
                    context : web[name]
                });
                for (let i = 0; i < n; i += 1) {
                    let pipe = node.transform[i];
                    pipe.args.unshift( {
                        value : vals
                    });
                    tracker(nSym, 'Calling command in transform', pipe);
                    vals = (await runCommand.call(scope, pipe )).value;
                    tracker(nSym, 'Command in transform done', vals);
                }            
            } else if (typeof vals !== 'string') { //transform should deal with it
                //give warning of incompatible types
                // or we could give some useful version, such as jsoning for different types. 
                vals = vals.join('');
            }
            tracker(nSym, 'Transformation completed', vals);
            node.value = vals;
            prr.resolve(node.value);
            if (has(wvWeb, name) ) {
                let oldNode = wvWeb[name];
                if (oldNode.value === node.value) {
                    tracker.done(nSym, 'redundant node compilation', oldNode); 
                } else {
                    tracker.fail(nSym, 'different node values with same name', oldNode);
                    throw new Error(`Conflicting node values for  ${name}`);
                }
            } else {
                wvWeb[name] = node;
                tracker.done(nSym, `Node stored`);
            }
            tracker(sym, 'node done', [name, node.value]);
            return [name, node.value];
        }));
        proms.then( () => {
            tracker(sym, 'All listed nodes processed');
        }).catch( (rej) => {
            tracker.fail(sym, 'Node processing went bad', rej);
        });
        try {
            let [dirDone, webDone] = await Promise.all([dproms, proms]);
            let me = tracker.done(sym, 'Web and directives done');
            return {tracked:me, directives: dirDone, web: webDone};
        } catch (e) {
            return {tracked:tracker.get(sym)};
        }
    };
    weaver.parse = async function parse (text, prefix, textParserName, codeParserName, parSym) {
        let {sym} = tracker.new('Parsing:' + prefix, 'Retrieving parsers', [text.slice(0, 100),
            textParserName, codeParserName] );
        tracker.add(sym, 'Parsing begun', parSym);
        try {
            let textParser = await weaver.waitForFunction('parsers', textParserName, sym);
            let codeParser = await weaver.waitForFunction('parsers', codeParserName, sym);
    
            tracker(sym, 'About to parse text');
            let {web, directives} = textParser.call(weaver, text, {prefix, tracker: weaver.parseTracker});
            tracker(sym, 'Text parsing done', {web, directives});
    
            directives.forEach( (el) => {
                el.rawArgs = el.args;
                if (el.args) {
                    tracker(sym, 'Parsing directive', el);
                    let argPieces = codeParser.call(weaver, {text: el.args, type:'args', start : el.scope.sourcepos[0]});
                    el.args = argPieces;
                } else {
                    el.args = [];    
                }
                tracker(sym, 'Done parsing directive', el.args);
            });
            Object.keys(web).forEach( (name) => {
                tracker(sym, 'Processing code for node', name);
                const node = web[name];
                const code = node.code || [];
                node.pieces = code.reduce( (acc, el) => {
                    let {code, start} = el;
                    let pieces = codeParser.call(weaver, {text:code, type:'code', start});
                    el.pieces = pieces; // in case it is needed as reference
                    return acc.concat(pieces);
                }, []);
                tracker(sym, 'Processing transform for node', node.rawTransform);
                const transform = node.rawTransform || []; 
                node.transform = transform.reduce( (acc, el) => {
                    let [start, text] = el;
                    let pieces = codeParser.call(weaver, {text, type:'transform', start});
                    el.pieces = pieces;
                    return acc.concat(pieces);
                }, []);
                if (node.transform.length === 0) { delete node.transform;}
                tracker(sym, 'Done processing node', [node.pieces, node.transform]);
            });
            //weaver.full({web, directives});
            tracker.done(sym, 'Done parsing text and code');
            return {web, directives};
        } catch (e) {
            tracker.fail(sym, 'Parsing failed', e);
            return {web:{}, directives:{}};
        }
    };
    weaver.parseTracker = () => {};
    weaver.getNode = function getNode (nodeName, sym) {
        let weaver = this;
        let prr = weaver.p.web[nodeName];
        if (!prr) {
            prr = makePromise('N', nodeName);
            weaver.p.web[nodeName] = prr;
            let pSym = prr.sym;
            prr.prom.
                then( (res) => { tracker.done(pSym, 'Promise of node resolve', res);}).
                catch( (rej) => { tracker.fail(pSym, 'Promise failed', rej);});
        }
        if (sym) {
            tracker.add(prr.sym, 'New request for node', sym);
        } 
        return prr.prom;
    };
    weaver.run = async function run (loader) {
        let {directive} = loader;
        let {sym, scope} = tracker.new({scope:loader.scope}, 'Starting a new run', loader); 
        weaver.runDirective.call(scope, directive, loader, sym);
        let proms = env.promises;
        let n = 0;
        let count = 0;
        let limit = 3;
        let repeat = function repeat () {
            count += 1;
            return new Promise( (resolve) => setTimeout( resolve ) );
        };
        let promiseDone = function promiseDone () {
            n = proms.length;   
            count = 0;
            return Promise.all(proms);
        };
        while ( (n < proms.length) || count < limit) {
            if (n < proms.length) {
                await promiseDone();
                continue;
            }
            if (count < limit) {
                await repeat();
                continue;
            }
        }
        tracker.done(sym);
        let report = tracker.report();
        let unresolved = weaver.keyDiff(weaver.p, weaver.v);
        return {report, unresolved};
    };
    weaver.keyDiff = function keyDiff (larger, smaller) {
        return Object.keys(larger).
            reduce( (acc, heading) => {
                let smObj = smaller[heading];
                if (!smObj) {
                    return acc;
                }
                let smKeys = Object.keys(smObj);
                let laKeys = Object.keys(larger[heading]);
                acc[heading] = laKeys.filter( (key) => !smKeys.includes(key) );
                if (acc[heading].length === 0) { delete acc[heading];}
                return acc;
            }, {});
    };
    weaver.twoLevelCopy = function copy (obj) {
        Object.keys(obj).
            reduce( (acc, heading) => {
                acc[heading] = Object.assign({}, obj[heading]);
                return acc;
            });
    };


    weaver.v.commands.nodekeys = function nodeKeys (...args) {
        let context = this.context;
        return args.reduce( (list, filter) => {
            let f = (function (filter) {
                let prefix, lv1, lv2, lv3, lv4;
            
                let ind = filter.indexOf('::');
                if ( (ind !== -1) && (filter[0] !== '#') ) {
                    let preReg = new RegExp(filter.slice(0, ind));
                    prefix = function (c) {
                        return preReg.test(c.prefix);
                    };
                    filter = filter.slice(ind+2);
                } else { 
                    let preStr = context.prefix;
                    prefix = function (c) {
                        return (c.prefix.indexOf(preStr) !== -1);
                    };
                }
                ind = filter.indexOf(':');
                if (ind !== -1) {
                    let lv4Reg = filter.slice(ind+1);
                    filter = filter.slice(0,ind);
                    if (lv4Reg === '#') {
                        lv4Reg = context.lv4;
                        lv4 = function (c) {
                            return (c.lv4.indexOf(lv4Reg) !== -1);
                        };
                    } else {
                        lv4Reg = new RegExp(lv4Reg);
                        lv4 = function (c) {
                            return lv4Reg.test(c.lv4);
                        };
                    }
                } else {
                    lv4 = function (c) {
                        return !(has(c, 'lv4'));
                    };
                }
                ind = filter.indexOf('/');
                if (ind !== -1) {
                    let scndInd = filter.indexOf('/', ind+1);
                    if (scndInd !== -1) {
                        let lv2Reg = filter.slice(ind+1, scndInd);
                        let lv3Reg = filter.slice(scndInd+1);
                        filter = filter.slice(0,ind);
                        if (lv2Reg === '#') {
                            lv2Reg = context.lv2;
                            lv2 = function (c) {
                                return (c.lv2.indexOf(lv2Reg) !== -1);
                            };
                        } else {
                            lv2Reg = new RegExp(lv2Reg);
                            lv2 = function (c) {
                                return lv2Reg.test(c.lv2);
                            };
                        }
                        if (lv3Reg === '#') {
                            lv3Reg = context.lv3;
                            lv3 = function (c) {
                                return (c.lv3.indexOf(lv3Reg) !== -1);
                            };
                        } else {
                            lv3Reg = new RegExp(lv3Reg);
                            lv3 = function (c) {
                                return lv3Reg.test(c.lv3);
                            };
                        }
                    } else {
                        let lv2Reg = filter.slice(ind+1);
                        filter = filter.slice(0,ind);
                        if (lv2Reg === '#') {
                            lv2Reg = context.lv2;
                            lv2 = function (c) {
                                return (c.lv2.indexOf(lv2Reg) !== -1);
                            };
                        } else {
                            lv2Reg = new RegExp(lv2Reg);
                            lv2 = function (c) {
                                return lv2Reg.test(c.lv2);
                            };
                        }
                        lv3 = function (c) {
                            return !(has(c, 'lv3'));
                        };
                    }
                } else {
                    lv3 = function (c) {
                        return !(has(c, 'lv3'));
                    };
                    lv2 = function (c) {
                        return !(has(c, 'lv2'));
                    };
                }
                if (filter) {
                    if (filter === '#') {
                        let lv1Str = context.lv1only;
                        lv1 = function (c) {
                            return (c.lv1only.indexOf(lv1Str) !== -1);
                        };
                    }
                } else {
                    lv1 = function () {
                        return true;
                    };
                }
            
                return function (name) {
                    let c = weaver.v.web[name].scope;
                    return (prefix(c) && lv4(c) && lv3(c) && lv2(c) && lv1(c));
                };
            })(filter);
            return list.filter( (name) => {
                return f(name);
            });
        }, Object.keys(weaver.v.web) );
    };

    

    return weaver;
};
let organs = {
    commands : {
        //@echo: arg1, arg2, ... -> last arg
        echo : async function echo (...args) {
            if (args.length === 0) { return ; }
            return args[args.length-1];
        },
        //@sub: old,new, old, new, ..
        sub : async function sub (text, ...args) {
            if (typeof text !== 'string') {
                throw Error('cmd sub: requires text to operate on');
            }
            let n = args.length;
            let i = 0;
            while (i < n) {
                let el = args[i];
                if (Array.isArray(el) ) {
                    text = text.replace(el[0], el[1]);
                    i += 1;
                    continue;
                }
                if (typeof el !== 'string') {
                    throw Error(`cmd sub: string required for matching ${el}`);
                }
                let rep = args[i+1];
                if (typeof rep !== 'string') {
                    throw Error(`cmd sub : string required for replacement ${el} to be replaced with ${rep}`);
                }
                text = text.split(el).join(rep);
                i += 2;
            }
            return text;
        },
        //@indent : text, space -> text [modifies indent on main object]
        indent : async function indent (text, space) {
            if (typeof space === 'number') {
                let kind = ' ';
                if (space < 0 ) {
                    kind  = "\t";
                    space = -1*space;
                }
                let temp = '\n';
                for (let i = 0; i < space; i += 1) {
                    temp += kind;
                }
                space = temp;
            } 
            if (typeof space === 'string') {
                space = space.split("\\t").join('\t');
            }
            this.top.indent = space;
            return text;
        },
        //@math : type, expression
        math : async function (type, expression) {
            if (type !== 'js:eval') {
                //emit a warning
            }
            let num = 1*expression; //number conversion
            if ( num !== num) {  //NaN test
                return eval(expression);
            } else {
                return num;
            }
        }
    },
    directives : {
        save : async function save ({src, target, args}) {
            const {env, weaver, scope, tracker, sym} = this;
            try{
                let [f, encoding] = args;
                let name = weaver.syntax.getFullNodeName(src, scope.context.scope, sym);
                tracker(sym, 'Save waiting for node', {src, name, target});
                let data = await weaver.getNode(name, sym);
                tracker(sym, 'Node for save received', data);
                if (typeof f === 'function') {
                    tracker(sym, 'Transforming save data', f);
                    data = (await f.call(scope, data, sym)).value;
                    tracker(sym, 'Done transforming save data', data);
                } else {
                    encoding = f;
                }
                encoding = (typeof encoding === 'string') ? encoding : 'utf8';
                tracker(sym, 'Saving file', {encoding, target});
                let out = await env.write(target, data, encoding);
                tracker.done(sym, 'Successfully saved file', out);
                return out;
            } catch (e) {
                tracker.fail(sym, 'Save failed', e);
            }
        },
        load : async function load ({src, target, args}) {
            const {env, weaver, scope, tracker, sym} = this;
            try {
        
                const options = args[0] || {};
                const encoding = options.encoding || 'utf8';
                let extension = options.extension;
                let underpipes = options.underpipes || 'up';
        
                tracker(sym, 'About to read file', {src, encoding});
                let text = await env.read(src, encoding);
                tracker(sym, 'Read file', text );
                if (options.middle) {
                    tracker(sym, 'Processing middle', options.middle);
                    text = await options.middle.call({env, weaver, scope, src,
                        target}, text);
                    tracker(sym, 'Middle done', text);
                }
                target = target || src;
                if (!extension) {
                    let ind = src.lastIndexOf('.');
                    let slash = src.lastIndexOf(env.path.sep);
                    if (ind > 0 && ind > slash ) {
                        extension = src.slice(ind+1);
                    }
                }
                extension = extension || 'md';
                tracker(sym, 'Extension determined', extension);
                tracker(sym, 'Initiating parsing', target);
                let nodes = await weaver.parse(text, target, extension, underpipes, sym);
                nodes.id = `Web: ${target}`; 
                tracker(sym, 'Parsed. Will execute', nodes);
                let ret = await weaver.addPieces(nodes, sym);
                tracker(sym, 'Pieces Processed', ret);
                if (options.done) {
                    tracker(sym, 'Post-processing started', options.done);
                    let res = await options.done({env, weaver, scope, src, target, text}, ret);
                    tracker(sym, 'Post-processing done', res);
                }
                return ret; // useful for top level loading
            } catch (e) {
                tracker.fail(sym, 'Failed to load', e);
                return {};
            }
        
        }
    },
    parsers : {},
    externals : {},
    env
};

{ 
    let cmparse;
    let commonmark = require('commonmark');
    let commonParsingDirectives = {
        eval : function (data) {
            let webNode = data.webNode;
            let localContext = this; //eslint-disable-line no-unused-vars
            let originalCode = webNode.code; //eslint-disable-line no-unused-vars
            let code = webNode.code.reduce( (acc, next) => {
                return acc + next[0];
            }, '');
            webNode.code = [];
            localContext.tracker("local directive evaling code", {webNode, code});
            eval(code);
        },
        scope : function ({target, scope}) {
            let ind = target.indexOf('=');
            if (ind === -1) {
                delete scope[target.trim()];
            } else {
                let vname = target.slice(0,ind).trim();
                let val = target.slice(ind+1);
                scope[vname] = val;
            }
        },
        report : function ({label, scope, webNode}) {
            this.tracker("commonmark parsing directive report", {label, scope,
                webNode}); 
        },
        prefix : function ({target, scope}) {
            if (target.slice(-2) === '::') {
                target = target.slice(0,-2);
            }
            if (target) {
                scope.prefix = target;
            } else {
                scope.prefix = this.originalPrefix;
            }
        }
    };
    
    cmparse = function cmparse (text, {
        prefix = '',
        origin = '', //filepath
        tracker = (...args) => {console.log(args); }, 
        parsingDirectives = {}} = {})
    {
        tracker('commonmark parsing about to begin', {prefix, text});
        
        parsingDirectives = Object.assign({}, commonParsingDirectives,
            parsingDirectives);
    
        const originalPrefix = prefix;
        let scope = { prefix, origin};
    
        let lineNumbering = ( function (text) {
            let lines = [0];
            let len = text.length;
            let ind = text.indexOf('\n', 0);
            while (ind !== -1) {
                ind = ind + 1;
                lines.push(ind);
                if (ind >= len) { 
                    break;
                }
                ind = text.indexOf('\n',ind);
            }
            return function ([line, col]) {
                return [line, col, lines[line-1] + col-1]; 
            };
        })(text);
        let web = {};
        let directives = [];
        let htext = false;
        let ltext = false;
        let webNode;
    
        let event;
    
        let localContext = {originalPrefix, tracker, lineNumbering, web, parsingDirectives, event, directives};
    
    
        let reader = new commonmark.Parser();
        let parsed = reader.parse(text);
    
        let walker = parsed.walker();
    
        while ( ( event = walker.next()) ) {
            let node = event.node;
    
            tracker("commonmark node found", {type: node.type, literal : node.literal || '', destination: node.destination|| '', title : node.title|| '', info: node.info|| '', level: node.level|| '', sourcepos: node.sourcepos, entering: event.entering});
            
            let entering = event.entering;
            if (node.sourcepos)  { 
                scope.sourcepos = [ lineNumbering(node.sourcepos[0]),
                    lineNumbering(node.sourcepos[1]) ];
            }
    
            let ty = node.type;
            if (ty === 'text') {
                if (htext) {
                    htext.push(node.literal);
                }
                if (ltext) {
                    ltext.push(node.literal);
                }
            } else if (ty === 'link') {
                if (entering) {
                    ltext = [];
                } else {
                    let title, href, ind; // links
                
                    href = node.destination;
                    if (href === "#%5E") {
                        href = "#^";
                    }
                    title = node.title;
                    ltext = ltext.join('').trim();
                    
                    if (title) {
                        title = title.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
                    }   
                    if ((!href) && (!title)) { //pipeless switch
                        let sourcepos = scope.sourcepos;
                        {
                            let end = sourcepos[0];//start of the link
                            let cur = webNode.raw[webNode.raw.length-1];
                            let begin = cur[0][2];
                            cur[1] = text.slice(begin, end[2]);
                            cur[2] = end;
                        }
                        
                        let name = ltext.
                            trim().
                            toLowerCase().
                            replace(/\s+/g, ' ');
                        let transform;
                        if (title) { //colon starts
                            title = title.slice(1);
                            let ind = text.slice(sourcepos[0][2], sourcepos[1][2]).
                                search(/('|"):/);
                            let transStart = lineNumbering([sourcepos[0][0],
                                sourcepos[0][1]+ind]);
                            let transText = title.trim();
                            if (transText) {
                                transform = [transStart, transText];
                            }
                        } 
                        
                        scope.minor = name;
                        let fullname = scope.fullname = scope.majorname + ':' + name;
                        
                        if (has(web, fullname)) {
                            tracker('repeat minor found', {fullname});
                            webNode = web[fullname];
                            webNode.raw.push( [sourcepos[0]] );
                            if (transform) {
                                if (has(webNode, 'rawTransform') ) {
                                    webNode.rawTransform.push(transform);
                                } else {
                                    webNode.rawTransform = [transform];
                                }
                            }
                        } else {
                            tracker('new minor found', {fullname});
                            webNode = web[fullname] = {
                                name, 
                                raw : [ [sourcepos[0]] ],
                                code : [],
                                scope : Object.assign({}, scope)
                            };
                            if (transform) {
                                webNode.rawTransform = [transform];
                            }
                        }
                    } else if (title[0] === ":") { 
                        if  ( (ltext[0] === '|') || ( ltext.length === 0) ) { //transform
                            webNode.rawTransform.push([scope.sourcepos[0], ltext + '|' + title.slice(1)]); 
                        } else if (ltext[0] === "=") { //store directive
                            let data = {
                                directive : 'store',
                                args : title.slice(1),
                                src:href,
                                target : ltext.slice(1),
                                scope : Object.assign({}, scope)
                            };
                            
                            tracker("directive call found", data);
                            directives.push(data);
                        } else { // switch
                            let sourcepos = scope.sourcepos;
                            {
                                let end = sourcepos[0];//start of the link
                                let cur = webNode.raw[webNode.raw.length-1];
                                let begin = cur[0][2];
                                cur[1] = text.slice(begin, end[2]);
                                cur[2] = end;
                            }
                            
                            let name = ltext.
                                trim().
                                toLowerCase().
                                replace(/\s+/g, ' ');
                            let transform;
                            if (title) { //colon starts
                                title = title.slice(1);
                                let ind = text.slice(sourcepos[0][2], sourcepos[1][2]).
                                    search(/('|"):/);
                                let transStart = lineNumbering([sourcepos[0][0],
                                    sourcepos[0][1]+ind]);
                                let transText = title.trim();
                                if (transText) {
                                    transform = [transStart, transText];
                                }
                            } 
                            
                            scope.minor = name;
                            let fullname = scope.fullname = scope.majorname + ':' + name;
                            
                            if (has(web, fullname)) {
                                tracker('repeat minor found', {fullname});
                                webNode = web[fullname];
                                webNode.raw.push( [sourcepos[0]] );
                                if (transform) {
                                    if (has(webNode, 'rawTransform') ) {
                                        webNode.rawTransform.push(transform);
                                    } else {
                                        webNode.rawTransform = [transform];
                                    }
                                }
                            } else {
                                tracker('new minor found', {fullname});
                                webNode = web[fullname] = {
                                    name, 
                                    raw : [ [sourcepos[0]] ],
                                    code : [],
                                    scope : Object.assign({}, scope)
                                };
                                if (transform) {
                                    webNode.rawTransform = [transform];
                                }
                            }
                        }
                    } else if (href[0] === '!') { //parse directive
                        let directive = href.slice(1).
                            trim().
                            toLowerCase();
                        let args = title;
                        let target = ltext;
                        let data = {args, target, scope, context:webNode};
                        tracker("calling parse directive", {directive, data});
                        parsingDirectives[directive].call(localContext, data);
                        tracker("done with parse directive", {directive, scope, context : webNode});
                    } else if ( (ind = title.indexOf(":")) !== -1) { //compile directive
                        let data = {
                            directive : title.slice(0, ind).
                                trim().
                                toLowerCase().
                                replace(/\s+/g, ' '),
                            args : title.slice(ind+1),
                            src:href,
                            target : ltext,
                            scope : Object.assign({}, scope)
                        };
                        
                        tracker("directive call found", data);
                        directives.push(data);
                    }
                    ltext = false;
                }
            } else if (ty === 'code_block') {
                let lang = node.info || '';
                let code = node.literal || '';
                if (code[code.length -1] === "\n") {
                    code = code.slice(0,-1);
                }
                let sourcepos = scope.sourcepos;
                if (sourcepos[0][1] == 1) {
                    let start = sourcepos[0];
                    let end = sourcepos[1];
                    start = [start[0]+1, start[1]];
                    end = [end[0], 1];
                    sourcepos = [lineNumbering(start), lineNumbering(end)];
                }
                
                webNode.code.push( {code, lang, start:sourcepos[0], end:sourcepos[1]});
            } else if (ty === 'heading') {
                if (entering) {
                    htext = [];
                } else {
                    let sourcepos = scope.sourcepos;
                    {
                        let end = sourcepos[0];//start of this heading
                        let cur = webNode.raw[webNode.raw.length-1];
                        let begin = cur[0][2];
                        cur[1] = text.slice(begin, end[2]);
                        cur[2] = end;
                    }
                    
                    let heading = htext.join('');
                    let ind = heading.indexOf('|');
                    if (ind === -1) { ind = heading.length;}
                    let name = heading.slice(0, ind).
                        trim().
                        toLowerCase().
                        replace(/\s+/g, ' ');
                
                    let transStart = lineNumbering([scope.sourcepos[0][0],
                        scope.sourcepos[0][1]+ind]);
                    let transformText = heading.slice(ind).trim();
                    let transform;
                    if (transformText) {
                        transform = [transStart, transformText];
                    } 
                
                    let hlevel = node.level;
                    let fullname;
                    
                    if (hlevel == 5) {
                        delete scope.lv4;
                        delete scope.lv3;
                        scope.lv2 = name;
                        scope.majorname = scope.lv1 + '/' + scope.lv2; 
                    } else if (hlevel == 6) {
                        delete scope.lv4;
                        scope.lv2 = scope.lv2 || '';
                        scope.lv3 = name;
                        scope.majorname = scope.lv1 + '/' + scope.lv2 + '/' + scope.lv3; 
                    } else {
                        delete scope.lv4;
                        delete scope.lv3;
                        delete scope.lv2;
                        scope.lv1 = scope.prefix + '::' + name;
                        scope.lv1only = name;
                        scope.majorname = scope.lv1; 
                    }
                    scope.fullname = fullname = scope.majorname;
                    
                    if (has(web, fullname) ) {
                        tracker('repeat heading found', {fullname, heading});
                        webNode = web[fullname];
                        webNode.raw.push( [sourcepos[0]] );
                        if (transform) {
                            if (has(webNode, 'rawTransform') ) {
                                webNode.rawTransform.push(transform);
                            } else {
                                webNode.rawTransform = [transform];
                            }
                        }
                    } else {
                        tracker('new heading found', {fullname, heading});
                        webNode = web[fullname] = {
                            name, heading, 
                            raw : [ [sourcepos[0]] ],
                            code : [],
                            scope : Object.assign({}, scope)
                        };
                        if (transform) {
                            webNode.rawTransform = [transform];
                        }
                    }
                    
                    htext = false;
                }
            } else if (ty === 'document' && entering) {
                scope.lv1 = scope.prefix + '::^';
                scope.fullname = scope.majorname = scope.lv1; 
                scope.lv1only = '^';
                webNode = web[scope.fullname] = {
                    name : '^', heading:'^', 
                    raw : [ [scope.sourcepos[0]] ],
                    code : [],
                    scope : Object.assign({}, scope)
                };
            }
        }
    
        {//scope 
            let end = scope.sourcepos[1];
            let cur = webNode.raw[webNode.raw.length-1];
            let begin = cur[0][2];
            cur[1] = text.slice(begin, end[2]);
            cur[2] = end;
        }
    
        tracker('commonmark parsing done', {prefix, web, directives, text});
    
        return {web, directives};
    
    };
    organs.parsers.md = cmparse;
}

{
    let sw;
    sw = function scriptedwriting (text='', {
        prefix = '',
        firstName = 'abstract',
        current = [1,1, 0]
    } = {}) {
        let ret = {};
        let lines = [];
        let scope = {
            prefix,
            lv1 : prefix + '::' + firstName,
            lv1only : firstName,
        };
        scope.fullname = scope.lv1;
        scope.majorname = scope.fullname;
        let piece = {
            scope: Object.assign({sourcepos : [current.slice()]}, scope),
            code : []
        };
        let web = {};
        web[scope.fullname] = piece;
        ret.web = web;
        let directives = ret.directives = [];
        let ind = 0;
        let len = text.length;
        let start = current.slice();
        while (ind < len) {
            if (text[ind] === '\n') {
                if (text.slice(ind+1, ind+5) === '--- ') {
                    current = [current[0]+1, 1, ind+1];
                    lines.push(current.slice());
                    let end = current.slice();
                    piece.code.push( {code: text.slice(start[2], end[2]).trim(), start, end, lang:''});
                    
                    ind += 5; 
                    
                    let name, transform, directive;
                    current = [current[0], current[1] + ind - current[2], ind];
                    let nameStart = current.slice()[2]; // only need it for slicing; no tracking
                    let transStart, transEnd, direStart, direEnd;
                    ind -= 1;
                    while (ind < len) {
                        ind += 1;
                        if ( (!transStart ) && (text[ind] === '|') ) {
                            name = text.slice(nameStart, ind).trim().toLowerCase();
                            ind +=1;
                            current = [current[0], current[1] + ind - current[2], ind];
                            transStart = current.slice();
                        } else if (text.slice(ind, ind+3) === ':=>') {
                            ind -=1;
                            if (!transStart) {
                                name = text.slice(nameStart, ind).trim().toLowerCase();
                            } 
                            current = [current[0], current[1] + ind - current[2], ind];
                            transEnd = current.slice();
                            if (transStart) {
                                transform = [
                                    transStart, 
                                    text.slice(transStart[2], transEnd[2]+1).trim()
                                ];
                            } else {
                                transStart = transEnd; 
                            }
                            ind +=1+3; //get past :=>
                            current = [current[0], current[1] + ind - current[2], ind];
                            direStart = current.slice();
                            ind -=1;
                        } else if (text[ind] === '\n' || ind >= text.length) {
                            current = [current[0], current[1] + ind - current[2], ind];
                            if (!transStart) {
                                name = text.slice(nameStart, ind).trim().toLowerCase();
                                transStart = transEnd = current.slice();
                            }
                            if (!direStart) {
                                direStart = current.slice();
                            }
                            ind -= 1;
                            direEnd = current.slice();
                            directive = [
                                text.slice(direStart[2], direEnd[2]+1).trim(),
                                direStart, direEnd
                            ];
                            if (name) {
                                let reg = /([^:/]*::)?([^:/]+)?(\/[^:/]*)?(\/[^:/]*)?(:.*)?/;
                                let match = reg.exec(name); //match can't fail as far as I know
                                if (match[1]) {
                                    scope.prefix = match[1].slice(0, -2);
                                    delete scope.lv1only;
                                    delete scope.lv1;
                                    delete scope.lv2;
                                    delete scope.lv3;
                                    delete scope.lv4;
                                    scope.fullname = scope.majorname = scope.prefix;
                                }
                                if (match[2]) {
                                    scope.lv1only = match[2];
                                    scope.lv1  = prefix + '::' + scope.lv1only;
                                    delete scope.lv2;
                                    delete scope.lv3;
                                    delete scope.lv4;
                                    scope.fullname = scope.majorname = scope.lv1;
                                }
                                if (match[3]) {
                                    scope.lv2  = match[3].slice(1);
                                    delete scope.lv3;
                                    delete scope.lv4;
                                    scope.fullname = scope.majorname = scope.fullname + '/' + scope.lv2;
                                }
                                if (match[4]) {
                                    scope.lv3 = match[4].slice(1);
                                    delete scope.lv4;
                                    scope.fullname = scope.majorname = scope.fullname + '/' + scope.lv3;
                                }
                                if (match[5]) {
                                    scope.lv4 = match[5].slice(1);
                                    scope.fullname = scope.majorname + ':' + scope.lv4;
                                }
                            } 
                            if (directive[0]) {
                                let chunk = directive[0];
                                let reg = /^\s*(\S+)(?:\s*$|\s+(\S+)(?:\s*$|\s+(.+$)))/;
                                let match = reg.exec(chunk);
                                if (match) {
                                    directive[0] = {
                                        directive : match[1],
                                        src : name ||scope.fullname,
                                        target : (match[2] || ''),
                                        args : (match[3] || ''),
                                        scope : Object.assign({}, scope)
                                    };
                                } else {
                                    //some error reporting of directive? 
                                    console.log('failed to parse directive: ' +
                                        current.slice().join(',') + ' : ' + chunk
                                    );
                                }
                            }
                            ind +=1; //now pointing to newline
                            break;
                        }
                    }
                    current = [current[0]+1, 1, ind+1];
                    lines.push(current.slice());
                    start = current.slice();
                    
                    let fullname = scope.fullname;
                        
                    if (name ) {
                        if (has(web, fullname) ) {
                            piece = web[fullname];
                            scope = web.scope;
                            scope.sourcepos.push(start);
                        } else {
                            piece = web[fullname] = {
                                code:[], 
                                scope : Object.assign({ sourcepos: [start]}, scope)
                            };
                        }
                    } else {
                        piece = {
                            scope : Object.assign({}, scope, { sourcepos: [start]}),
                            code:[]
                        };
                    }
                    
                    if (transform && transform[1]) {
                        if (has(piece,'rawTransform') ) {
                            piece.rawTransform.push(transform);
                        } else {
                            piece.rawTransform = [transform];
                        }
                    }
                    if (directive[0]) {
                        directive[0].scope = Object.assign({}, directive[0].scope,
                            {start:directive[1], end:directive[2]});
                        directives.push(directive[0]);
                    }
                    continue;
                } else {
                    current = [current[0]+1, 1, ind+1];
                    lines.push(current.slice());
                }
            }
            ind +=1;
        }
        current[1] = 1+ ind - current[2]; //get column
        piece.code.push( {code: text.slice(start[2], ind).trim(), start, end:current.slice(), lang:''});
        return ret; 
    
    };
    organs.parsers.pfp = sw;
}

{
    let cta;
    {
        let par = '('; let cpar = ')';
        let bra = '{'; let cbra = '}'; //eslint-disable-line no-unused-vars
        let squ = '['; let csqu = ']'; //eslint-disable-line no-unused-vars
        
        let defTypeFirst = {
            "'" : function rawQuote (p) {
                let value;
                let start = p.ind;
                let end = p.text.indexOf("'", p.ind);
                if (end === -1) {
                    end = p.text.length-1;
                    value =  p.text.slice(p.ind);
                    let info = {start: p.f.ln(start), end : p.f.ln(end), value};
                    p.f.tracker('unterminated quote', info);
                    throw new Error('unterminated quoted:' + info.start + ':' + value);
                }
                value = p.text.slice(p.ind, end);
                p.ind = end+1;
                return {
                    start: p.f.ln(start),
                    end: p.f.ln(end),
                    value 
                };
            },
            '"' : function parseBackSlash (p) {
                let start = p.ind;
                let end, value; 
                let reg = /[\\]*"/g;
                reg.lastIndex = p.ind;
                let len = p.text.length;
                while (reg.lastIndex < len) {
                    let match = reg.exec(p.text);
                    if (match) {
                        if ( (match[0].length % 2) === 0 ) { //escaped
                            continue;
                        } else { // quote found
                            end = reg.lastIndex-1;
                            value = eval('"' + p.text.slice(p.ind,reg.lastIndex));
                            p.ind = reg.lastIndex;
                            return {
                                start: p.f.ln(start),
                                end: p.f.ln(end),
                                value 
                            };
                        }
                    } else { //no matching quote
                        end = len;
                        value = p.text.slice(p.ind);
                        let info = {start: p.f.ln(start), end : p.f.ln(end), value};
                        p.f.tracker('unterminated quote', info);
                        throw new Error('unterminated quoted:' + info.start + ':' + value);
                    }
                }
                throw new Error('internal error at parseBackSlash; unreachable point reached');
            },
            '`' : function parseBackTick (p) {
                let start = p.ind;
                let end, args;
                let cmd = 'backtick';
                let bind = 1;
                let reg = /[\\]*`/g;
                reg.lastIndex = p.ind;
                let len = p.text.length;
                while (reg.lastIndex < len) {
                    let match = reg.exec(p.text);
                    if (match) {
                        if ( (match[0].length % 2) === 0 ) { //escaped
                            continue;
                        } else { // quote found
                            end = reg.lastIndex-1;
                            args = [{value:p.text.slice(p.ind, reg.lastIndex-1)}];
                            p.ind = reg.lastIndex;
                            return {
                                start: p.f.ln(start),
                                end: p.f.ln(end),
                                cmd, bind, args
                            };
                        }
                    } else { //no matching quote
                        end = len;
                        let value = p.text.slice(p.ind);
                        let info = {start: p.f.ln(start), end : p.f.ln(end), value};
                        p.f.tracker('unterminated quote', info);
                        throw new Error('unterminated quoted:' + info.start + ':' + value);
                    }
                }
                throw new Error('internal error at parseBackSlash; unreachable point reached');
            },
            '\u005f' : function parseGet (p, terminator) {
                let start = p.ind;
                if (p.q.test(p.text[p.ind])) {
                    let quote = p.text[p.ind];
                    p.ind += 1 ;
                    let piece = p.f.toTerminator(p, 'code', quote); 
                    return piece;
                }
                p.ind = p.f.findFirst(p, '|' + terminator)[1];
                let args = [{value: p.f.norm(p.text.slice(start, p.ind))}];
                let cmd = 'get';
                let bind = true;
                let end = p.ind-1;
                return {
                    start: p.f.ln(start),
                    end: p.f.ln(end),
                    cmd, bind, args
                };
            },
            '!' : function parseCmd (p, terminator) {
                let cmd, bind;
                let start = p.ind;
                let args = p.f.textArgs(p, terminator);
                let cmdName = args.shift();
                if (!cmdName) {
                    cmd = 'call';
                } else if (has(cmdName, 'value') ) {
                    cmd = cmdName.value;
                } else {
                    cmd = 'call';
                    args.unshift(cmdName);
                    bind = 1;
                }
            
                let end = p.ind-1;
                if (bind) {
                    return {
                        start: p.f.ln(start),
                        end: p.f.ln(end),
                        cmd, bind, args
                    };
                } else {
                    return {
                        start: p.f.ln(start),
                        end: p.f.ln(end),
                        cmd, args
                    };
                }
            }        ,
            '~' : function parseEval (p, terminator) {
                let bind;
                let start = p.ind;
                let cmd = 'eval';
                let args = p.f.textArgs(p, terminator);
                if (args[0]) {
                    bind = 1;
                } else {
                    args.shift();
                }
                
                let end = p.ind-1;
                if (bind) {
                    return {
                        start: p.f.ln(start),
                        end: p.f.ln(end),
                        cmd, bind, args
                    };
                } else {
                    return {
                        start: p.f.ln(start),
                        end: p.f.ln(end),
                        cmd, args
                    };
                }
            }    ,
            '#' : function parseNumber (p, terminator) {
                const start = p.ind;
                const cmd = 'math';
                let first = p.f.findFirst(p, '#' + terminator);
                if (first[0] === '#') {
                    p.ind = first[1] + 1; // past the hash
                    first = {value : p.f.norm(p.text.slice(start, first[1]))};
                } else {
                    first = {value: 'js:eval'};
                }
                
                let args = p.f.textArgs(p, terminator);
                let bind;
                if (!args[0]) {
                    bind = 1; // no explicit math text so from pipe
                    args.shift(); // get rid of null
                } else {
                    bind = 2;
                }
                args.unshift(first); //add the type
                let end = p.ind-1;
                return {
                    start: p.f.ln(start),
                    end: p.f.ln(end),
                    cmd, bind, args
                };
            },
            '?' : function parseBoolean (p, terminator) {
                let start = p.ind-1;
                let cmd = 'bool';
                let args = p.f.textArgs(p, terminator);
                let end = p.ind-1;
                if (!args[0]) { //in case no op after ?
                    args.shift();
                    return {
                        start: p.f.ln(start),
                        end: p.f.ln(end),
                        cmd, args
                    };
                } else {
                    let bind = 1;
                    return {
                        start: p.f.ln(start),
                        end: p.f.ln(end),
                        cmd, bind, args
                    };
                }
            },
            '=' : function parseOperator (p, terminator) {
                let start = p.ind-1;
                let cmd = 'op';
                let reg = /[ a-zA-Z0-9]/g;
                reg.lastIndex = p.ind;
                let match = reg.exec(p.text);
                let secondInd;
                if (match) {
                    secondInd = match.index;
                } else {
                    throw new Error('need letter, digit, or space for operator: ' +
                        p.ind + ': ' + p.text.slice(p.ind) );
                }
                let first = {value: p.text.slice(p.ind, secondInd).trim()};
                p.ind=secondInd;
                let args = p.f.textArgs(p, terminator);
                args.unshift(first);
                let bind = 1;
                let end = p.ind-1;
                return {
                    start: p.f.ln(start),
                    end: p.f.ln(end),
                    cmd, bind, args
                };
            },
            '[' : function parseArray (p) {
                let start = p.ind-1;
                let cmd = 'arr';
                let args = p.f.parseArgs(p, csqu);
                let end = p.ind-1;
                return {
                    start: p.f.ln(start),
                    end: p.f.ln(end),
                    cmd, args
                };
            }, //]
            '{' : function parseObject (p) {
                let start = p.ind-1;
                let cmd = 'obj';
                let key;
                const pre = function (p) {
                    key = p.f.toTerminator(p, 'args', ':,' + cbra);
                    if (key.terminate !== ':') {
                        p.ind -= 1;                 
                    } 
                    delete key.terminate;
                };
                const post = function(val) {
                    let term = val.terminate;
                    delete val.terminate;
                    let ret = {
                        cmd : 'kv',
                        args : [ key, val ]
                    };
                    if (term) {
                        ret.terminate = term;
                    }
                    return ret;
                };
                let args = p.f.parseArgs(p, cbra, pre, post);
                let end = p.ind-1;
                return {
                    start: p.f.ln(start),
                    end: p.f.ln(end),
                    cmd, args
                };
            }, //}
            '-' : function parseDash (p, terminator) {
                let start = p.ind-1;
                let cmd = 'dash';
                let bind = 1;
                let args = p.f.textArgs(p, terminator);
                let end = p.ind-1;
                return {
                    start: p.f.ln(start),
                    end: p.f.ln(end),
                    cmd, bind, args
                };
            }, 
            '.' : function parseDot (p,terminator) {
                let start = p.ind-1;
                let cmd = 'dot';
                let args = p.f.textArgs(p, terminator);
                let end = p.ind-1;
                if (args[0]) {
                    let props = args.shift().value.
                        split('.').
                        map( el => el.trim()).
                        map(el => {return {value:el};} );
                    if (p.text[end] === cpar) {
                        props.push({cmd : 'array', args });
                    }
                    args = props;
                } else {
                    args.shift();
                }
                return {
                    start: p.f.ln(start),
                    end: p.f.ln(end),
                    cmd, args
                };
            },
            '/' : function parseComment (p, terminator) {
                const start = p.ind-1;
                const cmd = 'comment';
                let type;
                let slash = p.f.findFirst(p, '/'+terminator);
                if (slash[0] === '/') {
                    type = p.text.slice(p.ind, slash[1]) || 'js-inline';
                    p.ind = slash[1]+1;
                } else {
                    type = 'js-inline';
                }
                let args = p.f.textArgs(p, terminator);
                let bind;
                let end = p.ind-1;
                if (!args[0]) { 
                    args.shift(); 
                    bind = 1; // no text after slashes so assume incoming
                } else {
                    bind = 2; //there is text; incoming can go in extra arguments if needed
                }
                args.unshift({value:type});
                return {
                    start: p.f.ln(start),
                    end: p.f.ln(end),
                    cmd, bind, args
                };
            },
            '@' : function atParse (p, terminator) {
                let end, cmd, args;
                let start = p.ind;
                p.f.space(p);
                if (p.text[p.ind] === par) {
                    cmd = 'apply';
                    args = p.f.textArgs(p, terminator);
                    args.shift(); // no first text arg
                    end = p.ind-1;
                    return {
                        start: p.f.ln(start),
                        end: p.f.ln(end),
                        cmd, args
                    };
                }  
            
                end = p.f.findFirst(p, terminator)[1];
                let text = p.f.norm(p.text.slice(start, end));
                p.ind = end;
                if (!text) {
                    cmd = 'pipeInput';
                    args = [];
                } else if (text[0].search(/^[!0-9.^]/) !== -1 ) {
                    cmd = 'pipeInput';
                    args = [{value:text}];
                } else {
                    cmd = 'getScope';
                    args = [{value:text}];
                }
                return {
                    start: p.f.ln(start),
                    end: p.f.ln(end),
                    cmd, args
                };
            },
            '^' : function caretParse (p, terminator) {
                let start = p.ind-1;
                let args = p.f.textArgs(p, terminator);
                if (!args[0]) {args.shift();}
                let end = p.ind-1;
                let cmd = 'storeScope';
                let bind = 1; // input is the second argument
                return {
                    start: p.f.ln(start),
                    end: p.f.ln(end),
                    cmd, bind, args
                };
            }
        };
        const toTerminator = function toTerminator (p, mode, terminator) {
            let typeFirst = p.f.typeFirst;
            let len = p.text.length;
            if (p.ind >= len) {
                return {terminate:true};
            }
            let ln = p.f.ln;
            p.f.space(p);
            let first = p.text[p.ind];
            if (terminator.indexOf(first) !== -1) {
                p.ind += 1;
                return { terminate : (first || true) };
            }
            let piece, start = p.ind;
            if (has(typeFirst, first) ) {
                p.ind += 1;
                piece = typeFirst[first](p, terminator+'|');
            } else {
                let paren = p.f.findFirst(p, par + '|' + terminator);
                if (paren[0] === par ) {
                    piece =  typeFirst['!'](p, terminator);
                } else {
                    if (mode === 'args') {  
                        let start = p.ind;
                        p.ind = p.f.findFirst(p, terminator+'|')[1];
                        piece = {
                            start : p.f.ln(start),
                            end : p.f.ln(p.ind-1),
                            value : p.text.slice(start, p.ind).trim(),
                        };
                    } else {
                        piece = typeFirst[p.f.plainText[mode]](p, terminator);
                    }
                }
            }
            let nxt = p.f.findFirst(p, '|'+terminator);
            p.ind = nxt[1]+1;
            if (nxt[0] === '|') {
                if (mode !== 'pipe') {
                    delete piece.terminate; 
                    let args = [piece];
                    piece = {cmd: 'pipe', args};
                    piece.terminate = true; //likely to be replaced if proper
                    let go = true;
                    while (go) {
                        let further = toTerminator(p, 'pipe', terminator);
                        if (further.terminate) { 
                            if (terminator.indexOf(further.terminate) !== -1) {
                                go = false;
                                piece.terminate = further.terminate;
                            }
                            delete further.terminate; //not generally needed
                        }
                        if (p.ind >= len) { go = false;}
                        if (further.cmd || further.values) {args.push(further);}
                    }
                    piece.start = ln(start);
                    piece.end = ln(p.ind-1);
                } 
            } else {
                piece.terminate = nxt[0] || true;
            }
            return piece;
        };
        const normalizeString = function normalizeString (str) {
            return str.trim().toLowerCase();
        };
        const lineNumberFactory = function (text,[ls, cs, ps]) {
            let lines = [0];
            let len = text.length;
            let ind = text.indexOf('\n', 0);
            while (ind !== -1) {
                ind = ind + 1;
                lines.push(ind);
                if (ind >= len) { 
                    break;
                }
                ind = text.indexOf('\n',ind);
            }
           
            return function genLineNumber (data) { 
                if (Array.isArray(data)) {
                    let [line, col] = data;
                    if (line === ls) {
                        return lines[0] +cs + col;
                    } else {
                        return lines[line-ls] + col;
                    }
                } else if (typeof data === 'number') { 
                    let target = data;
                    let min = 0;
                    let max = lines.length;
                    while ( (max - min) > 1 ) {
                        let guess = (min + max);
                        guess = (guess + (guess % 2) )/2;
                        if (lines[guess] === target) {
                            min = guess;
                            break;
                        } else if (lines[guess] < target) {
                            min = guess;
                        } else {
                            max = guess;
                        }
                    }
                    let line = min+ls;
                    let col = (target - lines[min] ) +
                        ( (line===ls) ? cs : 1 );
                    return [line, col, ps + data];
                }
            };
        };
        const parseArgs = function (p, close, pre, post) {
            const len = p.text.length;
            const term = ',' + close;
            let args = [];
            while (p.ind < len) {
                if (pre) {pre(p);}
                let piece = toTerminator(p, 'args', term);
                if  (piece) {
                    if (post) { piece = post(piece);}
                    if  (has(piece, 'value') || has(piece, 'cmd') ) {
                        args.push(piece);
                    }
                    let terminate = piece.terminate;
                    delete piece.terminate;
                    if (terminate === close) {
                        break;
                    }
                } else {
                    //should never happen
                    throw new Error('undefined piece:' + p.text.slice(p.ind) +
                        p.ind);
                }
            }
            return args;
        };
        const textArgs = function textArgs (p, terminator) {
            terminator = terminator + '|';
            let args, firstArg;
            let start = p.ind;
            p.f.space(p);
        
            let first = p.text[p.ind];
        
            if (terminator.indexOf(first) !== -1) {
                return [null];
            }
            if (p.q.test(first) ) {
                let qEnd = p.text.indexOf(first, p.ind+1);
                if (qEnd !== -1) {
                    firstArg = {value: p.text.slice(p.ind+1, qEnd)};
                    p.ind = p.f.findFirst(p, par+terminator, qEnd)[1];
                } else {
                    let end = p.text.length;
                    let value = p.text.slice(start);
                    let info = {start: p.f.ln(start), end : p.f.ln(end), value};
                    p.f.tracker('unterminated quote', info);
                    throw new Error('unterminated quoted:' + info.start + ':' + value);
                }
            } else if (first === p.u) {
                let quote = p.text[p.ind+1];
                if (p.q.test(quote)) {
                    p.ind +=2;
                    firstArg = p.f.toTerminator(p, 'code', quote); 
                } else {
                    let uEnd = p.f.findFirst(p, par + terminator)[1];
                    firstArg = {
                        cmd: 'get', 
                        args : [ {value: p.f.norm(p.text.slice(p.ind+1, uEnd))}]
                    };
                    p.ind = uEnd; //on parentheses or terminator
                }
            } else {
                let tEnd = p.f.findFirst(p, par + terminator)[1];
                if (tEnd === p.ind) {  // no text
                    firstArg = null;
                } else {
                    firstArg = {value : p.text.slice(p.ind, tEnd).trim()};
                }
                p.ind = tEnd;
            }
        
        
            if (firstArg) {
                firstArg.start = p.f.ln(start);
                firstArg.end = p.f.ln(p.ind-1);
                delete firstArg.terminate;
            }
            if (p.text[p.ind] === par) {
                p.ind += 1;
                args = p.f.parseArgs(p, cpar);
                args.unshift(firstArg);
            } else {
                args = [firstArg];
            }
        
        
            return args;
            
        
        };
        const plainText = {
            'code' : "\u005f",
            'pipe' : "!"
        };
        const findFirst = function findFirst (p, chars, ind) {
            ind = ind || p.ind;
            let len = p.text.length;
            while (ind < len) {
                if (chars.indexOf(p.text[ind]) !== -1) {
                    return [p.text[ind], ind];
                } else {
                    ind += 1;
                }
            }
            return [null, ind];
        };
        const space = function space(p) {
            let reg = /\s*/g;
            reg.lastIndex = p.ind;
            reg.exec(p.text); //just advances past whitespace
            p.ind = reg.lastIndex;
        };
        cta = function cta ({
            type = 'code',
            text = '', 
            //eslint-disable-next-line no-console
            tracker = ()=>{},// (note, data) => {console.log("UP/" + note, data);}, 
            start = [1,1,0],
            ind = 0,
            u = '\u005f',
            q = /['"`]/,
            typeFirst = {}, 
            f = {} 
        }) {
            Object.keys(defTypeFirst).forEach( (key) => {
                if (has(typeFirst, key) ) {
                    if (typeof typeFirst[key] !== 'function' ) {
                        delete typeFirst[key];
                    }
                } else {
                    typeFirst[key] = defTypeFirst[key];
                }
            });
            let p = {text, ind, q, u, 
                begin : ind,
                f : {typeFirst, toTerminator, findFirst, tracker, parseArgs, 
                    norm:normalizeString, textArgs, plainText, space}
            };
            Object.assign(p.f,f); // a way to override most of the parsing stuff 
            if (!has(p.f, 'ln') ) {
                p.f.ln = lineNumberFactory(text, start);
            }
            let ret;
            if (type === 'code') {
                tracker("parsing code block", {text, start});
                let len = text.length;
                let pieces = [];
                let begin = ind;
                while (ind < text.length) {
                    let quote;
                    ind = text.indexOf(p.u, ind);
                    if (ind === -1) { break; }
                    if (!p.q.test(text[ind+1])) {ind += 1; continue;}
                    quote = text[ind+1];
                    {
                        let backind = ind-1;
                        let num = '';
                        let escape = false;
                        while (backind >= 0) {
                            let char = text[backind];
                            if (char === '\u005c') { //backslash
                                escape = true; 
                                break;
                            } else if (char.match(/\d/)) {
                                num = char + num; // index is going down
                                ind -= 1;
                                continue;
                            } else {
                                break;
                            }
                        }
                        if (escape) {
                            let prefix;
                            num = parseInt(num, 10);
                            if (num > 1) {
                                num = num -1;
                                prefix = '\u005c' + num; //backslash
                            } else if (num === 1) {
                                prefix = '\u005c';
                            } else {
                                prefix = '';
                            }
                            let txt = p.text.slice(begin,backind) + prefix + p.u + quote;
                            ind +=2;
                            pieces.push({
                                start : p.f.ln(begin),
                                end : p.f.ln(ind-1),
                                value : txt
                            });
                            continue;
                        }
                    }
                    let prevText = p.text.slice(begin, ind);
                    if (prevText) {
                        pieces.push( {
                            start : p.f.ln(begin),
                            end : p.f.ln(ind-1),
                            value : prevText
                        });
                    }
                    let indent;
                    if (ind === 0) { 
                        indent = ''; 
                    } else {
                        let start = ind-1;
                        let cur = start;
                        while (cur > -1) { 
                            if ( ( text[cur] !== ' ') && (text[cur] !== "\t" ) ) {
                                start = cur-1;
                            }
                            if (cur === 0) {
                                indent = '\n' + text.slice(cur,start+1);
                                break;
                            }
                            if (text[cur] === '\n') { 
                                indent = text.slice(cur, start+1);
                                break;
                            }
                            cur -= 1;
                        }
                    }
                    p.ind = ind + 2;
                    let further = toTerminator(p, 'code', quote);
                    delete further.terminate;
                    further.indent = indent;
                    pieces.push(further);
                    begin = ind = p.ind;
                }
                ind = len;
                if (begin < text.length) {  
                    let prevText = p.text.slice(begin, ind);
                    if (prevText) {
                        pieces.push( {
                            start : p.f.ln(begin),
                            end : p.f.ln(ind-1),
                            value : prevText
                        });
                    }
                }
                ret = pieces;
                tracker("code block parsed", ret);
            } else if (type === 'transform') {
                tracker('transform about to be parsed', p.ind, {text, start});
                ret = toTerminator(p, '', '');
                tracker('transform parsed', ret);
            } else if (type === 'args') {
                tracker('args about to be parsed', {text, start});
                let len = p.text.length;
                let args = [];
                while (p.ind < len) {
                    let piece = toTerminator(p, 'args', ',');
                    if (has(piece, 'value') || has(piece, 'cmd') ) {
                        args.push(piece);
                    }
                }
                tracker('args parsed', args);
                ret = args;
            } else {
                tracker('unrecognized type of parsing', {type, text, start});
                throw new Error('unrecognized type for parsing:' + type);
            }
            return ret;
        };
    }
    organs.parsers.up = cta;
}
//let options = {};
const util = require('util');
let full = (...args) => {
    console.log(util.inspect(args, {depth:11, colors: true}));
};
let tracker = full;
tracker = () => {};
let loaders = [
    {directive:'load', src: 'R./test.md', target:'test', args:[],
        scope:{fullname:'test file'},
        middle : function (text) {
            console.log(text);
            return text;
        }
    }, 
    {directive:'load', src: 'R./guess.pfp', target:'guess', args:[], 
        scope: {fullname:'guess scriptedwriting'}
    },
    {directive:'load', src: 'R./explore.pfp', target:'explore', args:[], 
        scope: {fullname:'explore'}
    }
];

loaders = loaders.slice(2); // get rid of the first one for now. 
let weaver = new Weaver(organs, tracker);
weaver.full = full;

let main = async function main (loaders) {
    let n = loaders.length;
    for (let i = 0; i < n; i += 1) {
        let loader = loaders[i];
        let {report, unresolved} = await weaver.run(loader);
        if (report) {env.log(report);}
        if (Object.keys(unresolved).length !== 0) {
            env.log(`Unresolved issues in loader ${loader.id}:\n` + 
            JSON.stringify(unresolved), 'loader', 5,);
            break; 
        }
    }
    //full(weaver.v, weaver.p);
    env.log('All done.');
};
           
env.printPriority = 1;
main(loaders).catch( (e) => {
    console.log(e, e.stack);
});
