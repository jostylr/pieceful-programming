# Pieceful Core

This is the core of the pieceful processing. It is quite small as it contains
only the bare minimum function with no parsing. The basic part of this is to
weave together the pieces into the desired code. 

The module exports a function that initiates the weaving. It exposes feeders
that take in collections of pieces and directives, that can be fed as needed.
It will also expose trackers so that what has been completed and what remains
can be known. 

Custom commands and directives can also be added as needed. We create separate
weaves with all of their own commands, etc, to allow for lots of variations if
needed (flags leading to different behavior, for example). 

Note that directives are the IO and if there are no directives then nothing
external happens. The directives interface with the io object which should be
provided and synced up with the directives will call. There is also a debugger
function that can be provided that defaults to an empty function. It gets
called in the command and directive processors. 

    function Weaver (
        organs = {directives:{}, commands:{}, parsers:{}, env:{}}
    ) {
        if (!organs) {
            throw Error('Weaver requires commands, directives, parsers, etc');
        }
        const weaver = this;
        
        let tracker = weaver.tracker = _"tracker";
        tracker.log = _"tracker log";
        tracker.new = _"tracker new";
        tracker.fail = _"tracker fail";
        tracker.done = _"tracker done";
        tracker.get = _"tracker get";
        tracker.add = _"tracker add";
        tracker.self = _"tracker self";
        tracker.report = _"tracker report";
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
                
These are inlined into run command and are just placeholders here. 

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

        const makePromise = _"make promise";
        const makeArgProcessor = _"arg processor";
        const runCommand = _"run command";
        const makeScope = _"make scope";
        weaver.syntax = {
            descentSpecial : _"descent special",
            getFullNodeName : _"get full node name"
        };

        weaver.promiseLabels = {
            'parsers' : 'P',
            'directives' : 'D',
            'commands' : 'C',
            'nodes' : 'N'
        };
        
        //external api, probably should make read only
        weaver.waitForFunction = _"wait for function"
        weaver.addCommands = _"add commands";
        weaver.addDirectives =  _"add directives";
        weaver.addParsers = _"add parsers";
        weaver.runDirective = _"run directive";
        weaver.addPieces = _"process pieces";
        weaver.parse = _"parse";
        weaver.parseTracker = () => {};
        weaver.getNode = _"get node";
        weaver.run = _"run";
        weaver.keyDiff = _"key diff";
        weaver.twoLevelCopy = _"two level copy";


        weaver.v.commands.nodekeys = _"nodekeys";

        

        return weaver;
    }


### Module form

    /* eslint-disable no-console */
    //const util = require('util');
    module.exports = _"pieceful core";


[core/index.js](# "save:")

### Use example

    //parse some stuff

    //then run
    let weaver = new Weaver(io);
    weaver.addCommands( { name : function }});
    weaver.addDirectives( {name : function } });
    weaver.runDirectives( [ [directive name, args]] );
    weaver.addPieces( {name : { pieces: [], ...} });
    
The directives may load up other resources

The io command should be a set of functions that the directives can call to
get and send information as needed. They should expose a promise interface to
allow for awaits and rejections. 

## The flow

Each piece of the web has a pieces array. Those pieces are either as is or, if
an array, treated as a pipe of commands. Those commands can have arguments,
that themselves can be commands and so forth. Commands are meant to be purish,
returning an output. There is a scope-state available for the duration of
computing one command sequence, but generally the output of one command in the
sequence is inputted in as the first argument to the next. If the output is
undefined, then it is not passed along. If the final command yields undefined,
then it is not included. 

Once the pieces are computed, then there is a transform that takes the pieces
and converts them all into a single value, the one that the node represents.
Typically, the transform is a concatenation with special rules for
indentation. The commands for the transformation have access to the whole
node, including the computed pieces. 

Directives are similar, except that they have access to the whole weaver
object, including the io object. The commands for the arguments to the
directive does not, but after all of that is computed, the directive is called
and its scope includes access to weaver. 

## Run

This is the command for the runner to run with a single loading directive. The
idea is that at each stage, we have one master file that loads whatever else
needs to be loaded. 

The loader should have a src, target, args, and scope (identifier) as needed
for the directive calling. The load directive requires a src for loading the
file. Target is the prefix. 

