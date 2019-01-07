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
                
These are inlined into run command and are just placeholders here. 

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

        const makePromise = _"make promise";
        const makeArgProcessor = _"arg processor";
        const runCommand = _"run command";
        const makeScope = _"make scope";

        //external api, probably should make read only
        weaver.addCommands = _"add commands";
        weaver.addDirectives =  _"add directives";
        weaver.runDirective = _"run directive";
        weaver.addPieces = _"process pieces";


        return weaver;
    };

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

    async function processWeb (web) {
        const names = Object.keys(web);
        const wvWeb = weaver.v.web;
        const prWeb = weaver.p.web;
        let proms = names.map( async function (name) {
            let node = web[name];
            let vals; // local to piece values
            _":store node"
            _":promise the pieces"
            _":transform the value"
            prr.resolve(node.value);
            tracker('node ' + name + ' value is computed', {name, value: node.value});
            return node.value;
        });

The map above generates a lot of promises and the await below waits for them.
When done, we zip them into an object and return the values. This could be
useful in an interactive environment, such as a browser, or for debugging to
see what pieces became what. 

        let vals = await Promise.all(proms);
        let ret = {};
        names.forEach( (name, idx) => {
            ret[name] = vals[idx];
        });

        tracker('a web of nodes is done', {web});
        return ret;

    }
    
[store node]()

Here we need to stash the node. Pretty simple; just check for redundancy and
throw error if so. 

We also setup the ultimate promise for when the value is returned. We need to
check if it already exists. If so, we use it. If not, we set it up. 

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


[promise the pieces]()

Here we setup and execute the promising of the pieces. 

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


[transform the value]()

The transform should be a command, probably a pipe of a sequence of commands. 

We start by checking if all the vals are strings. If so, then we concatenate
them. 
    
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



## Run directive

Each directive is fed in one at a time. The first argument is a directive
name, the second is an array of arguments to feed in. 

This is async as the directive may not exist at calling time. The promise
should return the eventual function.

Directives and commands are similar, but directives have the weaver as context
while commands only have the scope available which should hopefully not be
able to see the weaver. This is intentional. Commands are intended to be pure
functions while directives are the messy state-messing procedures. 


    async function runDirective (name, data) {
        let {
            tracking=`directive ${name} from ${data.scope.fullname}`,
            args = [],
            target = '',
            src = ''
        } = data;
        tracker('directive queued', {tracking, name});
        _"wait for function | sub VNAME, dire, TYPE, directives"
        let scope = makeScope({tracking, context : data});
        let argProcessor = makeArgProcessor(scope);
        tracker('processing directive arguments', {tracking, name, args, scope});

The map produces potential promises to wait for, but we don't care about the
values since they resolve to the args anyway. The values get assigned into the
args under value. We just need to pause to have it all resolved. actualArgs
contains the actual values. 

        await Promise.all(args.map(argProcessor) );
        let actualArgs = data.actualArgs = args.map( (el) => el.value); 
        tracker('run directive', {tracking, name, actualArgs, scope});
        console.log('RD', name, actualArgs, '\nARGS', args);
        let ret = await dire.call({weaver, scope}, {src, target, args:actualArgs});
        data.value = ret;
        tracker('directive done', {tracking, name, result:ret});
        return data;
    }



### wait for function

This is a generic bit of code that works for both the directives and commands.

    let VNAME = weaver.v.TYPE[name]; 
    if (!VNAME) {
        let prr = weaver.p.TYPE[name];
        if (!prr) {
            prr = makePromise();
            weaver.p.TYPE[name] = prr;
        } VNAME = await prr.prom;
    }


## Arg Processor

This processes arguments for commands and directives. We check for if it is an
object with 'cmd' or 'value' (it should be) and if so, we respond accordingly
(process command or return value).
Otherwise, we just return the argument. 


We allow arg processors access to a scope which manages values, also in an
async way. 
   

    function makeArgProcessor(state) {
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
    }

## Run Command

This runs a specific command. It is similar to running directives, but we have
some built-in commands, specifically, pipe and get, that go beyond what the
rest of the commands can do. Pipe short circuits the argument processing to
instead do it sequentially. Get will get a value from another piece. 

This modifies the piece and returns it in a way that it has a value. 

If it has an input property, then that becomes the first argument. Pipe is
generally the input property maker. 

    async function runCommand (piece = {}) {
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
            _":pipe"
        } else if (cmd === 'get') {
            _":get"
        } else if (cmd === 'compose') {
            _":compose"
        } else {
            _"wait for function | sub VNAME, comm, TYPE, commands, name, cmd"
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
    }


[pipe]()

The arguments should all be commands and pipe one to another. The first
argument is what gets the input unless the input is undefined. Thus, there is
no input into the first command. For the standard underscore setup, the first
bit before the pipe is transformed into a get and that is what the pipe sees. 

    let input;
    let pipes = args;
    tracker('pipe started', {tracking, pipes, scope});

As this sequential piping, we use a for loop along with the sync. 

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


