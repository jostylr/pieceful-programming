/* eslint-disable no-console */
//const util = require('util');
module.exports = function Weaver (
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
    tracker.new = function newTracker (scope, str = '', args, parent) {
        let sym = Symbol();
        let me = { 
            logs : [], 
            sym, 
            type:'promises', 
            children:[],
            needsMe : []
        };
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
            break;
        
        }
        me.scope = scope;
        //if (!me.id) { console.log(scope); }
        console.log(`ID: ${me.id}`, scope);
        if (parent) { 
            me.parent = parent;
            let parMe = tracker.get(parent);
            parMe.children.push(sym);
            if (parMe.debug > 1) {
                me.debug = parMe.debug -1;
            }
        }
        tracker.promises[sym] = me;
        tracker.log(sym, 'New Symbol Established', scope);
        tracker.log(sym, str, args);
        return me;
    };
    tracker.fail = function failTracker (sym, str, args) {
        let me = tracker.log(sym, 'FAIL: ' + (str || ''), args);
        tracker.failed[sym] = me;
        me.type = 'failed';
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
        let me = tracker.log(sym, str, needy);
        me.needsMe.push(needy);
        return me;
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
        prom.id = `${type}/${name}`;
        let {sym} = tracker.new({id:prom.id}, 'Making new promise', prom);
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
    const runCommand = async function runCommand (piece = {}, parSym) {
        if (has(piece, 'value') ) { return piece.value;}
        let scope = this;
        let {sym} = tracker.new(scope, 'run command called', piece, parSym);
        if (!piece.cmd) { 
            tracker.fail(sym, 'run command called but no command to execute');
            return piece.value = undefined; 
        }
        let {cmd, args=[]} = piece;
        let me = tracker(sym, 'command called', cmd);
        me.id = 'C/' + cmd;
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
            scope.pipe = piece;
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
            delete scope.pipe;
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
                me.id = 'C/get/' + names.join('/');
                let vals = (await Promise.all(proms)).map(el => el.value);
                ret = {};
                vals.forEach( (el, idx) => {
                    ret[names[idx]] = el;
                } );
            } else {
                let nodeName = weaver.syntax.getFullNodeName(arg, scope.context);
                let nodeProm = weaver.getNode(nodeName, sym);
                me.id = 'C/get/' + nodeName;
                ret = (await nodeProm);
            }
        } else if ((cmd === 'compose') || (cmd === '*' )) {
            tracker(sym, 'composing');
            let funs = args;
            let oldScope = scope;
            let oldSym = sym;
            ret = async function composed (...newArgs) {
                let {scope, sym} = this;
                funs = JSON.parse(JSON.stringify(funs) );
                tracker(sym, 'composed command called', {oldSym, oldScope, funs});
                funs = weaver.syntax.descentSpecial(funs, newArgs, oldScope);
                let pipes = {
                    cmd : 'pipes',
                    args : funs,
                };
                let ret = await runCommand.call(scope, pipes, sym);   
                tracker(sym, 'composed command finished', ret);
                return ret;
            
            };
        } else if (cmd === 'compile') {
            let text = (args[0]) ? args[0].value : '';
            if ( (typeof text !== 'string' ) || (text === '') ) {
                ret = ''; 
                //warn of no text to compile
            } else {
                let codeParserName = (args[2]) ? args[2].value : 'up';
                let codeParser = await weaver.waitForFunction('parsers', codeParserName, sym);
                let parsed = codeParser({text, type:'code', start: piece.start});
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
                let pieceProms = node.pieces.map( 
                    async function singlePieceProcess (piece, idx) {
                        if (has(piece, 'value') ) {return piece.value;}
                        if  ( has(piece, 'cmd') )   {
                            let scope = makeScope({
                                tracking : 'creating piece ' + idx + ' of node ' + name, 
                                context : node }
                            );
                            tracker(sym, 'Calling command on piece', [idx, piece]);
                            let val = await runCommand.call(scope, piece, sym);
                            if ( (piece.indent) && ( typeof val === 'string') ) {
                                val  = val.replace(/\n/g, piece.indent );
                            }
                            tracker(sym, 'Command finished', [idx, val] ); 
                            piece.value = val;
                            return val;
                        }
                        tracker.fail(sym, 'Piece found without a value or cmd property', idx);
                        piece.value = '';
                        return piece.value;
                    }
                );
                vals = await Promise.all(pieceProms);
            
                ret = vals.join(''); //no transform; if make a nicer version in transform then use that
            
            }
        } else if (cmd === 'log') {
            tracker(sym, 'loggin arguments');
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
            let processed = (await Promise.all(args.map(argProcessor))).
                filter( (el => (typeof el !== 'undefined')  ) ); 
            piece.actualArgs = processed;
            tracker(sym, 'Ready to run command', processed);
            ret = await comm.apply({scope, piece, sym, tracker }, processed); 
        }
        tracker(sym, 'Command finished', ret);
        if (override) {
            ret = override.value;
            tracker(sym, 'Overriding result, using previous pipe input', ret);
        } 
        console.log(cmd, 'Done', args)
        tracker.done(sym); // finished above, but possibly overriden.
        piece.value = ret;
        return ret;
    };
    const makeScope = function (obj = {}) {
        obj.tracking = obj.tracking || '';
        obj.context = obj.context || {};
        obj.vars = obj.vars || {}; //for using to store stuff in shared context. 
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
            return frag; //fits a full name. 
        }
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
                tracker.add(prr.sym, sym);
                tracker(sym, `Waiting for definition of ${type}`, name);
            }
            f = await prr.prom;
        }
        return f;
    }
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
        const me = tracker.new(data.scope, 'Directive queued', {name, data}, parSym);
        const {sym} = me;
        me.id = `${name}:${src}=>${target}`;
        let dire = await weaver.waitForFunction('directives', name, sym);
    
        let scope = makeScope({tracking, context : data});
        let argProcessor = makeArgProcessor(scope, sym);
        tracker(sym, 'Processing directive arguments');
        try {
            console.log('run diry sym:', sym);
            let actualArgs = data.actualArgs =
                (await Promise.all(args.map(argProcessor))).
                    filter( (el => (typeof el !== 'undefined')  ) ); 
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
    weaver.addPieces = async function processWeb (collective) {
        let {web = {}, directives = [] } = collective; 
        delete collective.web;
        delete collective.directives;
        let {sym} = tracker.new(
            collective, 
            'Processing of web and directives started',
            {web, directives}
        );
    
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
            tracker(sym, 'beginning to process node', node);
            let {sym:nSym} = tracker.new(node.scope, 'Processing node', node);
            let vals; // local to piece values
            let prr = prWeb[name];
            if (!prr) {
                prr = prWeb[name] = makePromise('N?', name);
            }
            tracker(nSym, 'Promising node', prr);
            if (has(node,'pieces')) {
                let sym = nSym; // for make promise piece to use
                tracker(sym, 'About to start computing values for the code');
                let pieceProms = node.pieces.map( 
                    async function singlePieceProcess (piece, idx) {
                        if (has(piece, 'value') ) {return piece.value;}
                        if  ( has(piece, 'cmd') )   {
                            let scope = makeScope({
                                tracking : 'creating piece ' + idx + ' of node ' + name, 
                                context : node }
                            );
                            tracker(sym, 'Calling command on piece', [idx, piece]);
                            let val = await runCommand.call(scope, piece, sym);
                            if ( (piece.indent) && ( typeof val === 'string') ) {
                                val  = val.replace(/\n/g, piece.indent );
                            }
                            tracker(sym, 'Command finished', [idx, val] ); 
                            piece.value = val;
                            return val;
                        }
                        tracker.fail(sym, 'Piece found without a value or cmd property', idx);
                        piece.value = '';
                        return piece.value;
                    }
                );
                vals = await Promise.all(pieceProms);
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
    weaver.parse = async function parse (text, prefix, textParserName, codeParserName) {
        let {sym} = tracker.new({id:prefix}, 'Retrieving parsers', [text.slice(0, 100),
            textParserName, codeParserName] );
        console.log('checking sym existence', sym);
        let textParser = await weaver.waitForFunction('parsers', textParserName, sym);
        let codeParser = await weaver.waitForFunction('parsers', codeParserName, sym);
    
        tracker(sym, 'About to parse text');
        let {web, directives} = textParser(text, {prefix, tracker: weaver.parseTracker});
        tracker(sym, 'Text parsing done', {web, directives});
    
        directives.forEach( (el) => {
            el.rawArgs = el.args;
            if (el.args) {
                tracker(sym, 'Parsing directive', el);
                let argPieces = codeParser({text: el.args, type:'args', start : el.scope.sourcepos[0]});
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
                let pieces = codeParser({text:code, type:'code', start});
                el.pieces = pieces; // in case it is needed as reference
                return acc.concat(pieces);
            }, []);
            tracker(sym, 'Processing transform for node', node.rawTransform);
            const transform = node.rawTransform || []; 
            node.transform = transform.reduce( (acc, el) => {
                let [start, text] = el;
                let pieces = codeParser({text, type:'transform', start});
                el.pieces = pieces;
                return acc.concat(pieces);
            }, []);
            if (node.transform.length === 0) { delete node.transform;}
            tracker(sym, 'Done processing node', [node.pieces, node.transform]);
        });
        //weaver.full({web, directives});
        tracker(sym, 'Done processing text and code');
        return {web, directives};
    };
    weaver.parseTracker = () => {};
    weaver.getNode = function getNode (nodeName, sym) {
        let weaver = this;
        let prr = weaver.p.web[nodeName];
        if (!prr) {
            prr = makePromise('N?', nodeName);
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
        let report = {};
        ['promises', 'failed'].forEach( (type) => {
            let tracked = Object.getOwnPropertySymbols(tracker[type]);
            if (tracked.length > 0) {
            // should have a connective web of things
                let parents = tracked.map( 
                    (s) => tracker[type][s].parent 
                ).filter( (el) => el );
                let blockers = tracked.filter( (symbol) => {
                    return !parents.includes(symbol);    
                });
                let trail = blockers.map( (child) => {
                    let line = [];
                    let cur = child;
                    let count = 0;
                    while (cur && count < tracker.reporterDepth) {
                        let symObj = tracker.get(cur);
                        //weaver.full('Blocked', symObj);
                        line.push([symObj.id || 'No ID', symObj]);
                        cur = symObj.parent;
                        count += 1;
                    }
                    return line;
                });
                report[type] = {
                    blockers,
                    trail,
                    msg : trail.map( 
                        (line) => {
                            return line.
                                map( (el) => { return el[0].replace(/ /g, '-'); } ).
                                join(' is blocking ');
                        }).
                        join('\n---\n')
                };
            } else {
                report[type] = {} ;
            }
        });
        let unresolved = weaver.keyDiff(weaver.p, weaver.v);
        console.log(report);
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
