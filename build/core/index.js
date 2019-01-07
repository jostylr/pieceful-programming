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
            console.log('AP', arg);
            if (!arg) {
                return arg;
            }
            if (arg.hasOwnProperty('value') ) {
                return arg.value;
            } else if (arg.cmd) {
                return await runCommand.call(state, arg);
            } else {
                return arg;
            }
        };
    };
    const runCommand = async function runCommand (piece = {}) {
        let scope = this;
        if (piece.hasOwnProperty('value') ) { return piece;}
        if (!piece.cmd) { 
            tracker('run command called but no command to execute',
                {piece,scope});
            throw new Error('no command to execute: ' + scope.tracking);
        }
        let {cmd, args=[]} = piece;
        if (piece.hasOwnProperty('input') ) { 
            args.unshift(piece.input);
        }
        let {tracking = ''} = scope;
        let ret;
        tracker('command called', {tracking, cmd, piece});
        if (cmd === 'pipe') {
            let input;
            let pipes = args;
            tracker('pipe started', {tracking, pipes, scope});
            let pipeVals = [];
            for (let i = 0; i < pipes.length; i += 1) {
                let nxtPiece = pipes[i];
                if (nxtPiece.value) {
                    input = nxtPiece;
                } else if (nxtPiece.cmd) {
                    if (typeof input !== 'undefined') {
                        nxtPiece.input = input;
                    }
                    console.log('next pipe', nxtPiece);
                    input = await runCommand.call(scope, nxtPiece);
                } else {
                    tracker('failed cmd in pipe', {piece, pipe:nxtPiece, i, scope});
                    throw new Error('failed cmd in pipe:' + scope.tracking 
                        + ':pipe ' + i);
                }
            }
            ret = input.value;
        } else if (cmd === 'get') {
            ret = [];
            let names = [];
            let arg = args[0];
            if (!arg) {
                return '';
            }
            if (typeof arg !== 'string') {
                 if (arg.value) {
                    arg = arg.value;
                } else if (arg.cmd) {
                    arg = (await runCommand.call(scope, arg)).value;
                } 
                if (typeof arg !== 'string') {
                    tracker('unrecognized argument for get', arg, piece);
                    return '';
                }
            }
            if (arg[0] === '/') {
                // nothing yet
            } else {
                let nodeName = arg;
                console.log('G1', nodeName);
                // TODO
                let prr = weaver.p.web[nodeName];
                if (!prr) {
                    prr = makePromise();
                    weaver.p.web[nodeName] = prr;
                }
                names.push(nodeName);
                ret.push(prr.prom);
            }
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
        } else if (cmd === 'compose') {
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
            let comm = weaver.v.commands[cmd]; 
            if (!comm) {
                let prr = weaver.p.commands[cmd];
                if (!prr) {
                    prr = makePromise();
                    weaver.p.commands[cmd] = prr;
                } comm = await prr.prom;
            }
            tracker('process command arguments', {tracking, cmd, args, scope});
            let argProcessor = makeArgProcessor(scope);
            let processed = await Promise.all(args.map(argProcessor) );
            piece.actualArgs = processed;
            tracker('ready to run command', {tracking, cmd, args:processed, piece, scope});
            ret = await comm.apply(scope, processed); 
        }
        piece.value = ret;
        tracker('command finished', {tracking, cmd, ret, scope});
        return piece;
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
            } dire = await prr.prom;
        }
        let scope = makeScope({tracking, context : data});
        let argProcessor = makeArgProcessor(scope);
        tracker('processing directive arguments', {tracking, name, args, scope});
        await Promise.all(args.map(argProcessor) );
        let actualArgs = data.actualArgs = args.map( (el) => el.value); 
        tracker('run directive', {tracking, name, actualArgs, scope});
        console.log('RD', name, actualArgs, '\nARGS', args);
        let ret = await dire.call({weaver, scope}, {src, target, args:actualArgs});
        data.value = ret;
        tracker('directive done', {tracking, name, result:ret});
        return data;
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
                        if ( (piece.cmd) && !(piece.hasOwnProperty('value') ) ) {
                            let scope = makeScope({
                                tracking : 'creating piece ' + idx + ' of node ' + name, 
                                context : web[name]}
                            );
                            await runCommand.call(scope, piece);
                            if (piece.indent) {
                                piece.value = piece.value.replace(/\n/g, '\n'+piece.indent );
                            }
                        }
                        return piece;
                    }
                );
                vals = await Promise.all(pieceProms);
            } 
            vals = vals ||  [];
            console.log('V1', vals);
            if (vals.every( (el) => (typeof el === 'object') && (typeof el.value === 'string') ) ){
                vals = vals.map(el => el.value).join('');
            }
            console.log('V2', vals);
            if (node.transform) {
                let pt = node.transform;
                pt.input = vals;
                let scope = makeScope({
                    tracking : 'transforming value of ' + name,
                    context : web[name]}
                );
                node.value = (await runCommand.call(scope, pt )).value;
            } else {
                node.value = vals;
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
