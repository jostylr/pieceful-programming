/* eslint-disable no-console */
//const util = require('util');
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
            compose : () => {}, 
            call : () => {},
            apply : () => {}
        },
        directives : {},
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
            if (!arg) {
                return arg;
            }
            if (arg.hasOwnProperty('value') ) {
                return arg.value;
            } else if (arg.cmd) {
                return (await runCommand.call(state, arg)).value;
            } else {
                return undefined;
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
        let override;
        if (piece.hasOwnProperty('inputs') ) {
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
                    } else {
                        skip = true;
                        args[idx].value = input.value;
                    }
                }
            });
            if ( (!skip) && (input && (typeof input.value !== 'undefined') ) ) {
                if (piece.hasOwnProperty('bind') ) {
                    if (piece.bind !== true) {
                        args.splice(piece.bind, 0, input);
                    } 
                } else {
                    args.unshift(input);
                }
            }
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
                    nxtPiece.inputs = pipeVals.slice();
                    input = await runCommand.call(scope, nxtPiece);
                } else {
                    tracker('failed cmd in pipe', {piece, pipe:nxtPiece, i, scope});
                    throw new Error('failed cmd in pipe:' + scope.tracking 
                        + ':pipe ' + i);
                }
                pipeVals.unshift(input);
            }
            ret = input.value;
        } else if (cmd === 'get') {
            let arg = args[0].value || '';
            if (Array.isArray(arg) ) { // list of sections
                let names = [];
                let proms = arg.map( (arg) => {
                    let nodeName = weaver.syntax.getFullNodeName(arg, scope.context);
                    let prr = weaver.p.web[nodeName];
                    if (!prr) {
                        prr = makePromise();
                        weaver.p.web[nodeName] = prr;
                    }
                    names.push(nodeName);
                    return prr.prom;
                });
                let vals = (await Promise.all(proms)).map(el => el.value);
                ret = {};
                vals.forEach( (el, idx) => {
                    ret[names[idx]] = el;
                } );
            } else {
                let nodeName = weaver.syntax.getFullNodeName(arg, scope.context);
                let prr = weaver.p.web[nodeName];
                if (!prr) {
                    prr = makePromise();
                    weaver.p.web[nodeName] = prr;
                }
                ret = (await prr.prom);
            }
        } else if (cmd === 'compose') {
            tracker('composing', {tracking, args, scope});
            let funs = args;
            let oldScope = scope;
            ret = async function composed (...newArgs) {
                let scope = this;
                funs = JSON.parse(JSON.stringify(funs) );
                tracker('composed command called', {tracking, functions: funs, args:newArgs, scope, oldScope});
                funs = weaver.syntax.descentSpecial(funs, newArgs, oldScope);
                let pipes = {
                    cmd : 'pipes',
                    args : funs,
                    tracking : oldScope.tracking + ' composed into ' + scope.tracking
                };
                return await runCommand.call(scope, pipes);   
            
            };
        } else { 
            if ( (cmd.length > 1) && (cmd[cmd.length-1] === '*') ) {
                let f = async function seq (ind) {
                    let arg = seq.args[ind];
                    if (arg) {
                        if (arg.hasOwnProperty('value') ) {
                            return arg.value;
                        } else {
                            return (await runCommand.call(scope, arg)).value; 
                        }
                    } else {
                        return;
                    }
                };
                f.args = args;
                args = [{value : f}];
            } 
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
            let processed = (await Promise.all(args.map(argProcessor))).
                filter( (el => el) ); //filter removes undefined elements
            piece.actualArgs = processed;
            tracker('ready to run command', {tracking, cmd, args:processed, piece, scope});
            ret = await comm.apply(scope, processed); 
        }
        tracker('command finished', {tracking, cmd, ret, scope});
        if (override) {
            ret = override;
            tracker('overriding result, using previous pipe input', {tracking,
                cmd, ret});
        } 
        piece.value = ret;
        return piece;
    };
    const makeScope = function (obj = {}) {
        obj.tracking = obj.tracking || '';
        obj.context = obj.context || {};
        return obj;
    };
    weaver.syntax = {
        descentSpecial : function descentSpecial (arr, args, scope) {
            return arr.reduce( (ret, piece) => {
                if (piece.hasOwnProperty('value') ) { //base case
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
                } else if (piece.hasOwnProperty('args') ) { //descend
                    piece.args = descentSpecial(piece.args, args, scope);
                    ret.push(piece);
                } 
                ret.push(piece);
                return ret;
            }, []);
        },
        getFullNodeName : function getFullNodeName (frag, curNode) {
            if (frag === '::') {
                return curNode.prefix + '^';
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
                return (curNode.prefix || '') + frag;
            }
            return frag; //fits a full name. 
        },
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
            if (vals.every( (el) => (typeof el === 'object') && (typeof el.value === 'string') ) ){
                vals = vals.map(el => el.value).join('');
            }
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
                        return !(c.hasOwnProperty('lv4'));
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
                            return !(c.hasOwnProperty('lv3'));
                        };
                    }
                } else {
                    lv3 = function (c) {
                        return !(c.hasOwnProperty('lv3'));
                    };
                    lv2 = function (c) {
                        return !(c.hasOwnProperty('lv2'));
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
