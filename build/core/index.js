/* eslint-disable no-console */
//const util = require('util');
module.exports = function Weaver (
    organs = {directives:{}, commands:{}, parsers:{}, env:{}},
    tracker = (...args) => { console.log(args); }  
) {
    if (!organs) {
        throw Error('Weaver requires commands, directives, parsers, etc');
    }
    const weaver = this;
    weaver.tracker = tracker;
    const env = organs.env || {};
    //the actual values
    weaver.v = {
        web : {},
        commands : Object.assign({
            get : ()=> {}, 
            array : () => {}, 
            pipe : () => {},
            compose : () => {}, 
            '*' :() => {}, //short version of compose
            compile :() => {},
            call : () => {},
            apply : () => {}
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
            if (has(arg, 'value') ) {
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
        if (has(piece, 'value') ) { return piece;}
        if (!piece.cmd) { 
            tracker('run command called but no command to execute',
                {piece,scope});
            piece.value = ''; 
            return piece;
        }
        let {cmd, args=[]} = piece;
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
                    } else {
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
        } else if ((cmd === 'compose') || (cmd === '*' )) {
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
                        if (has(arg, 'value') ) {
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
                }
                comm = await prr.prom;
            }
            tracker('process command arguments', {tracking, cmd, args, scope});
            let argProcessor = makeArgProcessor(scope);
            let processed = (await Promise.all(args.map(argProcessor))).
                filter( (el => el) ); //filter removes undefined elements
            piece.actualArgs = processed;
            tracker('ready to run command', {tracking, cmd, args:processed, piece, scope});
            ret = await comm.apply({scope, piece}, processed); 
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
                return (curNode.prefix || '') + '::' + frag;
            }
            return frag; //fits a full name. 
        }
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
    weaver.runDirective = async function runDirective (name, data) {
        let {
            tracking=`directive ${name} from ${data.scope.fullname}`,
            args = [],
            target = '',
            src = ''
        } = data;
        tracker('directive queued', {tracking, name, data});
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
        await Promise.all(args.map(argProcessor) );
        let actualArgs = data.actualArgs = args.map( (el) => el.value); 
        tracker('run directive', {tracking, name, actualArgs, scope});
        let ret = await dire.call({env, weaver, scope}, {src, target, args:actualArgs});
        data.value = ret;
        tracker('directive done', {tracking, name, result:ret});
        return data;
    };
    weaver.addPieces = async function processWeb ({web, directives}) {
        directives.forEach( (d) => {
            weaver.runDirective(d.directive, d);
        });
        const names = Object.keys(web);
        const wvWeb = weaver.v.web;
        const prWeb = weaver.p.web;
        let proms = names.map( async function (name) {
            let node = web[name];
            let vals; // local to piece values
            let prr = prWeb[name];
            if (!prr) {
                prr = prWeb[name] = makePromise();
            }
            tracker(`storing node promise: ${name}`, {name, node, prr});
            console.log('New Node', node);
            if (has(node,'pieces')) {
                let pieceProms = node.pieces.map( 
                    async function singlePieceProcess (piece, idx) {
                        if (has(piece, 'value') ) {return piece.value;}
                        if  ( has(piece, 'cmd') )   {
                            let scope = makeScope({
                                tracking : 'creating piece ' + idx + ' of node ' + name, 
                                context : node}
                            );
                            weaver.full('BEFORE CMD',scope, piece);
                            await runCommand.call(scope, piece);
                            weaver.full(scope, piece);
                            if (piece.indent) {
                                piece.value = piece.value.replace(/\n/g, '\n'+piece.indent );
                            }
                            return piece.value;
                        }
                        tracker(`Bad state reached in parsing piece of node ${node.scope.fullname}`); 
                        piece.value = '';
                        return piece.value;
                    }
                );
                vals = await Promise.all(pieceProms);
                console.log(node.scope.fullname, vals);
            } else {
                vals = [''];
            }
            vals = vals ||  [];
            if (vals.every( (el) => (typeof el === 'string') ) ){
                vals = vals.join('');
            }
            console.log('HEY', vals);
            if (node.transform && node.transform.length > 0) {
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
            console.log('Hey Done', node.value);
            prr.resolve(node.value);
            tracker('node ' + name + ' value is computed', {name, value: node.value});
            return node.value;
        });
        console.log('Waiting proms');
        console.log(proms);
        let vals = await Promise.all(proms);
        let ret = {};
        console.log('Proms done', vals);
        names.forEach( (name, idx) => {
            let newNode = web[name];
            if (has(wvWeb, name) ) {
                let oldNode = wvWeb[name];
                if (oldNode.value === newNode.value) {
                    tracker(`redundant node compilation ${name}`, {name, newNode, oldNode}); 
                } else {
                    tracker(`different nodes with same name: ${name}`, {name, newNode, oldNode});
                    throw new Error("redundant node name " + name);
                }
            } else {
                wvWeb[name] = newNode;
                tracker(`storing node ${name}`, {name, newNode });
            }
            ret[name] = vals[idx];
        });
    
        console.log(Object.keys(web));
        tracker('a web of nodes is done', {web});
        return ret;
    
    };
    weaver.parse = async function parse (text, prefix, textParserName, codeParserName) {
        let textParser = weaver.v.parsers[textParserName]; 
        if (!textParser) {
            let prr = weaver.p.parsers[textParserName];
            if (!prr) {
                prr = makePromise();
                weaver.p.parsers[textParserName] = prr;
            }
            textParser = await prr.prom;
        }
        let codeParser = weaver.v.parsers[codeParserName]; 
        if (!codeParser) {
            let prr = weaver.p.parsers[codeParserName];
            if (!prr) {
                prr = makePromise();
                weaver.p.parsers[codeParserName] = prr;
            }
            codeParser = await prr.prom;
        }
        let {web, directives} = textParser(text, {prefix, tracker : () => {}});
        directives.forEach( (el) => {
            el.rawArgs = el.args;
            if (el.args) {
                let argPieces = codeParser({text: el.args, type:'args', start : el.scope.sourcepos[0]});
                el.args = argPieces;
            } else {
                el.args = [];    
            }
        });
        Object.keys(web).forEach( (name) => {
            const node = web[name];
            const code = node.code || [];
            node.pieces = code.reduce( (acc, el) => {
                let {code, start} = el;
                weaver.full(el);
                let pieces = codeParser({text:code, type:'code', start});
                el.pieces = pieces; // in case it is needed as reference
                return acc.concat(pieces);
            }, []);
            const transform = node.rawTransform || []; 
            node.transform = transform.reduce( (acc, el) => {
                let [start, text] = el;
                let pieces = codeParser({text, type:'transform', start});
                el.pieces = pieces;
                return acc.concat(pieces);
            }, []);
            if (node.transform.length === 0) { delete node.transform}
        });
        return {web, directives};
    };
    weaver.getNode = function getNode (nodeName) {
        let weaver = this;
        let prr = weaver.p.web[nodeName];
        if (!prr) {
            prr = makePromise();
            weaver.p.web[nodeName] = prr;
        }
        return prr.prom;
    };
    weaver.run = async function run (loader) {
        let {directive} = loader;
        weaver.runDirective(directive, loader);
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
        let unresolved = weaver.keyDiff(weaver.p, weaver.v);
        return unresolved;
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