We return all the nodes generated during this time. 

    async function run (loader) {
        let {directive} = loader;
        let {sym, scope} = tracker.new({scope:loader.scope}, 'Starting a new run', loader); 
        weaver.runDirective.call(scope, directive, loader, sym);
        _":orchestrate waiting for being done"
        tracker.done(sym);
        let report = tracker.report()
        let unresolved = weaver.keyDiff(weaver.p, weaver.v);
        return {report, unresolved};
    }


[orchestrate waiting for being done]()

We want to know when the processing is done. The IO stuff stores promises.
When those promises complete, we will do a couple of rounds of setTimeout to
ensure things are settled. After that, we check to find what stuff was
promised, but not present

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


   
### key diff

This will compare two objects with a heading : { keys: values} structure and
report that which is present in the first, but not the second. 

We use this by comparing the promises to the actual values. We can also use
this to compare the additions after adding pieces. 

    function keyDiff (larger, smaller) {
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
    }


### two level copy

This is a simple depth level 2 shallow copy of an object intended for a
heading : {keys: value}  object where the k-v object should be copied, but
values are what they were. This is useful, for example, for keeping the state
changes as we run through different runs from loading different files. 

    function copy (obj) {
        Object.keys(obj).
            reduce( (acc, heading) => {
                acc[heading] = Object.assign({}, obj[heading]);
                return acc;
            });
    }


## Process pieces

This is where we define the heart of the processing: getting a value out of a
node in the web. 

This expects a web of nodes, each with unique names and unique from any other
webs that are or were used. This is an asynchronous function. Nodes are
processed in async fashion and when all passed in nodes have been processed,
this function returns objects with names and values. Directives allow one to
operate directly with the nodes as they finish, but this is an alternate route
to get a perspective. If any nodes fail to process, a rejection is given to
the promise and that allows for some error tracking here. 

    async function processWeb (collective, parSym) {
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
            _":store promise"
            _":promise the pieces"
            _":transform the value"
            prr.resolve(node.value);
            _":store node"
            tracker(sym, 'node done', [name, node.value]);
            return [name, node.value];
        }));
        proms.then( () => {
            tracker(sym, 'All listed nodes processed');
        }).catch( (rej) => {
            tracker.fail(sym, 'Node processing went bad', rej);
        });



The map above generates a lot of promises and the await below waits for them.
The return consists of the full object as well as the web and directives
completed versions. The promise might get rejected by one of the other
promises. If so, we just return the done tracker. 

        try {
            let [dirDone, webDone] = await Promise.all([dproms, proms]);
            let me = tracker.done(sym, 'Web and directives done');
            return {tracked:me, directives: dirDone, web: webDone};
        } catch (e) {
            return {tracked:tracker.get(sym)};
        }
    }
    
[store promise]()

We setup the ultimate promise for when the value is returned. We need to
check if it already exists. If so, we use it. If not, we set it up. 

    let prr = prWeb[name];
    if (!prr) {
        prr = prWeb[name] = makePromise('nodes', name);
    }
    let nSym = prr.sym;
    tracker.self(nSym, 'Starting to process node', node); 

[store node]()

Here we need to stash the node. Pretty simple; just check for redundancy and
throw error if so. 

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

[promise the pieces]()

Here we setup and execute the promising of the pieces. 

    if (has(node,'pieces')) {
        let sym = nSym; // for make promise piece to use
        tracker(sym, 'About to start computing values for the code');
        _":make promise piece"
        tracker(sym, 'Node values computed', vals);
    } else {
        vals = [''];
        tracker(nSym, 'No code pieces to process');
    }


[make promise piece]()

This is split off so compile can just place it there as well. 

This is a loop so that we process the pieces in a node sequentially. 

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
                _":indent"
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
    


[indent]()

Another fact is figuring out the hanging indent. The code block starting place
is just part of the concatenation, but the code underneath needs to be
indented properly. If the starting is on a line by itself then any indent is
applied to the rest. But if there is non-white space on the starting line
before the block, then the indent decided for that line is what is applied to
the rest. This is not going to cover all possible uses, but it should cover
all reasonable uses such as `fname = _"function definition"`.


    if ( (piece.indent) && ( typeof val === 'string') ) {
        val  = val.replace(/\n/g, piece.indent );
    }


