module.exports = function Weaver (
    io = {}, 
    tracker = (...args) => { console.log(args); }  
) {
    const weaver = this;
    weaver.io = io;
    weaver.tracker = tracker;
    //the actual values
    weaver.v = {
        web : {},
        commands : {
            get : ()=> {}, 
            array : () => {}, 
            pipe : () => {},
            compose : () => {}
        },
        directives : {}
    };
    //the promises 
    weaver.p = {
        web : {},
        commands: {},
        directives : {}
    };

    const makePromise = function makePromise () {
        let rej, res, prom;
        prom = new Promise ( (resolve, reject) => {
            rej = reject;
            res = resolve;
        });
        return {reject:rej, resolve:res, prom};
    };
    const makeArgProcessor = function makeArgProcessor(state) {
        return async function argProcessor (arg) {
            if (Array.isArray(arg) ) {
                let [name, ...args] = arg;
                if (name === 'array') {
                    return args[0];
                } else {
                    return await runCommand.call(state, name, args);
                }
            } else {
                return arg;
            }
        };
    };
    const runCommand = async function runCommand (name, args) {
        let scope = this;
        let {tracking = ''} = scope;
        let ret;
        tracker('command called', {tracking, name});
        if (name === 'pipe') {
            let input;
            tracker('pipe started', {tracking, args, scope});
            for (let i = 0; i < args.length; i += 1) {
                let actualArgs = args[i].slice(1);
                let nextName = args[i][0];
                if (typeof input !== 'undefined') {
                    actualArgs.unshift(input);
                }
                input = await runCommand.call(scope, nextName, actualArgs);
            }
            ret = input;
        } else if (name === 'get') {
            ret = [];
            let names = [];
            args.forEach( (arg) => {
                if (Array.isArray(arg)) {
                    arg.forEach( (nodeName) => {
                        if (typeof nodeName !== 'string') {
                            tracker('command get called without name', {tracking : scope.tracking, name : nodeName});
                            return;
                        }
                        let prr = weaver.p.web[nodeName];
                        if (!prr) {
                            prr = makePromise();
                            weaver.p.web[nodeName] = prr;
                        }
                        names.push(nodeName);
                        ret.push(prr.prom);
                    });
                } else {
                    const nodeName = arg;
                    if (typeof nodeName !== 'string') {
                        tracker('command get called without name', {tracking : scope.tracking, name : nodeName});
                        return;
                    }
                    let prr = weaver.p.web[nodeName];
                    if (!prr) {
                        prr = makePromise();
                        weaver.p.web[nodeName] = prr;
                    }
                    names.push(nodeName);
                    ret.push(prr.prom);
                }
            });
            if (ret.length === 0) {
                ret = '';
            } else {
                ret = await Promise.all(ret);
                if (ret.length === 1) {
                    ret = ret[0];
                } else {
                    let obj = {};
                    names.forEach( (name, idx) => {
                        obj[name] = ret[idx];
                    });
                    ret = obj;
                }
            }
        } else if (name === 'compose') {
            tracker('composing', {tracking, args, scope});
            let funs = args.slice(0);
            ret = async function composed (...newArgs) {
                let scope = this;
                tracker('composed command called', {tracking, functions: funs, args:newArgs, scope});
            
                let input;
                for (let i = 0; i < funs.length; i += 1) {
                    let actualArgs = funs[i].slice(1);
                    let nextName = funs[i][0];
                    let noSpecial = true;
                    let inputNotUsed = true;
                    let tempArgs = [];
                    actualArgs.forEach( (arg) => {
                        if (typeof arg === 'string') {
                            if (arg[0] === '$') {
                                if (arg[1] === '$') {
                                // escaping
                                    tempArgs.push(arg.slice(1));
                                } else if (arg[1] === '&') {
                                // input
                                    tempArgs.push(input);
                                    inputNotUsed = false;
                                } else if (
                                    arg.slice(1).replace(/^(-?\d+)?(\.\.)?(-?\d+)?/, 
                                        function rep (match, p1, p2, p3) {
                                            if (!p1 && !p2 && !p3) { return '';}
                                            let left, right;
                                            if (p1) {
                                                left = parseInt(p1, 10);
                                                if (left < 0) left = newArgs.length+left; //subtracts
                                            } else {
                                                left = 0;
                                            }
                                            if (p2) {
                                                if (p3) {
                                                    right = parseInt(p3, 10);
                                                    if (right < 0) right = newArgs.length+right;
                                                    right += 1;
                                                } else {
                                                    right = newArgs.length;
                                                }
                                                tempArgs.push.call(tempArgs, 
                                                    newArgs.slice(left, right));
                                            } else {
                                                tempArgs.push(newArgs[left]);
                                            }
                                            return 'done';
                                        })
                                ) { 
                                    noSpecial = false;
                                } else { //not a special
                                    tempArgs.push(arg);
                                }
                            }
                        }
                    });
                    if (inputNotUsed) {
                        if (typeof input !== 'undefined') {
                            actualArgs.unshift(input);
                            inputNotUsed === false;
                        } 
                    }
                    if (noSpecial && inputNotUsed) {
                        actualArgs = [...newArgs, ...actualArgs];
                    }
                    input = await runCommand.call(scope, nextName, actualArgs);
                }
                return input;
            };
        } else {
            let comm = weaver.v.commands[name]; 
            if (!comm) {
                let prr = weaver.p.commands[name];
                if (!prr) {
                    prr = makePromise();
                    weaver.p.commands[name] = prr;
                }
                comm = await prr.prom;
            }
            tracker('process command arguments', {tracking, name, args, scope});
            let argProcessor = makeArgProcessor(scope);
            let processed = await Promise.all(args.map(argProcessor) );
            tracker('ready to run command', {tracking, name, args:processed, scope});
            ret = await comm.apply(scope, processed); 
        }
        tracker('command finished', {tracking, name, ret, scope});
        return ret;
    };
    const makeScope = function (obj = {}) {
        obj.tracking = obj.tracking || '';
        obj.context = obj.context || {};
        return obj;
    };

    //external api, probably should make read only
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
    weaver.runDirective = async function runDirective (name, data) {
        let {
            tracking=`directive ${name} from ${data.scope.fullname}`,
            args = [],
            target = '',
            src = ''
        } = data;
        tracker('directive queued', {tracking, name});
        let dire = weaver.v.directives[name]; 
        if (!dire) {
            let prr = weaver.p.directives[name];
            if (!prr) {
                prr = makePromise();
                weaver.p.directives[name] = prr;
            }
            dire = await prr.prom;
        }
        let scope = makeScope({tracking, context : data});
        let argProcessor = makeArgProcessor(scope);
        tracker('processing directive arguments', {tracking, name, args, scope});
        let processed = await Promise.all(args.map(argProcessor) );
        tracker('run directive', {tracking, name, processed, scope});
        scope.weaver = weaver;
        let ret = await dire.call(scope, {src, target, args:processed});
        tracker('directive done', {tracking, name, result:ret});
        return ret;
    };
    weaver.addPieces = async function processWeb (web) {
        const names = Object.keys(web);
        const wvWeb = weaver.v.web;
        const prWeb = weaver.p.web;
        let proms = names.map( async function (name) {
            let node = web[name];
            let vals; // local to piece values
            let prr;
            if (wvWeb.hasOwnProperty(name) ) {
                tracker("node in web already exists", {
                    name, newNode : node , existingNode : wvWeb[name]
                });
                throw new Error("redundant node name " + name);
            } else {
                wvWeb[name] = node;
                prr = prWeb[name];
                if (!prr) {
                    prr = prWeb[name] = makePromise();
                }
                tracker("storing node", {name, node, prr});
            }
            if (node.pieces) {
                let pieceProms = node.pieces.map( 
                    async function singlePieceProcess (piece, idx) {
                        if (Array.isArray(piece) ) { //commands are given as arrays
                            let scope = makeScope({
                                tracking : 'creating piece ' + idx + ' of node ' + name, 
                                context : web[name]}
                            );
                            return await runCommand.call(scope, 'pipe', piece);
                        } else {
                            return piece;
                        }
                    }
                );
                vals = await Promise.all(pieceProms);
            } else {
                vals = [''];
            }
            if (node.transform) {
                let com = [['array', vals], ...(node.transform) ];
                let scope = makeScope({
                    tracking : 'transforming value of ' + name,
                    context : web[name]}
                );
                node.value = await runCommand.call(scope, 'pipe', com);
            } else {
                if (vals.length === 1) {
                    node.value = vals[0];
                } else {
                    node.value = vals.join('');
                }
            }
            prr.resolve(node.value);
            tracker('node ' + name + ' value is computed', {name, value: node.value});
            return node.value;
        });
        let vals = await Promise.all(proms);
        let ret = {};
        names.forEach( (name, idx) => {
            ret[name] = vals[idx];
        });
    
        tracker('a web of nodes is done', {web});
        return ret;
    
    };


    return weaver;
};
