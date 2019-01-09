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
    let bra = '{'; let cbra = '}';
    let squ = '['; let csqu = ']';

    let defTypeFirst = _"type first"
    const toTerminator = _"to terminator"
    const normalizeString = _"normalize string"


The start is used in defining the line numbering, specifically, going from a
position in the text to reporting to a line number/col in the larger file.
This is separate from the index position of `ind` in the text that is passed
in which is generally a segment of that larger file. 

    module.exports = function cta ({
        type = 'code',
        text = '', 
        tracker = (note, data) => {console.log("UP/" + note, data)}, 
        start = [1,1,0],
        ind = 0,
        u: '\u005f',
        q : '\'"`',
        typeFirst : {}, 
        norm : normalizeString
    }) {
    
We setup the parsing object and include in it the line numbering function
which allows for conversion from line/col to text position. 

        let ln = (_"line numbering")(text, start);
        _"load type first"

For code slicing, we use begin to know where to slice the prior code parts. 

        let p = {text, tracker, ind, begin : ind, q, u, 
            f : {typeFirst, checkParen, toTerminator, ln, norm}};
        let parsed, ret;
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


[underpipes/index.js](# "save:")

## Code

A code block is where we look for an underscore quote match. We have to be
mindful of escaped underscores including the `\5_"` kind of setup where the
number counts down (for repeated compiling). 

Another fact is figuring out the hanging indent. The code block starting place
is just part of the concatenation, but the code underneath needs to be
indented properly. If the starting is on a line by itself then any indent is
applied to the rest. But if there is non-white space on the starting line
before the block, then the indent decided for that line is what is applied to
the rest. This is not going to cover all possible uses, but it should cover
all reasonable uses such as `fname = _"function definition"`.

    tracker("parsing code block", {text, start});
    let len = text.length;
    let pieces = [];
    while (ind < text.length) {
        let quote;
        _":find next underscore quote"
        {
            _":is it escaped"
        }
        _":previous text"
        _":process quote"
    }
    ind = len;
    _":previous text"
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
    pieces.push(further);

At this point `p.ind` should point to after the last index. 

    begin = ind = p.ind;

[previous text]()

    let prevText = text.slice(begin, ind)
    if (prevText) {
        pieces.push( {
            start : ln(begin),
            end : ln(ind-1),
            value : prevText
        });
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
        if (char === '\') {
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
        let txt = text.slice(begin,backind) + prefix + p.u + quote;
        ind +=2;
        pieces.push({
            start : ln(begin),
            end : ln(ind-1),
            value : txt
        });
        continue;
    }




[find next underscore quote]()

We look for the next underscore. If not followed by a quote, we continue with
the loop. If there is no underscore, then we are done. 

    ind = text.indexOf('\u005', ind);
    if (ind === -1) { break; }
    if (p.q.indexOf(text[ind+1]) === -1) {ind += 1; continue;}
    quote = text[ind+1];



## Transform

This is a transform which is a line of pipes and has no terminator. All should
be consumed. 

    tracker('transform about to be parsed', {text, start});
    parsed = toTerminator(p, 'pipe', '');
    ret = {
        start,
        end: ln(p.ind-1),
        cmd : ['pipe'],
        args : parsed.cmds
    };
    tracker('transform parsed', ret);

## Args

This is a directive and has no terminator. All should be consumed. The return
for args is a full array.

    tracker('args about to be parsed', {text, start});
    let len = p.text.length;
    let args = [];
    while (p.ind < len) {
        let piece = toTerminator(p, 'args', ',');
        if (piece.hasOwnProperty('value') || piece.hasOwnProperty('cmd') {
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
        let len = p.text.length;
        if (p.ind >= len) {
            return {terminate:true};
        }
        let origInd = p.ind;
        let ln = p.f.ln;

We don't care about leading white space. Ever. But we also are not cutting up
the text so no trimming. 

        let reg = /\s*/g;
        reg.lastIndex = p.ind;
        let match = reg.exec(text);

Now we are at the first non-whitespace character.

        let p.ind = reg.lastIndex;
        let first = p.text[p.ind];

If nothing, then we terminate. We have already advanced the index and no
command gets returned. As this comes first, if a terminating character is a
quote, using that quote does terminate instead of initiating a quote (good
thing). `p.ind` should point to the terminator.   

        if (terminator.indexOf(first) !== -1) {
            return { terminate : true };
        }

Not terminating. We then check for a special first character. We increment
past this first character if it is actually there largely because the plain
text stuff won't have that character and this makes it consistent. We also
already have the information we need from it. 
    
        let typed, piece, start = p.ind;
        if (typeFirst.hasOwnProperty(first) ) {
            p.ind = p.ind+1;
            piece = typeFirst[first](p, terminator);
        } else {
            
No leading character. We assume plain text. We need to check for a
parenthesis. If there is one, then we assume it is a command. If it is not a
parenthesis

            let paren = findFirst(p, par + terminator);
            if (paren[0] === par ) {
                piece =  typeFirst['!'](p, terminator);
            } else {
                piece = typeFirst[plainText[mode]])(p, terminator);
            }
        }



 
We have now figured out the current, we seek the end. 

        let nxt = findFirst(p, '|', terminator);
        p.ind = nxt[1];
        if (nxt[0] === '|') {
            if (mode !== 'pipe') {

Then we go into pipe mode, returning the pipe piece with all the pipes as args including the one we just found.  

                let args = [piece];
                piece = {cmd: 'pipe', args};
                let go = true;
                while (go) {
                   let further = toTerminator(p, 'pipe', terminator);
                   if (further.terminate) { go = false;}
                   if (p.ind >= len) { go = false;}
                   if (further.cmd || further.values) {args.push(further);}
                }
                piece.start = ln(start);
                piece.end : ln(p.ind-1);
                piece.terminate = true;
            } 
If we are already in pipe descent, then we don't need to do anything other
than return the piece. 
        
If it is not a pipe, then it should be a terminator. 

        } else {
           piece.terminate = true;
        }
        return piece;
    }

### Find first

This is a generic function which takes in the parsing object and whatever
single characters one wants to stop on. It returns the character found and
sets the index on the parsing object. 

    function findFirst (p, chars) {
        let ind = p.ind;
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


## Load Type First

The type first object is where the different possible setups can be
customized. We go through the defTypeFirst default object and add them to the
passed in typeFirst if not present. If a value is present, but not a function,
then we assume we need to delete the key. 

    Object.keys(defTypeFirst).forEach( (key) => {
        if (typeFirst.hasOwnProperty(key) ) {
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
        '#' : _"number",
        '?' : _"boolean",
        '[' : _"array", //]
        '{' : _"object", //}
        '-' : _"dash", 
        '.' : _"dot",
        '/', : _"comment",
        '@', : _"get scope",
        '=' : _'store scope"
    }

### Type First Functions

We use a variety of helper functions and snippets for the type first commands. 

#### Position

This is a helper block that does a common start and end. Replace S and E with
whatever experession gives the current start and end. 

        start: p.f.ln(S),
        end: p.f.ln(E)

#### Make Get

This makes a get cmd. 

    function makeGet (name, start, end, p) {
        let f = this;
        return {
            start: f.ln(start),
            end: f.ln(end)
            cmd : 'get',
            bind : true,
            args : [ {value : f.norm(name)}]
        };
    }


### Raw quote

This is a raw quote meaning nothing is escaped. Whatever is between the quotes
is what it is. 

    function rawQuote (p, terminator) {
        let end = p.text.indexOf("'", p.ind);
        if (end === -1) {
            let ret = {
                _"position | sub S, p.ind, E, text.length)",
                value: p.text.slice(p.ind)
            };

            p.tracker('unterminated quote', ret );
            throw new Error('unterminated quote', ret);
        }
        let quote = text.slice(p.ind, end);
        cmd = [first, quote];
        ret = {
            _"position | sub S, p.ind, E, end)",
            value : p.text.slice(p.ind, end) //end is on quote
        };
        p.ind = end+1;
        return ret;
    }

### Parse Backslashes

This allows for backslashes in the quote. Once we have the finished quote, we
do bad hack of evaling the quote, placed in double quotes to basically do all
the escaping we would want. The tricky bit is simply any backslashed double
quotes need to have the backslashes counted.

    _':common | sub Q, \", TXT, _":eval" '

[common]()

    function parseBackSlash (p, terminator) {
        let ret;
        let ln = p.f.ln;
        let reg = /[\\]*Q/g;
        reg.lastIndex = p.ind;
        let len = p.text.length;
        while (reg.lastIndex < len) {
            let match = reg.exec(p.text);
            if (match) {
                if ( (match[0].length % 2) === 0 ) { //escaped
                    continue;
                } else { // quote found
                    ret = {
                        _"position | sub S, p.ind, E, reg.lastIndex-1)",
                        TXT
                    };
                    p.ind = reg.lastIndex;
                    return ret;
                }
            } else {
                ret = {
                    _"position | sub S, p.ind, E, end)",
                    value: p.text.slice(p.ind)
                };
                p.tracker('unterminated quote', ret );
                throw new Error('unterminated quote: ' + ln(p.ind));
            }
        }
        throw new Error('internal error at parseBackSlash; unreachable point reached');
    }

[eval]()

We can eval it here since nothing is going to be different later. 

    value : eval('"' + text.slice(p.ind,reg.lastIndex) + '"')

### Template String

This is back ticking. This will also get eval'd, but it depends on the context
so it becomes reported as a command. 

    _'parse backslashes:common | sub Q, \`, TXT, _":cmd", 
        parseBackSlash, parseBackTick '

[cmd]()

Templating requires compiling with the scope so we make this a command to be
seen later. 

    cmd: 'backtick', 
    bind : 1,
    args: [p.text.slice(p.ind, reg.lastIndex-1)]


### Get

This is an underscore. Just continue until terminator, pipe.  

    function parseGet (p, terminator) {
        let end = p.f.findFirst(p, '|' + terminator);
        let name = p.text.slice(p.ind,end);
        let piece = p.f.makeGet(name, p.ind, end-1);
        p.ind = end;
        return piece;
    }


### Parse args

This is a helper function for many of the functions in which there is args
part. We assume that `p.ind` has been set to the character after the
parenthetical and that the closing parenthentical is in `par`. This is the
terminator. There should also be an array called args to push onto.  

Basically, we access the terminator, looking for the closed parentheses or a
comma, generating an array of pieces. 

    function (p, close) {
        const len = p.text.length;
        const term = ',' + close;
        let args = [];
        while (p.ind < len) {
            let piece = toTerminator(p, 'args', term);
            if (piece.hasOwnProperty('value') || piece.hasOwnProperty('cmd') {
                args.push(piece);
            }
            if (p.text[p.ind] === close) {
                break;
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

    function parseGet (p, terminator) {
        let args = [];
        let par = ')';
        if (p.text[p.ind] === '(') {
            _":call"
            return piece;
        } 
        let end = p.f.findFirst(p, '(' + '|' + terminator);
        let cmd = p.f.norm(p.text.slice(p.ind, end));
        let start = p.ind;
        p.ind = end;
        if (p.text[p.ind] === '(') {
            p.ind = p.ind +1;
            _"parse args"
        }
        let piece = {
            _"position | sub S, start, E, p.ind-1)",
            cmd,
            args
        };
        return piece;
    }



[call]()

This is using the command with a created function. The first argument is going
to be fed into the call command and either eval'd into a function or it could
be a function. That's for the run-time to decide. 

    p.ind = p.ind +1;
    _"parse args"
    let piece = {
        _"position | sub S, start, E, end-1)",
        cmd : 'call',
        args,

The bind ensures that the input if in a pipe goes into the function being created
here instead of as.

        bind: 1
    };


### Eval

This will do an eval. Plain text is assumed to be a section name. If it is
quoted, then that will be what becomes eval'd. If there is no text before the
parenthesis, then we assume the usual eval command. 

    function parseEval (p, terminator) {
        let start = p.ind;
        let first = p.f.quoteExtract(p);
        if (!first) {
            let name = p.f.toParenExtract(p, par, terminator);
            if (name) {
                first = p.f.makeGet(name, start, p.ind-1); 
            }
                 
        }
        let args = [];
        if (first) {args.push(first);}
        if (p.text[p.ind] === par ) {
            args.concat(p.f.parseArgs(p, cpar) ); 
        }
        let piece = {
            _"position | sub S, start, E, p.ind-1",
            cmd : 'eval',
            args
        };
        return piece; 
    }

### Math

A leading hash will convert the remainder of the text into a number. This is
accomplished by an eval. The arguments, if any, are arguments available in the
scope of the eval. 

If there is a second has present, then the text in between
allows for something of the form `input:output1 output2` which, if there are
multiple outputs, will yield an object with keys for those outputs. If just
one, then it outputs that output. The default is equivalent to `js:eval`. The
eval knows that it can just plug in js and go to town. If it was `latex:eval`
then there needs to be a converter, for example. 

It is possible to quote the math expression as well, using the first type
rules. 

The command, Math, takes two mandatory arguments: the expression to process and the input/output string. 

    function parseNumber (p, terminator) {
        const start = p.ind;
 
First we look to see if there is a second hash mark.

        let first = p.f.findFirst(p, '#' + terminator);
        if (first[0] === '#') {
            p.ind = first[1] + 1; // past the hash
            first = p.f.norm(p.text.slice(start, first[1]));
        } else {
            first = 'js:eval';
        }
        
We now process the math text. We take plain text to be the raw input, but we
also allow for quotes or an underscore. It could also be a parenthetical which
uses the first argument for this initial purpose, something which becomes the
second argument. There could also be nothing in case it is a pipe that is
taking in the next argument. 
       
        let args = [first];
        let bind;
        let term = p.f.spaceAdvance(p, terminator);
        if (term) {
            bind = 1;
        }

This means there is nothing further to process. 

        let nxtChr = p.text[p.ind];

        if (nxtChr === par) {

There are parentheses, but no text. This means we should bind to the first
argument, 

            args = args.concat(p.f.parseArgs(p, cpar));
            bind = 1;
        }
        
If we have not done a bind yet, then we must have useful text after the hash. 

        if (!bind) { 
            let end = p.f.findFirst(p, par+terminator);
            let txt = p.text.slice(p.ind, end[1]);
            args.push(txt); 
            let p.ind = end[1];
            bind = 2;
            if (end[0]  === par) {
                args = args.concat(p.f.parseArgs(p,cpar) );
            }
        }
        return {
            _"position | sub S, start, E, p.ind-1",
            cmd : 'math',
            args,
            bind
        };
    }


Examples: `#1+4^3` and `#latex:float,floatLatex,latex#1+\frac{4}{5}^3` which
says the input is in latex, and it should be parsed into a float, that float
should also be presented in latex form, and the raw input should be presented
as latex. 

### Boolean

A leading question mark indicates that a boolean is desired. The text to the
terminator is the comparison operator and it is the first argument. 

    function parseBoolean (p, terminator) {

    }

### Array

This is denoted by square braces. It is assumed to have args separated by
commas. 

    function parseArray (p, terminator) {
        
    }


### Object

This is denoted by curly braces. It is assumed to be in `key,value` form,
separated by commas. It returns the object.

    function parseObject (p, terminator) {

    }

### Dash

Dash is for calling commands from required libraries. This loads the required
one, thus avoiding the overhead of loading if not actually required. It should
be of the form `-libraryNickname-method(arg1, arg2)`.  So `-ld-pluck(arr, 1)`
for using pluck from lodash. If the nickname points to a function directly,
one can call that. Nicknames are defined elsewhere and can lead to commonly
used functions, commands, setups, whatever. 

    function parseDash (p, terminator) {

    }


### Dot

This is a special command that assumes the first argument is an object. If the
. is followed by text, then it is assumed to be a property name and, if there
are more than one arguments, a method that gets fed those arguments. If
nothing follows the dot, then we assume property access with each argument
after the first being a property name subsequentially. 

`.(obj, prop1, prop2, prop3)` equivalent to `obj.prop1.prop2.prop3` while
`.join(obj, arg1, arg2)` is equivalent to `obj.join(arg1, arg2)`. 

    function parseDot (p,terminator) {

    }

### Comment

This creates a comment. It expects two slashes with the bit in between the
slashes being the type(s) of comments (if just one, then that is the output,
otherwise it is a doc with the keys of types). After the slash and until the
terminator, that is the comment. A starting quote is allowed and is processed
as the type. 


    function parseComment (p, terminator) {

    }


### Get Scope

A leading `@` sign signifies wanting to grab from the scope using the variable
number and possibly dots for a name or, if it is
followed by a number, from inside of a pipe command, accessing that number of
previous pipes. The latter is a pipeInput command and is specially accessed 

But an `@` symbol by itself is reserved for the input variable
of the pipe and satisfies that argument. It is, in effect, setting the bind
variable of the piece, overriding it. In that case, it issues the command
`pipeInput` with no arguments in the arg listing. It can appear multiple
times. If it appears outside of a pipe, then undefined is returned. 

Note `@0` is the current input, but it does not trigger a skipping of the
usual argument shifting behavior. Only `@` by itself does that. 

One can also have something like `@1/2/3` indicating to put those pipe output
values in as an array into the argument. `..` syntax indicating a range is
also allowed. 

### Store scope

A leading `=` is an instruction to store the incoming pipe into a scope
variable, possibly with depth of dots. If it ends in `!` then it returns
undefined otherwise it passes along the variable. For more complicated stuff,
saying pushing onto an array or whatever, another command should be used,
probably an eval.



## Utilities

### Line Numbering

This is a small ife that returns a function that either gives a line/column
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

            if (Array.isArray(data) {
                let [line, col] = data;
                return lines[line-ls] + col - (linecs;

If data is a number, then it is the position in the given text. 

            } else if (typeof target === 'number') { 
                let target = data;
                let min = 0;
                let max = lines.length;
                let guess = (min + max);

Average to integer, rounding up

                guess = (guess + (guess % 2) )/2
                while ( (max - min) > 1 ) {
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






```ignore

## Rules

There are three different phases and these are the rules in each one. 


### Section calling

A section is called with an underscore followed by a quote, possibly with some
escaping going on. It can be a command call or a pipe call or just a call for
a section by itself. 

When we enter the section calling, we should have a terminating character and
a string to process. Failure to find the terminating character results in an
error. 

When first entered, we need to determine if it is:

* a section name followed by a pipe or terminator; this is the assumed
  default. A starting underscore also does this. 
* a `~` followed by a section name and possibly arguments and then pipe or
  terminator. This will evaluate the section name (eval if string, normal
  function evaluation if function), passing in the args if
  present. If a dot follows the section name, then we try a property access
  which could be followed by a function call (passing in the arguments, but
  calling it as a normal method, not as a command with access to the scope).
  We could have multiple levels of dotting. 
* a command which is signified by parentheses happening before a pipe or
  terminator. It is also signified by a leading exclamation point. 
* quoted text is just that text. A backtick will lead to a string template evaluation. 
* A `~` followed by quotes leads to an evaling of the string, using the eval
  command. 

If parentheses are encountered, then we pass into the argument parsing. The
terminator for argument parsing is the matching parentheses. If a
pipe is encountered, we do a pipe parsing.  If terminator, then we terminate. 


Superseded, now junk, I think. 

    function generalUnderscore (text, sourcepos) {

        let pieces = [];
        let ind = 0;


        while ( (ind < text.length) && 
                (ind = text.indexOf('\u005F', ind)) !== -1 ) {
        
Check that the next character is a quote. If not increment and continue to
find the next underscore.

            if ( ['"',"'",'`'].indexOf(text[ind+1]) === -1) {
                ind += 1;
                continue;
            } 


            let terminator = text[ind+1];

Next we need to check to see if the underscore was escaped. If it is then, we
unescape as appropriate and continue to next iteration. 

            \_":check for escape"

            \_":compute indent"

            \_":get initial"

            let cmds;
            if (pipes) {
               [cmds, ind] = parsePipes(text.slice(ind), terminator);
               pieces.push([
            } else if (args) {

            }

        

    }


[get initial]()

Here we need to figure out what we are calling. 

[check for escape]()

We need to backtrack through the string. 




### Pipe parsing

This takes a string and a possible terminator and constructs command calls. 

If it starts with an underscore, it is a call to a substitution. If it starts
with a dot, then it is a property accessor (maybe command). If a `?` then it
is a boolean operation. If a `-`, then this links into the common library of
commands (such as lodash or a date library).

If it is plain text, then it is a
command name. It needs to have parentheses if it calls arguments.

A leading `~` indicates that it wants to evaluate the section name. It can be
followed by parentheses which will then evaluate the result of whatever that
is. So `~(section | sub(dude, me), this )` would take the section, replace dude with
me, and then evaluate it with an args array of `['this']`. 

Each pipe encountered creates a new argument to the pipes command. 


### Args parsing

Args parsing either terminates at the end of the string (directive title) or
at the end of the terminator (generally end parentheses). Separations occur by
commas. In an argument, the default of plain text is quoted text. Use an
underscore or tilde for a section. Parentheses indicate function. 


### stash

The command stash is how the scope can be used: `stash(val, key)` will store
the value in the key in the stash. Value comes first because the piped version
would be `stash(key)` and get value as the first argument coming in. A single
argument version `stash(key)` can be used to pop off a value. Also
`stash(undefined, key)` works. 

Maybe use a different, such as `.(key)` or `lget(key)` for local get. 

## Underscore

The basic idea of the underscore quote is that the first bit is the name of
another piece of the web. This starts the process and is the input into the
first command which happens after 


    _"~section(this , that)"
    _"echo(this, that)" 
    _"dude | sub(this, _there | cmd ) " 

    []( "dir: arg1, arg2 | process | echo(_proc) | _process, _dude")

    _"section | cmd( 'some text', section | cmd2 | cmd3(#3) )"
    
    get(section 1)

    section 1 | cmd1( this | that, there) | cmd2(this& that & there) 
     

    _"section 1 | echo(_"this") | _this | _"this | with | pipes" | 


All evaling is the command eval. 

    _"section" section retrieved
    _"~section" eval'd or called if function
    _"!cmd"  cmd called
    _"cmd()" cmd called
    _"'quoted'" 
    _"~'evaling'" eval'd
    _"_section" section called
    _"`${s.templating}`" backtick templating via an eval. s=scope is the
    scope variable associated with the command context. c=context is the
    overall context and there can also be an args in other eval uses though
    not here. 

```

