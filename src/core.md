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

        const makePromise = _"make promise";
        const makeArgProcessor = _"arg processor";
        const runCommand = _"run command";
        const makeScope = _"make scope";
        weaver.syntax = {
            descentSpecial : _"descent special",
            getFullNodeName : _"get full node name",
        };
        
        //external api, probably should make read only
        weaver.addCommands = _"add commands";
        weaver.addDirectives =  _"add directives";
        weaver.runDirective = _"run directive";
        weaver.addPieces = _"process pieces";
        
        weaver.v.commands.nodekeys = _"nodekeys";


        return weaver;
    };


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
            if (!arg) {
                return arg;
            }
            if (arg.hasOwnProperty('value') ) {
                return arg.value;
            } else if (arg.cmd) {
                return (await runCommand.call(state, arg)).value;
            } else {

This can happen if a terminator is found with no value. Undefined seems
appropriate here. 

                return undefined;
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
generally the input property maker. But if a piece has the bind property,
then the insertion happens 

    async function runCommand (piece = {}) {
        let scope = this;
        if (piece.hasOwnProperty('value') ) { return piece;}
        if (!piece.cmd) { 
            tracker('run command called but no command to execute',
                {piece,scope});
            throw new Error('no command to execute: ' + scope.tracking);
        }
        let {cmd, args=[]} = piece;
        let override;
        _"pipe:deal with pipe inputs"
        let {tracking = ''} = scope;
        let ret;
        tracker('command called', {tracking, cmd, piece});
        if (cmd === 'pipe') {
            _"pipe"
        } else if (cmd === 'get') {
            _"get"
        } else if (cmd === 'compose') {
            _"compose"
        } else { 
            if ( (cmd.length > 1) && (cmd[cmd.length-1] === '*') ) {
                _"sequence"
            } 
            _"wait for function | sub VNAME, comm, TYPE, commands, name, cmd"
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
    }



### Pipe

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


[deal with pipe inputs]()

So pipe generates an inputs array for each piece in a pipe, which can be
accessed with the command pipeInputs. 

    if (piece.hasOwnProperty('inputs') ) {
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
                } else {
                    skip = true;
                    args[idx].value = input.value;
                }
            }
        });
        if ( (!skip) && (input && (typeof input.value !== 'undefined') ) ) {
            if (piece.hasOwnProperty('bind') ) {
            
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
sequencer function. 

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



### Compose

This is a special command that creates a command out of other commands and
arguments. It can be used in functions acting on lists, such as map, created
inline or the command directive can create a stand-alone function. 

This can also do partial application, if only one function is passed in. One
can leave slots open (anywhere in the explict args chain) with a special
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

    tracker('composing', {tracking, args, scope});
    let funs = args;
    let oldScope = scope;
    ret = async function composed (...newArgs) {

 If inline, same scope, but if not, `this` will be the scope of caller.

        let scope = this;
        
We need to copy the entire args chain as our run command modifies it. 

        funs = JSON.parse(JSON.stringify(funs) );
        tracker('composed command called', {tracking, functions: funs, args:newArgs, scope, oldScope});

Next we run through all levels of the args, looking for the special syntax. If
so, then we slot in the newArgs or, if an oldScope object, that value for it. 

The newArgs have not been evaluated at this point except, potentially, for
inputs. They will be replacing arguments in the chain and they will be called
as usual under execution of the pipes command. We use the descentSpecials
command to do the special work. For oldScope, these are actual values, so we
will need to wrap them up in a value argument.



        funs = weaver.syntax.descentSpecial(funs, newArgs, oldScope);
        let pipes = {
            cmd : 'pipes',
            args : funs,
            tracking : oldScope.tracking + ' composed into ' + scope.tracking
        };
        return await runCommand.call(scope, pipes);   

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
            if (piece.hasOwnProperty('value') ) { //base case
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
            } else if (piece.hasOwnProperty('args') ) { //descend
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
    if (Array.isArray(arg) ) { // list of sections
        let names = [];
        let proms = _":loop through the names"
        let vals = (await Promise.all(proms)).map(el => el.value);
        ret = {};
        _":zip names vals"
    } else {
        _":promise node value"
        ret = (await prr.prom);
    }

[promise node value]()

    let nodeName = weaver.syntax.getFullNodeName(arg, scope.context);
    let prr = weaver.p.web[nodeName];
    if (!prr) {
        prr = makePromise();
        weaver.p.web[nodeName] = prr;
    }

[loop through the names]()

    arg.map( (arg) => {
        _":promise node value"
        names.push(nodeName);
        return prr.prom;
    });

[zip names vals]()

    vals.forEach( (el, idx) => {
        ret[names[idx]] = el;
    } );



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
  

End list

    function getFullNodeName (frag, curNode) {
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
        return !(c.hasOwnProperty('lv#'));
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
