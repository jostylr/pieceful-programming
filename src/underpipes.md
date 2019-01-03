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

The biggest questionable design decision is the difference of plain text in
the three modes, all based on what is the expected default: 

* When starting with an underscore quote, plain text is a section name. In
  other places, an underscore precedes the section name. This should work in
  all other modes. 
* In pipes mode, plain text is a command name. In all other modes, a command
  must have parentheticals. 
* In args mode, plain text is plain text. In all other modes, quoted text is
  necessary. This also works in args mode. 

So three different modes, three different meanings of plain text. This is
questionable, but keeping in mind the different contexts is important. This is
also optional. One can always be explicit and consistent. 


## To terminator

This is the key parsing to wrap one's head around. This is a function that
takes in a parsing object and a mode name and a terminator, 
and returns a command object up to
the point of interest and some index and source position information.  

p is our parsing object and is basically our scope that we pass around.

    function toTerminator (p, mode, terminator) {
        let len = p.text.length;
        let origInd = p.ind;
        let ln = p.lineNumbering;

We don't care about leading white space. Ever. But we also are not cutting up
the text so no trimming. 

        let reg = /\s*/g;
        reg.lastIndex(p.ind);
        let match = reg.exec(text);

Now we are at the first non-whitespace character.

        let p.ind = reg.lastIndex;
        let first = p.text[p.ind];

If nothing, then we terminate. We have already advanced the index and no
command gets returned. As this comes first, if a terminating character is a
quote, using that quote does terminate instead of initiating a quote (good
thing). 

        if (terminator.indexOf(first) !== -1) {
            return {
                terminate : true,
            };
        }

Not terminating. If quote, we proceed until the next quote, quotes listed in
`p.q`.
    
        let cmd, start = p.ind;
        if (p.q.indexOf(first) ) {
            let end = text.indexOf(first, p.ind);
            if (end === -1) {
                let ret = {
                    tracking : p.tracking,
                    start: ln(p.ind),
                    end: ln(end),
                    text: p.text
                };
                p.tracker('unterminated quote', ret );
                throw new Error('unterminated quote', ret);
                p.ind = end;
            }
            let quote = text.slice(p.ind, end);
            cmd = [first, quote];
            p.ind = end+1;
        } else if () {

        }
            

We have now figured out the current, we seek the end. 

        let nxt = findEnd(p, mode, terminator);
        if (nxt.pipe) {
            if (mode !== 'pipe') {

Then we go into pipe mode, returning the pipe command with all the pipes. 

                cmd = ['pipe', cmd];
                let go = true;
                while (go) {
                   let ret = toTerminator(p, 'pipe', terminator);
                   if (ret.terminate) { go = false;}
                   if (p.ind >= len) { go = false;}
                   if (ret.cmd) {cmd.push(cmd);}
                }
                let ret = {
                    terminate : true;
                    cmd,
                    start : ln(start),
                    end : ln(p.ind-1)
                };
            } else {
                let ret = {
                    cmd,
                    start : ln(start),
                    end : ln(p.ind -1)
                };
            }

If it is not a pipe, then it should be a terminator. 

        } else {
            



        return ret; 

    }

### Find end

This is where we try to find an end, either a terminator character or a pipe. 

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
  terminator. 
* quoted text is just that text. 

If parentheses are encountered, then we pass into the argument parsing. The
terminator for argument parsing is the matching parentheses. If a
pipe is encountered, we do a pipe parsing.  If terminator, then we terminate. 

    function generalUnderscore (text, sourcepos) {

        let pieces = [];
        let ind = 0;

        let lineNumbering = _"line numbering";

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

            _":check for escape"

            _":compute indent"

            _":get initial"

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


## Utilities

### Line Numbering

This is a small ife that returns a function that either gives a line/column
position given a text position or gives a text position given a line/column. 

    (function (text) {
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
        
If it is an array, then it should be line/column

            if (Array.isArray(data) {
                let [line, col] = data;
                return lines[line-1] + col -1;
Assume data is a number

            } else if (typeof target === 'number') { 
                let target = data;
                let min = 0;
                let max = lines.length;
                let guess = (min + max);

average to integer, rounding up

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
                let line = min+1;
                let col = (target - lines[min] ) + 1;
                return [line, col];
            }
        };
    })(text);
