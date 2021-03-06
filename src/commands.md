# Commands

This is a module that exports a variety of commands.

We have the core portion which is available in all versions. Then there is a
full version that has a bunch of other commands to make life easy and awesome. 


## Core

These commands are always available. Hopefully a small footprint. 


    {
        //@echo: arg1, arg2, ... -> last arg
        echo : _"echo",
        //@sub: old,new, old, new, ..
        sub : _"sub",
        //@indent : text, space -> text [modifies indent on main object]
        indent : _"indent",
        //@math : type, expression
        math : _"math"
    }

### Echo

Parrots back the last argument. 

    async function echo (...args) {
        if (args.length === 0) { return ; }
        return args[args.length-1];
    }
        

### Sub

This command takes the incoming text and does replacements. The simplest
version is just pairs of strings, the leading element being what is to be
replaced and the following being the new version. 

A more complicated version allows for array pairs which will call the string
replace function with the array.

    async function sub (text, ...args) {
        if (typeof text !== 'string') {
            throw Error('cmd sub: requires text to operate on');
        }
        let n = args.length;
        let i = 0;
        while (i < n) {
            let el = args[i];
            if (Array.isArray(el) ) {
                text = text.replace(el[0], el[1]);
                i += 1;
                continue;
            }
            if (typeof el !== 'string') {
                throw Error(`cmd sub: string required for matching ${el}`);
            }
            let rep = args[i+1];
            if (typeof rep !== 'string') {
                throw Error(`cmd sub : string required for replacement ${el} to be replaced with ${rep}`);
            }
            text = text.split(el).join(rep);
            i += 2;
        }
        return text;
    }

We use the split join method as it is clean; no worry about escaping el if
converted into a regex and no worry about an infinite loop if we replaced
repeatedly and checked equality. 

### Indent 

This modifies the indent property of the piece affecting how the final indent
is done. It does nothing to the actual text in the pipe sequence. 

We want to support tabs as well as spaces. For using tabs instead of spaces,
we will use negative numbers. We will also do a global replace and
substitution for `\t` if it is a string. 

    async function indent (text, space) {
        if (typeof space === 'number') {
            let kind = ' ';
            if (space < 0 ) {
                kind  = "\t";
                space = -1*space;
            }
            let temp = '\n';
            for (let i = 0; i < space; i += 1) {
                temp += kind;
            }
            space = temp;
        } 
        if (typeof space === 'string') {
            space = space.split("\\t").join('\t');
        }
        this.scope.top.indent = space;
        return text;
    }

### Math

This is a simple math parser. A more complicated one will be part of full? For
now, it ignores the type and just assumes the goal is to evaluate it as a
JavaScript number or expression. 

    async function (type, expression) {
        if (type !== 'js:eval') {
            //emit a warning
        }
        let num = 1*expression; //number conversion
        if ( num !== num) {  //NaN test
            return eval(expression);
        } else {
            return num;
        }
    }

### Call

### Apply

### Array

### Object

### Debug

This toggles the debugging built into the core tracker. 

    async function debugger (incoming) {
        let {sym, tracker} = this;
        sym.debug = !sym.debug;
        tracker(sym, 'Debugging toggled ' + (sym.debug ? 'on' : 'off') );
        return incoming;
    }


## Full

These are extra commands that either require external dependencies or just
seem specialized. 

    {}


## TODO

`/(some comment)` command that produces a comment at the end of the
first line of the code block. 2nd arg could be comment style (css=js-long for wrapping `/* */` for example, html for their comment block, js single line is the default, but the default could include replacing newlines in the comment with a newline //, javadoc, bash, ...).  

`indent` which takes in a number and adjusts the hanging indent computation
appropriately. Pass in 'none' to do none. There could also be a directive
scope environmental variable to do it, particularly for the none. Could allow
edge cases.


* `op`  this applies an operator to arguments. Check for numbers and convert
  them. It expects symbols. Need a way to add to them or something. Anyway,
  the `>` is to take the second argument and put it into a defined function in
  the second argument. The `<` inverts it, e.g., if `>, 3, sin` then try to
  solve `sin(x) = 3`. This can use the secant method which should allow
  configuration parameters in the form of an object, which we assume is the
  purpose of anything that is an object. We could also do `^^, ^-, ^_,^/,^|` to
  find, respectively, the max, extrema, min, inflection point, vertical asymptote, `^=` could do a limit where the incoming can be the value to compute it at with javascripts infinity, negative infinity as an option. 

  Some of this can be linked into the math.js library (also the math command)


* dot expects object in first slot, property names in the middle (all strings)
  and the last argument to be, possibly empty, an array if calling a method. 


### switch*

This is a prototype command for dealing with arguments in a sequential
fashion. The command looks for a boolean every other argument, searching until
it finds something true. Then it processes the following argument. If it runs
out of arguments, then the last one should be the default. 

    async function switch (seq) {
        let ind = 0;
        let len = seq.args.length;
        while ( ind < len ) {
            if ( await seq(ind) ) {
                return await seq(ind+1);
            } else {
                ind += 2;
            }
        }
        return await seq(ind-1);
    }

