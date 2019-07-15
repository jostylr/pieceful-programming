# Parsing of substitutions and pipes

This is the module that does the underscore and pipe parsing. It exposes three
functions: `code`, `transform`, and `args`. 

The code function expects a code block that it
will scan for a `_quote ... quote` where quote is single, double, or backtick.
It can escape the underscore with a backslash, possibly a number between the
backslash and the underscore to indicate it should be escaped a certain
number of times (in case of further compiling, maybe not necessary with the
new setup?).

The transform assumes a pipe setup with the initial input being the value of
the compiled pieces.

The args function acts on compile directives title part. It is automatically
assumed to be in argument style, the arguments being fed into the directive
under the args component of the passed in data object. 

The biggest questionable design decision is the difference of plain text (no
leading character of underscore, tilde, exclamation point, single/double
quotes, backtick quotes. Also, pipes and parentheses later in the text have
special significance as does terminators which are potentially a comma,
closing parentheses, or a matching quote in an underscore-quote)  scenario  in the
three modes, all based on what is the expected default: 

* When starting with an underscore quote, plain text is a section name. In
  other places, an underscore precedes the section name. This should work in
  all other modes. 
* In pipes mode, plain text is a command name. In all other modes, a command
  must have parentheticals. A command is also indicated by a leading
  exclamation point. 
* In args mode, plain text is plain text. In all other modes, quoted text is
  necessary. This also works in args mode. 

So three different modes, three different meanings of plain text. This is
questionable, but keeping in mind the different contexts is important. This is
also optional. One can always be explicit and consistent. 

This is just to avoid having to write the symbols since it messes with the
syntax matching. 

    let par = '('; let cpar = ')';
    let bra = '{'; let cbra = '}'; //eslint-disable-line no-unused-vars
    let squ = '['; let csqu = ']'; //eslint-disable-line no-unused-vars

    let defTypeFirst = _"type first";
    const toTerminator = _"to terminator";
    const normalizeString = _"normalize string";
    const lineNumberFactory = _"line numbering";
    const parseArgs = _"parse args";
    const textArgs = _"textArgs";
    const plainText = {
        'code' : "\u005f",
        'pipe' : "!"
    };
    const findFirst = _"find first";
    const space = _"space";

The start is used in defining the line numbering, specifically, going from a
position in the text to reporting to a line number/col in the larger file.
This is separate from the index position of `ind` in the text that is passed
in which is generally a segment of that larger file. 

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
    
We setup the parsing object and include in it the line numbering function
which allows for conversion from line/col to text position. 

        _"load type first"

For code slicing, we use begin to know where to slice the prior code parts. 

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
            _"code"
        } else if (type === 'transform') {
            _"transform"
        } else if (type === 'args') {
            _"args"
        } else {
            tracker('unrecognized type of parsing', {type, text, start});
            throw new Error('unrecognized type for parsing:' + type);
        }
        return ret;
    };


### Core

This is the part to extract into embedding. Should be linked into the variable
cta on the outside as in Module. 

    {
        _"Parsing of substitutions and pipes"
    }

### Module

This is the module version

    let cta;
    {
        _"Parsing of substitutions and pipes"
    }
    module.exports = cta;