[transform the value]()

The transform should be a command, probably a pipe of a sequence of commands. 

We start by checking if all the vals are strings. If so, then we concatenate
them. 
    
The transform is an array of piped commands. Probably just one, but in
any case, we loop over it feeding the last value in as an input which should
become the first argument of each pipe command. 

Note that this need not be a pipe. It can be a single command and it will
still just work with the input going in as the first argument. 

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


## Parse

This does the parsing of a piece of text into nodes and then it takes each
of the nodes and does the underpiping parsing. 

So the textParsers, such as commonmark, take in a text document and returns an
object with two subobjects: web which is an object of nodes whose keys are the
full names and directives which is an array consisting of each directive in
the order found. 

A node in a web has a variety of properties. The two we care about at the
parsing level are rawTransform and code. Both of these are arrays and their
text objects need to be converted into a parsed object that can then be
executed after this step. 

A directive has an args string which is the bit that needs to be parsed out.
We do not have the location of where the args are started so it will be off a
bit in the line numbering reporting. 


    async function parse (text, prefix, textParserName, codeParserName, parSym) {
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
    }

# Run directive

Each directive is fed in one at a time. The first argument is a directive
name, the second is an array of arguments to feed in. 
This is async as the directive may not exist at calling time. The promise
should return the eventual function.

Directives and commands are similar, but directives have the weaver as context
while commands only have the scope available which should hopefully not be
able to see the weaver. This is intentional. Commands are intended to be pure
functions while directives are the messy state-messing procedures. 

The data passed into the directive also includes the scope object from parsing
which contains the name and location data. 

    async function runDirective (name, data, parSym) {
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

We will sequentially run through the arguments. 

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
    }



### wait for function

This is a generic bit of code that works for both the directives and commands.


    async function waitForFunction ( type, name, sym) {
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
    }


## Arg Processor

This processes arguments for commands and directives. We check for if it is an
object with 'cmd' or 'value' (it should be) and if so, we respond accordingly
(process command or return value).
Otherwise, we just return the argument. 


We allow arg processors access to a scope which manages values, also in an
async way. 
   
Undefined can happen if there is no argument or both value and cmd are not
present. Undefined gets filtered out afterwards. 

    function makeArgProcessor(state, sym) {
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
    }
i
## Run Command

This runs a specific command. It is similar to running directives, but we have
some built-in commands, specifically, pipe and get, that go beyond what the
rest of the commands can do. Pipe short circuits the argument processing to
instead do it sequentially. Get will get a value from another piece. 

This modifies the piece and returns it in a way that it has a value. 