[compose]()

This is a special command that creates a command out of other commands and
arguments. It can be used in functions acting on lists, such as map, created
inline or the command directive can create a stand-alone function. 

This can also do partial application, if only one function is passed in. One
can leave slots open with a special syntax, namely strings of the form `$#`
will place the incoming argument at slot `#` into that place. The `#` can also
be a range, such as `1..3` or `1..` for a slice from 1 to whatever or `..3`
which is a slice up to 3. In either case, they are subbed in as is, not as a
new array. We can also use negative indices.  `$&` will direct
the previous input into that argument. By default (no specials), the first argument gets the
previous input, shifting everything else. If the output is undefined, no
shifting is done. 

To escape, leading dollar signs will be reduced by 1 if more than 1 and no
other action is taken. 

If the input is undefined from a function (also initial), then we use the
given arguments. Generally, this is the first one. This is ignored if any
argument has the special syntax above. 

    tracker('composing', {tracking, args, scope});
    let funs = args.slice(0);
    ret = async function composed (...newArgs) {

TODO: Redo this with the new argument convention of it being an object

 If inline, same scope, but if not, this uses scope of caller

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
                _":check for special"
            });

If the input was used, then we don't use it again. If it was not used, we see
if the input is undefined. If undefined, we don't use it and we will shift the
arguments into it unless there is a special involved. This gets complicated,
unfortunately. 

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

[check for special]()

A special is a string with a dollar sign in front.

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

This is where the complicated range semantics occur. If it is a single number,
then it gets matched with the first one and that is what is added. Otherwise,
it should be a range and the right, being part of slice, should have an extra
1. 

We are totally abusing the boolean check here and the replace function. We
return an empty string which becomes false in boolean check if there is no
actual match. If there is a match it returns a 'done' string which becomes
true. This is because the replace function always returns a string. 

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


[get]()

This could be a separate command function, but it requires special access.

We have two possibilities: simple name or a regx (possibly multiple) that
should scan the current webnames and grab what is needed. 

    ret = [];
    let names = [];
    let arg = args[0];
    _":deal with arg not being a string"
    if (arg[0] === '/') {
        _":get via regex match"
    } else {
        let nodeName = arg;
        console.log('G1', nodeName);
        _":modify name"
        _":get promise for piece"
    }
    if (ret.length === 0) {
        ret = '';
    } else {
        ret = await Promise.all(ret);

We have the return values. If there is only one, we return that, otherwise we
zip up the two arrays into an object. 

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

[get promise for piece]()


    let prr = weaver.p.web[nodeName];
    if (!prr) {
        prr = makePromise();
        weaver.p.web[nodeName] = prr;
    }
    names.push(nodeName);
    ret.push(prr.prom);

[modify name]()

The get command might be provided with an incomplete name. We need to fill out
the details here. It should be available in the scope variable. 

    // TODO


[get via regex match]()

This is intended to allow for retrieving an object whose keys are node names
matching the passed in regex semantics; each time a `/` is encountered it
creates a new regex context. The level name can be obtained via `=1` (or 2, 3,
4). The fullname is `==`, majorname is `=_` and just the minor name is `=:`.
A backslashed regex will escape it from being regex separator and is used in
the level descent of the h5/6 headings:  `\/`.  These substitutions are made
and then it is run through a regex and filters out the keys on the available
web.  

TODO: actually implement this. 

    // nothing yet


[deal with arg not being a string]()

Most likely, arg is passed in as an object with a value in it. But we check
here anyway. 

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


## Add commands

This is the same as adding directives just different names. 

    _"add directives | sub directive, command, Directive, Command, dire, comm"


## Add directives

This is fairly simple. It takes in an object of directives: name is the name
of the directive and then it should point to a function that will be the
directive. It will be bound to the weaver object. A prefix is also available
to offset the names.

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

    function makePromise () {
        let rej, res, prom;
        prom = new Promise ( (resolve, reject) => {
            rej = reject;
            res = resolve;
        });
        return {reject:rej, resolve:res, prom};
    }

## Make Scope

This is a trivial function that makes a scope object. 

It contains a tracking statement and a context object that is either a webNode
or a directive data bit.

    function (obj = {}) {
        obj.tracking = obj.tracking || '';
        obj.context = obj.context || {};
        return obj;
    }

## Sample

This is a sample bare minimum program to show this works. 

    const Weaver = require('../core/index.js');
    const util = require('util');
    let weaver = new Weaver({}, ()=> {});
    
    /*(lab, args) =>
    {console.log(lab + ':', util.inspect(args, {depth:6})) } );*/

    web = {
        start : {pieces : [ 
            { value : 'hello'},
            {cmd: 'pipe', args: [
                { cmd : 'get', args: [{value:'nxt'}]},
                { cmd : 'flip', args : [{value:'b'}, {value:'e'}] }
            ]}
        ]},
        nxt : {pieces : [ {value : 'bye'} ]}
    };

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

[sample/weaver.js](# "save:")