[underpipes/index.js](# "save:")

## Code

A code block is where we look for an underscore quote match. We have to be
mindful of escaped underscores including the `\5_"` kind of setup where the
number counts down (for repeated compiling). 

We also put a placement array which consists of a string that is joined in
front of the text (basically do we have a newline and spaces or not) and then
a second entry for a hanging indent that serves to indent all the other lines
in the code replacement. 


    tracker("parsing code block", {text, start});
    let len = text.length;
    let pieces = [];
    let begin = ind;
    while (ind < text.length) {
        let quote;
        _":find next underscore quote"
        {
            _":is it escaped"
        }
        _":previous text"
        _":determine indent"
        _":process quote"
    }
    ind = len;
    if (begin < text.length) {  
        _":previous text"
    }
    ret = pieces;
    tracker("code block parsed", ret);


[process quote]()

This is the main workhorse. We have a non-escaped underscore and a quote. We
call toTerminator with 'code' type and a terminator of the quote. We take its
return value and it to pieces.

At this point, `ind` is pointing to the underscore. So we add two and set `p.ind`
to that for the next processing.

    p.ind = ind + 2;
    let further = toTerminator(p, 'code', quote);
    delete further.terminate;
    further.indent = indent;
    pieces.push(further);

At this point `p.ind` should point to after the last index. 

    begin = ind = p.ind;

    
[previous text]()

    let prevText = p.text.slice(begin, ind);
    if (prevText) {
        pieces.push( {
            start : p.f.ln(begin),
            end : p.f.ln(ind-1),
            value : prevText
        });
    }

[determine indent]()

At this point, the index is pointing to the underscore.
We have two cases: underscore starts a line after
spaces or there are non-space characters. So we bracktrack until we hit the
beginning of the string or a newline. 

Note the indent is only used for the hanging part. The lead indent is not
needed as we just put it where it is.



    let indent;
    if (ind === 0) { indent = ''; }
    {
        let start = ind-1;
        let cur = start;
        while (true) { //eslint-disable-line no-constant-condition
            if (cur === 0) {
                indent = '\n' + text.slice(cur,start+1);
                break;
            }
            if (text[cur] === '\n') { 
                indent = text.slice(cur, start+1);
                break;
            }
            if (text[cur] !== ' ') {
                start = cur -= 1;
            } else {
                cur -= 1;
            }
        }
    }

[is it escaped]()

Escaping is done by backslash underscore. It only matters if there is a quote
after the underscore. The backslash could have a number associated between it
and the underscore. 

This involves backtracking. 

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
        
If there are digits, we convert to an integer. If greater than 1, we decrement
it and add it to the prefix. If it is 1, then we just use the backslash. If no
number or 0, then we have no prefix.

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




[find next underscore quote]()

We look for the next underscore. If not followed by a quote, we continue with
the loop. If there is no underscore, then we are done. 

    ind = text.indexOf(p.u, ind);
    if (ind === -1) { break; }
    if (!p.q.test(text[ind+1])) {ind += 1; continue;}
    quote = text[ind+1];



## Transform

This is a transform which is a line of pipes and has no terminator. All should
be consumed. 

    tracker('transform about to be parsed', p.ind, {text, start});
    ret = toTerminator(p, '', '');
    tracker('transform parsed', ret);

## Args

This is a directive and has no terminator. All should be consumed. The return
for args is a full array.

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


## To terminator

This is the key parsing to wrap one's head around. This is a function that
takes in a parsing object and a mode name and a terminator, 
and returns a command object up to
the point of interest and some index and source position information.  

p is our parsing object and is basically our scope that we pass around.

    function toTerminator (p, mode, terminator) {
        let typeFirst = p.f.typeFirst;
        let len = p.text.length;
        if (p.ind >= len) {
            return {terminate:true};
        }
        let ln = p.f.ln;

We don't care about leading white space. Ever. But we also are not cutting up
the text so no trimming. 

        p.f.space(p);
        let first = p.text[p.ind];

If nothing, then we terminate. We have already advanced the index and no
command gets returned. As this comes first, if a terminating character is a
quote, using that quote does terminate instead of initiating a quote (good
thing). p.ind should point after the terminator and the terminating character
is transmitted under the terminate, which should be removed. 

        if (terminator.indexOf(first) !== -1) {
            p.ind += 1;
            return { terminate : (first || true) };
        }

Not terminating. We then check for a special first character. We increment
past this first character if it is actually there largely because the plain
text stuff won't have that character and this makes it consistent. We also
already have the information we need from it. 
    
        let piece, start = p.ind;
        if (has(typeFirst, first) ) {
            p.ind += 1;
            piece = typeFirst[first](p, terminator+'|');
        } else {
            
No leading character. We assume plain text. We need to check for a
parenthesis. If there is one, then we assume it is a command. If it is not a
parenthesis, then it depends on the mode: underscore, command, quote,
depending on, respectively, code, pipe, args

            let paren = p.f.findFirst(p, par + '|' + terminator);
            if (paren[0] === par ) {
                piece =  typeFirst['!'](p, terminator);
            } else {
                if (mode === 'args') {  

For args, we want the plain text mode to be a quote. However, a quote requires
a matching quote and so we can't call that. Instead, we simply do the work
here. 

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


 
We have now figured out the current, we seek the end. 

        let nxt = p.f.findFirst(p, '|'+terminator);
        p.ind = nxt[1]+1;
        if (nxt[0] === '|') {
            if (mode !== 'pipe') {

Then we go into pipe mode, returning the pipe piece with all the pipes as args including the one we just found.  

The one that was just found might have a terminator associated with it so we
delete that since we don't need it anymore. 

                delete piece.terminate; 
                let args = [piece];
                piece = {cmd: 'pipe', args};
                piece.terminate = true; //likely to be replaced if proper
                let go = true;
                while (go) {
                    let further = toTerminator(p, 'pipe', terminator);
                    if (further.terminate) { 
                        if (terminator.indexOf(further.terminate) !== -1) {
                    
If we are in a pipe and that has a pipe which terminates, then that terminator
may bubble up. So we ignore it unless it is a pipe or terminator that we are
expecting. 

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
If we are already in pipe descent, then we don't need to do anything other
than return the piece. 
        
If it is not a pipe, then it should be a terminator. 

        } else {
            piece.terminate = nxt[0] || true;
        }
        return piece;
    }




## Load Type First

The type first object is where the different possible setups can be
customized. We go through the defTypeFirst default object and add them to the
passed in typeFirst if not present. If a value is present, but not a function,
then we assume we need to delete the key. 

    Object.keys(defTypeFirst).forEach( (key) => {
        if (has(typeFirst, key) ) {
            if (typeof typeFirst[key] !== 'function' ) {
                delete typeFirst[key];
            }
        } else {
            typeFirst[key] = defTypeFirst[key];
        }
    });


## Type First

A type first is responsible for everything up to a pipe or terminator, namely,
it should parse its initial part and any kind of arguments. 

In many instances here, we want to prevent the standard pipe insertion of the
first argument. To ignore input, set bind to true on the piece. To put the
input after a certain spot, name the spot (so to put it after the first, say
1, which coincides with 0 based insertion). 


    {
        "'" : _"raw quote",
        '"' : _"parse backslashes",
        '`' : _"template string",
        '\u005f' : _"get",
        '!' : _"cmd",
        '~' : _"eval",
        '#' : _"math",
        '?' : _"boolean",
        '=' : _"operator",
        '[' : _"array", //]
        '{' : _"object", //}
        '-' : _"dash", 
        '.' : _"dot",
        '/' : _"comment",
        '@' : _"get scope",
        '^' : _"store scope"
    }

### Type First Functions

We use a variety of helper functions and snippets for the type first commands. 

### Raw quote

This is a raw quote meaning nothing is escaped. Whatever is between the quotes
is what it is. 

    function rawQuote (p) {
        let value;
        let start = p.ind;
        let end = p.text.indexOf("'", p.ind);
        if (end === -1) {
            end = p.text.length-1;
            value =  p.text.slice(p.ind);
            _"unterminated quote"
        }
        value = p.text.slice(p.ind, end);
        p.ind = end+1;
        _"return piece:value";
    }

### Parse Backslashes

This allows for backslashes in the quote. Once we have the finished quote, we
do bad hack of evaling the quote, placed in double quotes to basically do all
the escaping we would want. The tricky bit is simply any backslashed double
quotes need to have the backslashes counted.

    function parseBackSlash (p) {
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
                    _"return piece:value";
                }
            } else { //no matching quote
                end = len;
                value = p.text.slice(p.ind);
                _"unterminated quote"
            }
        }
        throw new Error('internal error at parseBackSlash; unreachable point reached');
    }


### Template String

This is back ticking. This will also get eval'd, but it depends on the context
so it becomes reported as a command. 

    function parseBackTick (p) {
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
                    _"return piece:bind";
                }
            } else { //no matching quote
                end = len;
                let value = p.text.slice(p.ind);
                _"unterminated quote"
            }
        }
        throw new Error('internal error at parseBackSlash; unreachable point reached');
    }



### Get

This is an underscore. Just continue until terminator, pipe.  

    function parseGet (p, terminator) {
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
        _"return piece:bind";
    }


### Parse args

This is a helper function for many of the functions in which there is args
part. We assume that `p.ind` has been set to the character after the
parenthetical and that the closing parenthentical is in `par`. This is the
terminator. There should also be an array called args to push onto.  

Basically, we access the terminator, looking for the closed parentheses or a
comma, generating an array of pieces. 

    function (p, close, pre, post) {
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
    }


### Cmd

The first part should be a command name. If parentheticals, the rest are
arguments. If the first character is a parentheses, then we process the
arguments and we use the command `call` which assumes the first argument is a
command to call with the rest of the arguments being what to put into the
command. 

    function parseCmd (p, terminator) {
        let cmd, bind;
        let start = p.ind;
        let args = p.f.textArgs(p, terminator);
        let cmdName = args.shift();
        if (!cmdName) {

There was no text so we assume the command name is the first argument. We use
the command `call` for that purpose. For this form, if it is in a pipe setup,
the incoming pipe input will be the command name. Use the underscore form for
the pipe to be the first argument of the eventually called command. 


            cmd = 'call';
        } else if (has(cmdName, 'value') ) {

The actual expected notion of calling a command name

            cmd = cmdName.value;
        } else {

The first argument does not have a value, so should be an underscore which we
shift into the first arguments and use call, binding as well so that a pipe
goes into the first slot of the command. 

            cmd = 'call';
            args.unshift(cmdName);
            bind = 1;
        }

        let end = p.ind-1;
        if (bind) {
            _"return piece:bind";
        } else {
            _"return piece";
        }
    }        

### Eval

This will do an eval. Plain text is assumed to be an eval, in line with
textArgs. If it is
quoted, then that will be what becomes eval'd. An underscore will be eval'd as
well. For these forms, binding of the first is assumed. If there is no text before the
parenthesis, then we assume the usual eval command. 


    function parseEval (p, terminator) {
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
            _"return piece:bind";
        } else {
            _"return piece";
        }
    }    
         
### Math

A leading hash will convert the remainder of the text into a number, probably,
or some other mathy thing, hopefully. This is
accomplished by an eval in the default case. The arguments, if any, are arguments available in the arguments of the called function.

If there is a second hash present, then the text in between allows for
something of the form `input format:outputformat1 outputformat2` which, if
there are multiple outputs, will yield an object with keys for those outputs.
If just one, then it outputs that output. The default is equivalent to
`js:eval`. The eval knows that it can just plug in js and go to town. If it
was `latex:eval` then there needs to be a converter, for example. 

It is possible to quote the math expression as well, using the first type
rules. 

The command, Math, takes two mandatory arguments: the expression to process and the input/output string. 

    function parseNumber (p, terminator) {
        const start = p.ind;
        const cmd = 'math';
 
First we look to see if there is a second hash mark.

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
        _"return piece:bind";
    }




Examples: `#1+4^3` which will yield the javacript number 65.  
`#latex:float,floatLatex,latex#1+\frac{4}{5}^3` which
says the input is in latex, and it should be parsed into a float, that float
should also be presented in latex form, and the raw input should be presented
as latex all stored as an object since there are multiple outputs.



### Boolean

A leading question mark indicates that a boolean is desired. The text to the
terminator is the comparison operator and it is the first argument. The second
argument is bound to for incoming. Return value is boolean.

If the question mark has no leading text, then we take the pipe input as the
incoming operator and let the args be it acting on it. If the question mark
has text, then we take the input to be the second argument, the first thing to
have the comparison act on. 

    function parseBoolean (p, terminator) {
        let start = p.ind-1;
        let cmd = 'bool';
        let args = p.f.textArgs(p, terminator);
        let end = p.ind-1;
        if (!args[0]) { //in case no op after ?
            args.shift();
            _"return piece";
        } else {
            let bind = 1;
            _"return piece:bind";
        }
    }

### Operator

A leading `=` indicates a mathematical operator or function is here to process
something. Similar to boolean and math. We expect that there is an operator
and we gobble until the first `[ a-zA-Z0-9]` The space is what one can use if
no arg to operate on (such as negating the incoming text).

    function parseOperator (p, terminator) {
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
        _"return piece:bind";
    }
    
### Array

This is denoted by square braces. It is assumed to have args separated by
commas. 

    function parseArray (p) {
        let start = p.ind-1;
        let cmd = 'arr';
        let args = p.f.parseArgs(p, csqu);
        let end = p.ind-1;
        _"return piece";
    }


### Object

This is denoted by curly braces. It is assumed to be in `key,value` form,
separated by commas. It returns the object.


    function parseObject (p) {
        let start = p.ind-1;
        let cmd = 'obj';
        let key;
        const pre = function (p) {

We allow for the full range of ways to get a key, such as underscores, quotes,
commands, etc. The default plain text should be as a quoted value so we use
mode args. 

            key = p.f.toTerminator(p, 'args', ':,' + cbra);
            if (key.terminate !== ':') {

If no colon, then we assume the given is a key pointing an undefined value.
We need to move the p.ind back 1 so we get, essentially an undefined. To
insert pipe input use the `@` syntax.  

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
        _"return piece";
    }

### Dash

Dash is for calling commands from required libraries. This loads the required
one, thus avoiding the overhead of loading if not actually required. It should
be of the form `-libraryNickname.method(arg1, arg2)`.  So `-ld.pluck(arr, 1)`
for using pluck from lodash. If the nickname points to a function directly,
one can call that. Nicknames are defined elsewhere and can lead to commonly
used functions, commands, setups, whatever. 

    function parseDash (p, terminator) {
        let start = p.ind-1;
        let cmd = 'dash';
        let bind = 1;
        let args = p.f.textArgs(p, terminator);
        let end = p.ind-1;
        _"return piece:bind";
    }


### Dot

Dot is designed to access properties and methods of an object. The first
argument in the final command should be an object to access with all but,
possibly, the final arguments being string accessors (after evaling). The
final argument is an array if the thing is a method and then it gets applied
to that array. 

The shorthand syntax presented here allows for raw name property access and is
designed for a pipe incoming input of the object. It makes no sense to have it
outside of a pipe. 

`obj | .prop1.prop2.method(arg1, arg2)` should be equivalent to `dot(obj,
prop1, prop2, method, [arg1, arg2])`. 

If there is no text between the dot and the command, then we simply pass the
args into the dot command. Not much of a savings. 

    function parseDot (p,terminator) {
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
        _"return piece";
    }

### Comment

This creates a comment. It expects two slashes with the bit in between the
slashes being the type(s) of comments (if just one, then that is the output,
otherwise it is a doc with the keys of types; the command handles figuring
that out). After the slash and until the
terminator, that is the comment. A starting quote is allowed and is processed
as the type. Arguments could be places to insert variables for e.g. javadoc


    function parseComment (p, terminator) {
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
        _"return piece:bind";
    }


### Get Scope

A leading `@` sign signifies wanting to grab from the scope using the variable
number and possibly dots for a name or, if it is
followed by a number, from inside of a pipe command, accessing that number of
previous pipes. The latter is a pipeInput command and is specially accessed.

But an `@` symbol by itself is reserved for the input variable
of the pipe and satisfies that argument. It is, in effect, setting the bind
variable of the piece, overriding it. In that case, it issues the command
`pipeInput` with no arguments in the arg listing. It can appear multiple
times. If it appears outside of a pipe, then undefined is returned. 

To ignore the incoming input entirely, have `@!` somewhere. It will get
ignored (so either at the beginning or end is fine). We can also use `@^text
or number` to indicate that the output of this should be something that
follows the get scope or previous input rules. Nothing after the caret leads
to the previous input while an `!` will lead to nothing being passed on
(something like a log command might need `^`). 

Note `@0` is the current input, but it does not trigger a skipping of the
usual argument shifting behavior. Only `@` by itself does that. 

    function atParse (p, terminator) {
        let end, cmd, args;
        let start = p.ind;
        p.f.space(p);
        if (p.text[p.ind] === par) {
        
This is for the apply command. It takes 

            cmd = 'apply';
            args = p.f.textArgs(p, terminator);
            args.shift(); // no first text arg
            end = p.ind-1;
            _"return piece";
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
        _"return piece";
    }


### Store scope

A leading `^` is an instruction to store the incoming pipe into a scope
variable. If it ends in `!` then it returns
undefined otherwise it passes along the variable. For more complicated stuff,
saying pushing onto an array or whatever, use a pipe and the dot command. 

The arguments should just be 1; the stuff to store.


    function caretParse (p, terminator) {
        let start = p.ind-1;
        let args = p.f.textArgs(p, terminator);
        if (!args[0]) {args.shift();}
        let end = p.ind-1;
        let cmd = 'storeScope';
        let bind = 1; // input is the second argument
        _"return piece:bind";
    }


## Utilities

### Find first

This is a generic function which takes in the parsing object and whatever
single characters one wants to stop on. It returns the character found and
sets the index on the parsing object. 

    function findFirst (p, chars, ind) {
        ind = ind || p.ind;
        let len = p.text.length;
        while (ind < len) {
            if (chars.indexOf(p.text[ind]) !== -1) {
                return [p.text[ind], ind];
            } else {
                ind += 1;
            }
        }

Not found. 

        return [null, ind];
    }
### Line Numbering

This is a small factory that returns a function that either gives a line/column
position given a text position or gives a text position given a line/column. 

The start parameter is where to base line/columns off of. 

    function (text,[ls, cs, ps]) {
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

If it is an array, then it should be line/column


TODO: Figure out proper positioning here. First line involves also column
shift. 


            if (Array.isArray(data)) {
                let [line, col] = data;
                if (line === ls) {
                    return lines[0] +cs + col;
                } else {
                    return lines[line-ls] + col;
                }

If data is a number, then it is the position in the given text. 

            } else if (typeof data === 'number') { 
                let target = data;
                let min = 0;
                let max = lines.length;

Average to integer, rounding up

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
    }


### Normalize String

This is a little function that simply trims and lowercases everything. It is
applied to section names and command names. 

    function normalizeString (str) {
        return str.trim().toLowerCase();
    }

### Space

Advances through white space. 

    function space(p) {
        let reg = /\s*/g;
        reg.lastIndex = p.ind;
        reg.exec(p.text); //just advances past whitespace

Now we are at the first non-whitespace character.

        p.ind = reg.lastIndex;
    }


### Return Piece

This defines the standard returning of a piece. It assumes that start, end,
cmd, and args are defined. 

    return {
        start: p.f.ln(start),
        end: p.f.ln(end),
        cmd, args
    }

[bind]()

Adds in bind. 

    return {
        start: p.f.ln(start),
        end: p.f.ln(end),
        cmd, bind, args
    }

[value]()

    return {
        start: p.f.ln(start),
        end: p.f.ln(end),
        value 
    }


### Unterminated Quote

This is where we handle unterminated quotes. There should be a start, end, and
value variable defined. 

    let info = {start: p.f.ln(start), end : p.f.ln(end), value};
    p.f.tracker('unterminated quote', info);
    throw new Error('unterminated quoted:' + info.start + ':' + value);




### TextArgs

This is a little utility for extracting text up to a parentheses or terminator
and then processing the arguments if a parentheses. It returns an array with
the first bit followed by the parenthetical arguments. The first bit is either
raw text, quoted text (any of them all no backslashing), underscore followed
by raw text forgetting a section. 

We now process the math text. We take plain text to be the raw input, but we
also allow for quotes or an underscore. It could also be a parenthetical which
uses the first argument for this initial purpose, something which becomes the
second argument. There could also be nothing in case it is a pipe that is
taking in the next argument. 
      
    function textArgs (p, terminator) {
        terminator = terminator + '|';
        let args, firstArg;
        let start = p.ind;
        p.f.space(p);

        let first = p.text[p.ind];

        if (terminator.indexOf(first) !== -1) {
            return [null];
        }

Quote 

        if (p.q.test(first) ) {
            let qEnd = p.text.indexOf(first, p.ind+1);
            if (qEnd !== -1) {
                firstArg = {value: p.text.slice(p.ind+1, qEnd)};
                p.ind = p.f.findFirst(p, par+terminator, qEnd)[1];
            } else {
                let end = p.text.length;
                let value = p.text.slice(start);
                _"unterminated quote"
            }

Underscore

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

Plain text, possibly no text. 

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

We should now be past the text, etc. with p.ind pointing to either a
parenthetical or a terminator. 

        if (p.text[p.ind] === par) {
            p.ind += 1;
            args = p.f.parseArgs(p, cpar);
            args.unshift(firstArg);
        } else {
            args = [firstArg];
        }


        return args;
        

    }
     

## Sample

This is where we do a sample run of all of this. 


    const util = require('util');
    const fs = require('fs');
    const up = require('../../underpipes');
    const jp = require('json-stringify-pretty-compact');
    const diff = require("deep-object-diff").diff
    let file = fs.readFileSync(__dirname + '/underpipes.txt', {encoding:'utf8'});
    let tasks = file.split('\n---\n').
        map(el => el.trim()).
        map(el => {
            let ind = el.indexOf(':');
            return [el.slice(0,ind).trim(), el.slice(ind+1).trim()];
        });
    const removeSE = _":remove start and end"; 
    tasks.forEach( ([name,txt]) => {
        let ret = {name, txt};
        if (txt) {
            try {
                ret.result = up({text:txt, 
                    tracker : () => {} });
                ret.result.forEach(removeSE);
            } catch (e) {
                ret.error = e.message;
                //ret.stack = e.stack;
            }
        } else {
            ret.noTest = 'no test';
        }
        if (ret.noTest) {
            console.log('ERROR', ret);
        } else {
            try {
                base = JSON.parse( fs.readFileSync(
                    __dirname + '/' + name + '.json',
                ));
                let test = diff(base,  ret);
                if (Object.keys(test).length === 0) {
                    console.log('test ' + name + ' passed');
                } else {
                    console.log('FAIL: test ' + name + ' failed');
                    console.log('DIFF:' + jp(test) );
                    fs.writeFileSync(__dirname + '/' + name + '-diff.json', 
                        jp(test) );
                    fs.writeFileSync(__dirname + '/' + name + '-new.json', 
                        jp(ret) );
                }
            } catch (e) {
                console.log('No such test ' +  name + '. Please verify');
                console.log(jp(ret));
                fs.writeFileSync(__dirname + '/' + name + '-new.json', 
                    jp(ret) );
            } 
        }
    });



[sample/underpipes/index.js](# "save:")


[remove start and end]()

This is a quick little recurse down the tree to remove start and end
computations because they can obscure what is going on. 

    function removeSE ( piece) {
        if (!piece) { return;}
        delete piece.start;
        delete piece.end;
        if (piece.args) {
            piece.args.forEach(removeSE);
        }
    };