If it has an input property, then that becomes the first argument. Pipe is
generally the input property maker. But if a piece has the bind property,
then the insertion happens where the bind specifies.  

    async function runCommand (piece = {}, sym) {
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
        _"pipe:deal with pipe inputs"
        let ret;




        if (cmd === 'pipe') {
            _"pipe"
        } else if (cmd === 'get') {
            _"get"
        } else if ((cmd === 'compose') || (cmd === '*' )) {
            _"compose"
        } else if (cmd === 'compile') {
            _"compile"
        } else if (cmd === 'log') {
            _"log"
        } else { 
            if ( (cmd.length > 1) && (cmd[cmd.length-1] === '*') ) {
                _"sequence"
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
    }



### Pipe

The arguments should all be commands and pipe one to another. The first
argument is what gets the input unless the input is undefined. Thus, there is
no input into the first command. For the standard underscore setup, the first
bit before the pipe is transformed into a get and that is what the pipe sees. 

We add pipe to the scope as some commands, such as indent, may need access to
this parent object.

    let input;
    let pipes = args;
    tracker(sym, 'pipe started');

As this sequential piping, we use a for loop along with the sync. 

Each piece becomes the next input with its value attribute being what will
eventually be used. 

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


[deal with pipe inputs]()

So pipe generates an inputs array for each piece in a pipe, which can be
accessed with the command pipeInputs. 

    if (has(piece, 'inputs') ) {
        let inputs = piece.inputs;
        let input = inputs[0];

We first check for arguments who has the command 'pipeInput'. This is only for
the current level of args; no lower levels can access this. For that, one
should use named scope variables.  

        let skip = false;
        args.forEach( (el, idx) => {
            if (el.cmd && (el.cmd === 'pipeInput') ) {
                if (el.args && el.args.length) {
                    if (el.args.length === 1) {
                        if (el.args[0] === '!') {

`@!` will deny the input from being used. It does this by giving a value of
undefined for the args. This means that it will get skipped in the feeding of
the arguments. 

                            args[idx].value = undefined;
                            skip = true;
                        } else if (el.args[0][0] === '^') {
                        
This is to allow the previous input to get passed on instead of this one. 

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
            
Bind being true means we ignore the input. Note that this is ignored by the
pipeInput command. This is only meant to prevent the automatic insertion of
piping into commands that don't want it.             

                if (piece.bind !== true) {
                    args.splice(piece.bind, 0, input);
                } 
            } else {
                args.unshift(input);
            }
        }
    }


### Sequence

This allows for commands to process the args selectively. 
This gets triggered by a command name ending in `*`, similar to the
generator syntax for js functions (that star is on the reserved word function,
but similar enough). Such commands should expect a single argument, the
sequencer function. One use case is that of a switch (if/else) kind of setup
where we first execute an argument to decide what other argument to run. 


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



### Compose

This is a special command that creates a command out of other commands and
arguments. It can be used in functions acting on lists, such as map, created
inline or the command directive can create a stand-alone function. 

This can also do partial application, if only one function is passed in. One
can leave slots open (anywhere in the explicit args chain) with a special
syntax, namely strings of the form `$#` will place the incoming argument at
slot `#` into that place. 

If the dollar sign has text, then we use that to get something from the old
scope. This is one way; we don't allow for modification of the old scope from
the composition.

The composition is fed into a pipes command. This means that one can do the
scope and input stuff as usual and it should just work as if pipe was called
instead. 

If the composed command is called by a pipe, then it is on the caller as to
where pipe arguments go. So we can just use the passed in arguments. 

To escape, leading dollar signs will be reduced by 1 if more than 1 and no
other action is taken. Note these are considered as text objects. If passing
in text that consists of a leading dollar sign, use multiple ones. 

If the input is undefined from a function (also initial), then we use the
given arguments. Generally, this is the first one. This is ignored if any
argument has the special syntax above. 

    tracker(sym, 'composing');
    let funs = JSON.stringify(args);
    let oldScope = scope;
    let oldSym = sym;
    ret = async function composed (...newArgs) {

 If inline, same scope, but if not, `this` will be the scope of caller.

        let {scope, sym} = this;
        
We need to copy the entire args chain as our run command modifies it. 

        let localFuns = JSON.parse(funs);
        tracker(sym, 'composed command called', {oldSym, oldScope, funs});

Next we run through all levels of the args, looking for the special syntax. If
so, then we slot in the newArgs or, if an oldScope object, that value for it. 

The newArgs have not been evaluated at this point except, potentially, for
inputs. They will be replacing arguments in the chain and they will be called
as usual under execution of the pipes command. We use the descentSpecials
command to do the special work. For oldScope, these are actual values, so we
will need to wrap them up in a value argument.



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


#### Descent Special

So this is a recursive descent function that goes down all the argument chains
and replaces any composition special values with the appropriate value from the arguments or scope. For arguments, we need to extract the values. 

We return an array. This facilitates having a different number of arguments
then we expect. 

This is all synchronous as we are not doing any evaluations or waiting for
anything; that should be done before or after, depending. 

    function descentSpecial (arr, args, scope) {
        return arr.reduce( (ret, piece) => {
            if (has(piece, 'value') ) { //base case
                let val = piece.value;

We only do anything if there is a leading dollar sign. 

                if ( (typeof val === 'string') && (val[0] === '$') ) {
                    piece.special = val;
                    val = val.slice(1);

The `..` is the only version that does not blindly push the piece onto the
array. So we check that here, and if it happens, we return. Otherwise, we do
that pushing at the end.   

                    if (val.match(/\.\./) ) { //splicing
                        _":splice"
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
    }

[splice]()

This handles having a range of values. We split on the dots and then push all
of the arguments so named. 

    let splice = val.split('..').map((el) => parseInt(el, 10) );
    let start = splice[0] || 0;
    let end = splice[1] || args.length;
    args.slice(start, end).forEach( (el, idx) => {
        el.special = val + ':' + (start + idx);
        ret.push(el); 
    });




### Get

This could be a separate command function, but it requires special access.

We assume this command is given names of sections, typically a single one, but
possibly an array. 

    let arg = args[0].value || '';
    if (arg === '') { // no actual call for anything so empty value return
        ret = '';
    } else if (Array.isArray(arg) ) { // list of sections
        let names = [];
        let proms = _":loop through the names"
        let vals = (await Promise.all(proms)).map(el => el.value);
        ret = {};
        _":zip names vals"
    } else {
        _":promise node value"
        ret = (await nodeProm);
    }

[promise node value]()

    let nodeName = weaver.syntax.getFullNodeName(arg, scope.context);
    let nodeProm = weaver.getNode(nodeName, sym);

[loop through the names]()

    arg.map( (arg) => {
        _":promise node value"
        names.push(nodeName);
        return nodeProm;
    });

[zip names vals]()

    vals.forEach( (el, idx) => {
        ret[names[idx]] = el;
    } );


### Get Node

This is an external function (used by directive save, for example), to grab a
node. 

    function getNode (nodeName, sym) {
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
    }


#### Get Full Node Name

This is where the fun is. The scope variable has a context property which is
the current node being processed. This has the various bits of information we
need. 

So the bits of information are prefix, majorname, lv1, lv2, lv3, lv4,
fullname.

We have various shorthands:

* A single `::` means we use the current prefix with a `^` which represents
  the initial node if there is no name. 
* A single `:` means we use the majorname. 
* Exactly `#` means we use the lvl1 name. 
* Exactly `#:` then we use the fullname 
* A leading `:` means we prepend the majorname. 
* A `#:` followed by stuff is a level1 and then the frag.
* The `../` means we switch from lv3 to lv2 or from lv2 to lv1. Two of these
  means we switch to lv1. We can then descend using more slashes to get to lv2
  or lv3. 
* No `::` means we should append the current prefix. 
  

Generally, the name information is in scope of curNode, but this was coded
with that not in mind, hence the switcheroo. 

TODO: Probably should convert the curNode name.

    function getFullNodeName (frag, curNode) {
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

[junk]()

This was an attempt to add waiting for prefix definitions. The user experience
for either having to wait for a prefix or just having a global one both is
kind of dodgy, but I think the attitude is, define the prefix once and that's
what one goes with. Global, across the files. 


At this point we have a prefix. We need to see if the prefix stands for some
other prefix.  

        let [pre, rest] = frag.split('::');
        let prefix = weaver.prefixes(curNode.prefix, pre);
        if (prefix === false) {
            let prr = weaver.makePromise('PRE', pre, sym);
            tracker(sym, 'Waiting for a prefix', {pre, prom:prr});
            tracker.add(sym, 'Prefix waiting', prr.sym);
            prefix = await prr.prom
        } else if (typeof prefix !== 'string') {
            tracker(sym, 'Waiting for a prefix', {pre, prom:prefix});
            tracker.add(sym, 'Prefix waiting', prefix.sym);
            prefix = await prefix.prom;
        }
        return prefix + '::' + rest;

    }

### Log

This command requires seeing the environment env which is not something most
commands can access. So here is special access. This will log all arguments of
the function to env.log and pass along the first argument. 

    tracker(sym, 'logging arguments');
    env.log('Log:' + args.join('\n---\n') + '\n', 5, args); 
    ret = args[0];

### Compile

This takes the incoming text and compiles it as if it is a piece of code. It
takes as its argument a name to know the compile by in reference to the gets
that may be in it, but the compilation itself is not added to the nodes.
Instead, it produces the return value of compiling it. 

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
        _":make fake scope"

        let node = {
            pieces : parsed, 
            scope : fakeScope
        };
        
        let vals; 

        let name = 'Fake Compile Name - ' + fakeName;
        tracker(sym, 'About to start compiling', name);
        _"process pieces:make promise piece"

        tracker(sym, 'Compiling done', vals);
        ret = vals.join(''); //no transform; if make a nicer version in transform then use that

    }

[make fake scope]()


TODO Now split it up to assemble the levels. Should be in its own helper function?
   
Until it is, we will assume to not care about the lv2 or lv3 stuff or minors
as the name. Just extracting lv1 and prefix. Why? because that's probably all
we need and the rest is annoying.

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

        

### NodeKeys

This is an idea to extract the current list of node keys that match a given
regular expression. This will return an array of full names. 

The idea is the string should be of the form `?::?/?/?:?` at its fullest with
regex stuff in there though `#` means use current. One should use `*` for any
kind of match. Empty is just that. So `*::*/*/*:*` returns all names. We also
look for various matches without various pieces:

* `*::*/*/*:*` Should be able to specify anything with this syntax. 
* No double prefix implies use current prefix. 
* Something with no slashes or colons means just lv1 name
* Something with a leading colon means match on the lv4 name, fixing prefix to
  be current
* With a leading slash, one means lv2 names, current prefix. 

This could get a little into the weeds, but I think this is sufficient for
what I have wanted in the past. 

Multiple arguments will lead to an `and` effect. 

    function nodeKeys (...args) {
        let context = this.context;
        return args.reduce( (list, filter) => {
            let f = _":make comparator";
            return list.filter( (name) => {
                return f(name);
            });
        }, Object.keys(weaver.v.web) );
    }

[make comparator]()

So this is the core bit. We try to return a directed function that knows how
to do the comparing. 

    (function (filter) {

Prefix is either specified as a regexish or we assume it is the same as the
current node (one would assume pretty typical because it is hard to know
whether other prefixes have been loaded). 

        let prefix, lv1, lv2, lv3, lv4;

        _":prefix"
        _":lv4"
        _":lv2 and lv3"
        _":lv1"

        return function (name) {
            let c = weaver.v.web[name].scope;
            return (prefix(c) && lv4(c) && lv3(c) && lv2(c) && lv1(c));
        };
    })(filter)


[prefix]()

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
      
[lv4]()

Next up is the minor part, lv4. This is also not too bad. Slice from the end,
assume none if nothing given. Keep in mind a hash mark indicates using the
context name. 
        
    ind = filter.indexOf(':');
    if (ind !== -1) {
        let lv4Reg = filter.slice(ind+1);
        filter = filter.slice(0,ind);
        _":lvreg"
    } else {
        _":none| sub #,4"
    }


[lv2 and lv3]()

Next up is slicing off any potential slashes. We assume the presence of one
slice indicates lv2 while the presence of two gives us lv2 and lv3. If no
slashes, then we will ignore anything with lv2 or lv3.

    ind = filter.indexOf('/');
    if (ind !== -1) {
        let scndInd = filter.indexOf('/', ind+1);
        if (scndInd !== -1) {

We have two slashes so we deal with lv2 and lv3. 

            let lv2Reg = filter.slice(ind+1, scndInd);
            let lv3Reg = filter.slice(scndInd+1);
            filter = filter.slice(0,ind);
            _":lvreg | sub 4, 2"
            _":lvreg | sub 4, 3"
        } else {
            
Just one slash so lv2 is being conditioned on and lv3 should be empty. 

            let lv2Reg = filter.slice(ind+1);
            filter = filter.slice(0,ind);
            _":lvreg | sub 4, 2"
            _":none|sub #,3"
        }
    } else {
        _":none| sub #,3"
        _":none| sub #,2"
    }

[lv1]()

And now we handle the main part. This is lv1only. There may be nothing at this
point, in which case we allow a permissive filter

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




        
[none]()

This looks for no property at a certain level. 

    lv# = function (c) {
        return !(has(c, 'lv#'));
    };


[lvreg]()

This creates the matching functions for the lv2-4;

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



## Add commands

This is the same as adding directives just different names. 

    _"add directives | sub directive, command, Directive, Command, dire, comm"

## Add parsers

This is the same as adding directives just different names. 

    _"add directives | sub directive, parser, Directive, Parser, dire, pars"


## Add directives

This is fairly simple. It takes in an object of directives: name is the name
of the directive and then it should point to a function that will be the
directive. It will be bound to the weaver object. A prefix is also available
to offset the names.

TODO: Replace tracking with sym stuff. 


    function (directives = {}, prefix='') {
        let weDirectives = weaver.v.directives;
        let weWait = weaver.p.directives;
        Object.keys(directives).forEach( (key) => {
            const name = prefix + key;
            const old = weDirectives[name];
            const dire = directives[key];

We check whether we are overwriting a function with a new 

            if (old && old.original !== dire.toString() ) {
                tracker('Reassigning directive name', {
                    name, oldF: old.toString(), newF:dire.toString()
                });
                throw new Error('Reassigning directive ' + name );
            }

We assign the directive whether it is new or not. We store the original
function's string because binding will create an unhelpful string of native
code. 

            tracker('adding new directive', {name});
            let f = weDirectives[name] = dire;

We then resolve the promise that waits for the directive definition, if any.

            let prom = weWait[name];
            if (prom) {
                prom.resolve(f);
            }
        });

    }   


## Make promise

This is a simple utility that allows for the creation of an object consisting
of a promise, rejection, and resolution. This is intended to be used for when
requests to an object predates even the notion of its existence. 

    function makePromise (type, name) {
        let rej, res, prom;
        prom = new Promise ( (resolve, reject) => {
            rej = reject;
            res = resolve;
        });
        let t = weaver.promiseLabels[type] || type
        prom.id = `${t}/${name}`;
        let {sym} = tracker.new(prom.id, 'Making new promise', prom);
        prom.
            then( (res) => {tracker.done(sym, 'Promise resolved', res);}).
            catch( (rej) => {tracker.fail(sym, 'Promise failed', rej);});

        return {reject:rej, resolve:res, prom, sym};
    }

## Make Scope

This is a trivial function that makes a scope object. 

It contains a tracking statement and a context object that is either a webNode
or a directive data bit.

    function (obj = {}) {
        obj.tracking = obj.tracking || '';
        obj.context = obj.context || {};
        obj.vars = obj.vars || {}; //for using to store stuff in shared context. 
        obj.top = obj.top || {}; //the top piece of a piece chain
        return obj;
    }


## Tracker

This tracks what is going on with the various pieces. It works by creating a
symbol, using tracker.new, that points to the relevant data. When it is done,
it is removed from the promises. 

The basic tracker function takes in a symbol, a log string and possibly other
stuff. 
    
    function trackerShell (sym, str, args) {
        return tracker.log(sym, str, args);
    }

### Tracker log

This is what tracker calls so that it can be changed. I just enjoy typing only
tracker. 

    function logTracker (sym, str, args) {
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
    }


### Tracker get

This just gets the symbol. Just like in log, except no warning if pulling a
done or failed one. 

    function getTracker (sym) {
        let me = tracker.promises[sym] ||
            tracker.finished[sym] || 
            tracker.failed[sym];
        if (!me) {throw Error('no corresponding tracker symbol');}
        return me;
    }

### Tracker new

This creates the symbol. The first argument should either be an id string or
an object containing an id string per scope and id. 

    function newTracker (scope, str = '', args) {
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
            _":scope and id"
        }
        tracker.promises[sym] = me;
        tracker.log(sym, 'New Symbol Established', scope);
        tracker.log(sym, str, args);
        return me;
    }

[scope and id]()

This is where we try to get the scope or an id for the object. Scopes may be
scopes or they may be things that contain a context which may be a scope or
which may contain a scope. There hopefully is an id or a fullname on the
scope. 

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

### Tracker self

This is used to add the quintessential self related to the tracker. It
overwrites anything that was there (probably an id)

    function selfTracker (sym, str = '', self) {
        let me = tracker.log(sym, str, self);
        me.self = self;
        return me;
    }


### Tracker Add

This adds a dependency to the tracker object. getNode does this. 

    function addTracker (sym, str = '', needy) {
        let me = tracker.log(sym, str, needy);
        me.needsMe.push(needy);
        return me;
    }

### Tracker Done

Done removes sym from promises and passes along any arguments to tracker. 

    function doneTracker (sym, str, args) {
        let me = tracker.log(sym, 'DONE: ' + (str || ''), args);
        tracker.finished[sym] = me;
        me.type = 'finished';
        delete tracker.promises[sym];
        return me;
    }
  

### Tracker Fail

The fail option is if something goes wrong. We could throw an error here
but...

    function failTracker (sym, str, args) {
        let err = 'FAIL: ' + (str || '');
        let me = tracker.log(sym, err, args);
        tracker.failed[sym] = me;
        me.type = 'failed';
        me.failed = [err,  args];
        delete tracker.promises[sym];
        env.log(err, args);
        return me;
    }

### Tracker id

This puts an explicit label on the object for tracking purposes.

    function (sym, id) {
        let me = tracker.log(sym, 'New Identifier: ' + id) ;
        me.id = id;
        return me;
    }



### Tracker report 

We start by looking at failures. If there are none, then we look at the one
that have neither finished nor failed. 

We should report all the failed ones and the stuff that depends on them. For
the blocked, we would like to get to the root of the problem and only report
the chain of blockers. 

    function reportTracker (indent = '  ') {
        let report;
        
        let mapper = _":mapper";   

        let joiner = _":joiner";

        let root = Object.getOwnPropertySymbols(tracker.failed);

        if (root.length > 0) {
            let ids = root.map(mapper);
            report = console.log(ids);
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
                report = 'Did not finish:\n' + 
                    ids.map( (root) => joiner(root, indent) ).
                    join('\n');
            }   
        }
        return report;
    }

[mapper]()

This should return a set of arrays with `[id, [...]` structure. 

    (el) => {
        let me = tracker.get(el);
        let id = me.id;
        if (!id) { env.log(me); id = 'No-ID'; }
        if (me.needsMe.length > 0) {
            let ids = me.needsMe.map(mapper);    
            return [id, ids];
        } else {
            return [id, []];
        }
    }


[joiner]() 

This creates a string to report. It uses indent.

    function recurse (arr, curIndent) {
        let id = arr[0];
        let ids = arr[1];
        if ( (Array.isArray(ids) ) && ( ids.length > 0)) {
            let trails = ids.
                map( (arr) => recurse(arr, curIndent + indent)).
                map( (str) => id + '\n' + curIndent + str).
                join( '\n');
            return trails;
        } else {
            return id;
        }
    }
        


[junk]()

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
                let symObj = tracker.get(cur);
                //weaver.full('Blocked', symObj);
                line.push([symObj.id || 'No ID', symObj]);
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



## Sample

This is a sample bare minimum program to show this works. 

    const Weaver = require('../core/index.js');
    const util = require('util');
    let weaver = new Weaver({}, 
        () => {}
       // (note, data)=> {console.log(note + ':', util.inspect(data, {depth:6}) );}
    );
    
    /*(lab, args) =>
    {console.log(lab + ':', util.inspect(args, {depth:6})) } );*/

    web = {
        start : {pieces : [ 
            { value : 'hello '},
            {cmd: 'pipe', args: [
                { cmd : 'get', args: [{value:'nxt'}]},
                { cmd : 'flip', args : [{value:'better'}, {value:'e'}] }
            ]}
        ]},
        nxt : {pieces : [ {value : 'bye'} ]}
    };

    weaver.getNode('nxt').then( (node) => console.log('printing nxt:', node));

    weaver.addPieces(web).then( (values) => console.log(values) );
    weaver.addCommands({
        flip : async function (text, ...args) {
            console.log('FLIP', text, args);
            args.forEach( (str) => {
                text = text.replace(str, str.toUpperCase());
            }); 
            console.log('FLIP DONE', text);
            return text;
            }
        }
    );
    weaver.runDirective('out', { args: [
        {value : 'awesome'}, 
        { cmd : 'get', args: [{value:'start'}]},
        { cmd : 'pipe', args : [
            {cmd : 'get', args : [{value:'nxt'}]},
            {cmd : 'flip', args: [{value:'y'}]}
        ]}
    ], scope: {fullname: 'here'}}, 'out test');
    weaver.addDirectives({
        out : async function (data) {
            console.log(data);
            let [name, text, again] = data.args;
            let {context} = this;
            console.log(`${name}: ${text} -- ${again}`);
            return 'done';
        }
    });

    setTimeout( () => {console.log('timed out');});



[sample/weaver.js](# "save:")
