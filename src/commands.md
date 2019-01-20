# Commands

This is a module that exports a variety of commands.

All of the commands get added to the all object for convenient loading of
everything if so desired. 

    let all = {}; 

String helpers

    let string = {
        _"string"
    }; 

array helper commands

    let array = {
    
    };


    _"combine all"

    module.exports = {
        all, string, functional 
    };

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


## Incompatible commands

These are commands that don't make sense in this version: 

* compile. So this was to take in minor blocks and kind of make a template.
  Doesn't work since commands are purish in that they cannot impact other
  nodes. We can call in other blocks and use directives to create new nodes
  programmatically if we wish. 



## String

    sub :  simple text  substitution, globally so, pairs
    


## Array


## JS

## Conversion

These are commands that convert to a new type. 

    eval : arg2 is eval'd with text and args as vars, ret text
    evil : arg1 is eval'd, args as vars, ret as return
    funify : creates a function from code


### Eval

This implements the command `eval`. This evaluates the first argument as JavaScript. It
is formulated to be synchronous eval.

`code` contains the text to be eval'd which is the first argument. `text` has
the incoming text and is the return variable. `args` is available; the first
one is shifted off to the code variable.


    async function evil ( text, code, ...args ) {
        let scope = this;
        try {
            eval(code);
            return text;
        } catch (e) {
            e.msg = "eval went bad for " + code + ' ' + e.msg;
            throw e; 
        }
    }

##### cdoc

    * **eval** `text, code, arg1,...`  The `code` argument is the text of the code to
      eval. In its scope, it will have the incoming text as the `text`
      variable and the arguments, which could be objects, will be in the
      `args` array. `text` is what is returned as output. The local scope is
      available here. 

      This should make for quick hacking on text. If you want to evaluate the incoming text
      and use the result as text, then the line `text = eval(text)` as the
      first argument should work.

      Async code being eval'd should work fine. Just use `await` on promised
      objects. 


### Evil

This evaluates the input. The arguments are available in an array called args. It will pass along the value in ret which is, by default, the original value of code. 

    
    async function evil2 (code, args) {
        let scope = this;
        let ret = code;
        try {
            eval(code);
            return ret;
        } catch (e) {
            e.msg = "evil went bad for " + code + ' ' + e.msg;
            throw e; 
        }
    }


##### cdoc

    * **evil** While the eval commands thinks of the first argument as code
      acting on the incoming text, its twin evil thinks of the incoming text
      as the code and the arguments as just environment variables. The value
      returned is the variable `ret` which defaults to the original code. 


## funify

This returns a function. It assumes the incoming text will compile to a
function.
    
    async function (code, args) {
        let scope = this;
        let f;
        try {
            eval("f=" + code);
            return f;
        } catch (e) {
            e.msg = "funify went bad for " + code + ' ' + e.msg;
            throw e; 
        }

    }


##### cdoc

    * **funify** This assumes the incoming text is a function-in-waiting and
      it evals it to become so. This is great if you want to do a `.map` or if
      you just want to mess with stuff. `.call , args..` will call the
      function and return that result. 




## HTML


    {   eval : sync(_"eval", "eval"),
        passthru : sync(function (text) {return text;}, "passthru"),
        sub : _"sub",
        store: sync(_"store command", "store"),
        clear: sync(_"clear command", "clear"),
        log : sync(_"log", "log"),
        async : async(_"async eval", "async"),
        compile : _"compile",
        raw : sync(_"raw", "raw"),
        trim : sync(_"trim", "trim"),
        filter : sync(_"filter", "filter"),
        join : sync(_"join", "join"),
        cat : sync(_"cat", "cat"),
        echo : sync(_"echo", "echo"),
        get : _"get",
        array : sync(_"array", "array"),
        push : sync(_"push", "push"),
        pop : sync(_"pop", "pop"),
        "." : _"dot",
        "-" : _"dash",
        "if" : _"if",
        "ifelse" : _"ifelse",
        "done" : _"done",
        "when" : _"when"
    }

## More

These were written elsewhere and brought in. So they had a slightly different
establishing convention. 

    _"evil"

    _"funify"

    _"arrayify"

    _"objectify"

    _"regify"

    _"immediate function execution"

    _"caps"

    _"assert"

    _"wrap"

    _"js-string"

    _"html-wrap"

    _"html-table"

    _"html-escape"

    _"html-unescape"

    _"snippets"
    
    _"matrix::"

    _"comments"

    _"commands"
    
    _"mapc"

    _"for in"
    
    _"pget pset pstore"

    _"anonymous commands"

    _"json"

    _"minors"

    _"templating"
    
    _"clone merge"

    _"apply"
    
    Folder.prototype.cmdworker = _"command worker"; 
    

## Doc

This produces the command documentation. 

    ## Built in commands

    Note commands need to be one word and are case-sensitive. They can be
    symbols as long as that does not conflict with anything (avoid pipes,
    commas, colons, quotes).

    _"comdoc | .join \n"    
    _"matrix::doc"

* [comdoc](#cdoc "h5: ")

### Example inputs

    text = [];
    text.push("This is some text to play around with");


## Folder prototype
    
For the normalization, we want to make sure it is not the first character to
avoid conflicts with the leader character in certain circumstances. 

    Folder.normalize = function (name) { 
        name = name.toLowerCase().
            replace(/(.)-/g, "$1").
            replace(/(.)_/g, "$1");
        return name;
        
    };
    var sync  = Folder.prototype.wrapSync = _"Command wrapper sync";
    Folder.sync = function (name, fun) {
        _":normalize"
        return (Folder.commands[name] = sync(name, fun));
    };

    var async = Folder.prototype.wrapAsync = _"Command wrapper async";
    Folder.async = function (name, fun) {
        _":normalize"
        return (Folder.commands[name] = async(name, fun));
    };

    var defaults = Folder.prototype.wrapDefaults = _"command wrapper cb sequence";
    Folder.defaults = function (name, fun) {
        _":normalize"
        return (Folder.commands[name] = defaults(name, fun) );
    };

[normalize]()
    
    name = Folder.normalize(name);


### Command wrapper sync

This is a utility for wrapping synchronous functions that have signature
`input, args --> output`  Basically, we throw the arguments into the
form of interest and upon output, we emit it. Doc is the context of the sync. 

We catch any errors and emit an error event. This prevents further processing
of this block as the text ready event does not further. It just stops
executing. 

    function (fun, label) {
        _":switching"

        var f = function (input, args, name, command) {
            var doc = this;
            var gcd = doc.gcd;

            try {
                var out = fun.call(doc, input, args, name);
                gcd.scope(name, null); // wipes out scope for args
                gcd.emit("text ready:" + name, out); 
            } catch (e) {
                doc.log(e);
                gcd.emit("error:command execution:" + name, 
                    [e, e.stack, input, args, command]); 
            }
        };

        if (label) {
            f._label = label;
        }

        return f;
    }

[switching]()

Due to poor thinking, I put the function first and then the name. This is a
bit unconventional and is annoying. But it is easy to distinguish strings and
functions so we do so and fix it. 

        var temp;
        if (typeof fun === "string") {
            temp = fun;
            fun = label;
            label = fun;
        }


### Command wrapper async

Here we wrap callback functionated async functions. We assume the function
call will be of `input, args, callback` and the callback will
receive `err, data` where data is the text to emit. 

    function (fun, label) {
        _"command wrapper sync:switching"
        var f = function (input, args, name, command) {
            
            var doc = this;
            var gcd = doc.gcd;

            var callback = function (err, data) {
                if (err) {
                    doc.log(err);
                    gcd.emit("error:command execution:" + name, 
                        [err, input, args, command]);
                } else {
                    gcd.scope(name, null); // wipes out scope for args
                    gcd.emit("text ready:" + name, data);
                }
            };
            callback.name = name; 
            fun.call(doc, input, args, callback, name);
        };
        if (label)  {
            f._label = label;
        } 
        
        return f;
    }
    
### Command wrapper cb sequence

The idea of this is a command that is not fundamentally async, but that may
require waiting for a sequence. It expects an array whose first leading
argument is a tag function that creates a unique name for the call when passed
in the arguments. The next arguments are strings which indicate the
default value store in the document. Empty is fine. The final argument is the
function to execute in a synchronous. If you want the last one to be async,
then presumably one could just be async the whole way. This is for sync
except for a little bit of default filling in of arguments.   

fun is actually an array whose last element is the final function to execute. 

`doc.wrapDefaults`

    function (label, fun) {
        _"command wrapper sync:switching"
        var i, n, bad;

        var arr = fun.slice();
        var tag = arr.shift() || '';
        fun = arr.pop();

        _":tag"

        _":check array for non-empty string" 
        
        var f = function (input, args, name, command) {
            
            var doc = this;
            var gcd = doc.gcd;
            var v = doc.colon.v;
            
            var cbname = tag.call(doc, args);    

            gcd.when(cbname + v + "setup", cbname); 

            arr.forEach(function (el, i) {
                if ( _":check need default" ) {
                    gcd.when(cbname + v + i, cbname);
                    doc.retrieve(el, cbname + v + i); 
                } 
            });
            
            gcd.on(cbname, _":handler");
            
            gcd.emit(cbname + v + "setup");
            
        };

        if (label)  {
            f._label = label;
        } 
        
        return f;
    
    }


[handler]()

This reads off the data from the emitted events into the args array. Then it
executes the synchronous function.

The index we need for argument replacing should be in the last of the name. 

    function(data) {
        data.shift(); // get rid of setup
        data.forEach(function (el) {
            var ev = el[0];
            var i = parseInt(ev.slice(ev.lastIndexOf(v)+1));
            args[i] = el[1];
        });
        try {
            var out = fun.call(doc, input, args, name);
            gcd.scope(name, null); // wipes out scope for args
            gcd.emit("text ready:" + name, out); 
        } catch (e) {
            doc.log(e);
            gcd.emit("error:command execution:" + name, 
                [e, e.stack, input, args, command]); 
        }
    }



[check array for non-empty string]() 

This looks for a non-empty string in the array. Any entries that are not
strings get converted to empty strings. 

This swallows having non-string elements and perhaps should be revisited.

    n = arr.length;
    bad = true;
    for (i = 0; i < n; i += 1) {
        if (arr[i] && typeof arr[i] === "string") {
            bad = false;
        } else {
            arr[i] = '';

        }
    }

[check need default]()

We need the string in the defining array to be non-empty and if so, we then
only do something if the arg in the corresponding position is undefined or
empty. 

    ( el ) && ( ( typeof args[i] === "undefined" ) || ( args[i] === '' ) )


[tag]() 

This makes a function if the tag is a string. The basic idea is we have a
tagname, then we have the arguments that are called, and then a unique
counter. Hopefully this is sufficient to make it unique and identifiable.  

    if (typeof tag === "string") {
        tag = (function (tag) {
            return function (args) {
                var doc = this;
                var col = doc.colon.v;
                return tag + args.join(col) + col + doc.file +  
                    col + doc.uniq();
            };
        })(tag);
    }



### Sub

This is the sub command which allows us to do substitutions. Each pair of
arguments is a term and its replacement value. 

We will

1. Separate pairs into str, str  vs. regex, str
2. Sort the str,str by length so largest matches happen first. 
3. We execute str,str first. We do this by replacement using indexOf and
   splicing dure to general conflicts with .replace ($ replacements and lack
   of global when string is given).
4. Then we execute the regex pairs, in the order given, using usual .replace
   techniques. The default behavior of `reg()` subcommand is to generate
   global so we don't worry about it. 

The str,str construction will indent the subsequent lines so it is appropriate
to use with blocks of code. There is no special behavior of the reg exs. 


    function (str, args, name) {
        _"| globals doc, gcd, typeit"
        var regs = [];
        var strs = [];
        var i, n,  key, typ;

        _":separate regs from strings"

        _":sort string"

        _":execute string replacements"

        _":execute regs"

        gcd.emit("text ready:" + name, str); //example of bare command

    }

[separate regs from strings]()

We go through the args, checking every other one to see if it is a string or
regex. Otherwise, a warning is issue and the pair is skipped. 

    n = args.length;
    for (i = 0; i < n; i += 2) {
        key = args[i];
        typ = typeit(key);
        if (typ === 'string') {
            strs.push([key, args[i+1]]);
        } else if (typ === 'regexp') {
            regs.push([key, args[i+1]]);
        } else {
            doc.warn("cmd:sub", 
            "bad kind; either string or regexp as every other argument.",
            typ, key, args[i+1]);
        }
    }


[sort string]()

This sorts the strings array based on the length of the first element of each
element (pair array).  We want the longer to come first, so we subtract the
second first as returning a positive will switch the placement. 

    strs.sort(function (a,b) {
        return b[0].length - a[0].length; 
    });

[execute string replacements]()

We want to replace the occurence of the strings. 

    strs.forEach(function (el) {
        var index = 0, i, indented;
        var toMatch = el[0];
        var rep = el[1];
        _":check rep as str"
        while (index < str.length) {
            _":replace"
        }
    });


[check rep as str]()

    typ = typeit(rep);
    if  (typ !== 'string' ) {
        doc.warn("cmd:sub", "bad replacement; need string", 
            typ, toMatch, rep);
        return; //no replacement done
    }

[replace]()

This is the function that replaces a part of a string with another.


        i = str.indexOf(toMatch, index);

        if (i === -1) {
            break;
        } else {
            indented = doc.indent(rep, doc.getIndent(str, i));
            str = str.slice(0,i) + indented + str.slice(i+toMatch.length);
            index = i + indented.length;
        }   

[execute regs]()

    regs.forEach(function (el) {
        var reg = el[0];
        var rep = el[1];
        _":check fun or str"

        str = str.replace(reg, rep);

    });


[check fun or str]()

    typ = typeit(rep);
    if ( (typ !== 'string') && (typ !== 'function') ) {
        doc.warn("cmd:sub", "bad replacement; need string or function", 
            typ, reg, rep);
        return; //no replacement done
    }
  

##### cdoc

    * **sub** 
    
      A: Replaces parts of incoming text.   
      
      S: `str -> key1, val1, key2, val2, ... -> str`, 
        `str-> regexp, replacement str/fun -> str`
    
      This replaces `key#` in the text
      with `val#`. The replacement is sorted based on the length of the key
      value. This is to help with SUBTITLE being replaced before TITLE, for
      example, while allowing one to write it in an order that makes reading
      make sense. This is a bad, but convenient idea. 
      
      Recommend just using one pair at a time as commands can be piped along.  

      Alternate signature `regexp, replacement str/func`.
       This does a regular expression replacement
      where the first is a reg ( `reg(str, flags)` ) 
      that acts on the string and replaces it using
      the [usual javascript replacement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) syntax for the second. 

      The regex syntax can be part of pair sequences. In accordance with
      shorter first, regex's which typically are epansive, will go last, but
      amongst regex's, the order of processing is preserved.
      Recommendation is to not mix in multiple pairs with regexs. 

      E:
      
      #basic, string


###### Example

    Simple example illustrating pairwise replacement:

    `&1| sub t, !, this, that`
    
    Could also be written as

    `&1| sub this, that | sub t, ! `
    
    And is different from 

    `&1 | sub t, ! | sub this, that `
    
    Here is a regex substitution using the dollar sign replacement syntax of
    JS. 

    `&1| sub reg(\s(t)), $1$1`

    And here is one with a replacement function

    ``&1 | sub reg(\s(t|s)), fun(` (m, ts) => ts.toUpperCase() `)``


### Store Command

This is a thin wrapper of the store function. It returns the input immediately
even though the storing may not yet be done. 

    function (input, args) {
        _"|globals doc, colon, colesc"

        var vname = colesc(args[0]);
        if (args[1]) {
            vname = vname + colon +  colesc(args[1]);
        }

        if (vname) {
            doc.store(vname, input);
        }
        return input; 
    }

##### cdoc

    * **store** `variable name`  This stores the incoming text into the
      variable name.  This is good for stashing something in mid computation.
      For example, `...|store temp | sub THIS, that | store awe | \_"temp"` will
      stash the incoming text into temp, then substitute out THIS for that,
      then store that into awe, and finally restore back to the state of temp.
      Be careful that the variable temp could get overwritten if there are any
      async operations hanging about. Best to have unique names. See push and
      pop commands for a better way to do this. 

### Clear Command

This is a thin wrapper of the store function but to clear it. If a null value
is passed into doc.store, it clears the item.

    _"store command | sub ec('vname, input'), ec('vname, null')"

##### cdoc

    * **clear** `variable name`. This removes the variable name and passes
      along the input. The input has no impat on this.  
    
### Log

This outputs the input and args to the doc.log function. In particular, it
joins the args and input with `\n---\n` 

    function (input, args) {
        var doc = this;
        args = args || [''];
        var type = args.shift();
        if (!type) {
            type = '';
        }
        doc.cmdlog(input, type, args);
        return input;
    }


##### cdoc

    * **log** This will output a concatenated string to doc.log (default
      console.log) with the incoming text and the arguments. The first
      argument is treated as an idenitifer in the output. This is a good
      way to see what is going on in the middle of a transformation.

### Raw

This takes the raw text between two markers. Typically the markers will be the
header and an exclude.  This is a stand-alone command, i.e., the input is
irrelevant. 

    function (input, args) {
        var doc = this;
        var start, end, text;
        var gcd = doc.gcd;

        var file = doc.parent.docs[args[2]] || doc;
        
        if (file) {
            text = file.text;
            start = args[0].trim() + "\n";
            start = text.indexOf(start)+start.length;
            end = "\n" + args[1].trim();
            end = text.indexOf(args[1], start);
            return text.slice(start, end);
        } else {
            gcd.emit("error:raw:" + doc.file, args);
            return '';
        }


    }

##### cdoc


    * **raw** `start, end` This will look for start in the raw text of the
      file and end in the file and return everything in between. The start and
      end are considered stand-alone lines. 

### Trim

Bloody spaces and newlines

    function (input) {
        _"|globals typeit"
        var t = typeit(input);
        if (t === 'string') {
            return input.trim();
        }
        if ( (t === 'undefined') || (t === 'null') ) {
            return '';
        }
        return input.toString().trim();
    }

##### cdoc

    * **trim** This trims the incoming text, both leading and trailing
      whitespace.  Useful in some tests of mine. 


## Filter

This filters objects and arrays. 

    function (input, args) {
        _"|globals doc, typeit"
        var here = 'cmd:filter';
        var typ = typeit(input);
        var ret, num1, num2, nums, i, n;
        if (typ === 'array') {
            ret = [];
            _"filter:array"
        } else if (typ === 'object') {
            ret = {};
            _"filter:object"
        } else {
            doc.error(here, 
                "unrecognized input type; need string, array, or object", 
                input, args);
            return input;
        }
        return ret;
    }

[object]()

The keys to use are the arguments. If strings, they are assumed to be the keys
directly. If a regex, they are assumed to match the keys. If a function, then
it should take in keys, values and return a boolean indicating whether or not
to keep the value. 

If no arguments are passed in to filter, then all keys are kept. 


    // Object.keys() and then filter on the keys
    var keys = Object.keys(input);
    keys.sort();
    if (args.length === 0) {
        args[0] = true;
    }
    args.forEach(function (cur) {
        if (typeit(cur, 'regexp')) {
            keys.forEach(function (el) {
                if (el.match(cur) ) {
                    ret[el] = input[el];
                }
            });
        } else if (typeit(cur, 'function'))  {
             keys.forEach(function (el) {
                if (cur(el, input[el]) === true ) {
                    ret[el] = input[el];
                }
             });
        } else if (typeit(cur, 'string')) {
            if (input.hasOwnProperty(cur) ) {
                ret[cur] = input[cur];
            }
        } else if (cur === true) {
            keys.forEach(function (el) {
                ret[el] = input[el]; 
            });
        } else {
            _":warn"
        }
    });

[array]() 

Add values to ret.
    
    if (args.length === 0) {
        args[0] = true;
    }
    args.forEach(function (cur) {
        if ( typeit(cur, 'number') ) {
            ret.push(input[cur]);
        } else if (typeit(cur, 'string') ) {
            if ( (num1 = parseInt(cur, 10) ) == cur) {
                ret.push(input[num1]);
            } else if (cur.indexOf(":") !== -1 ) {
                _":slice"

            } else if (cur.indexOf("x") !== -1 ) {
              _":ax + b"
            }
        } else if (typeit(cur, 'function') ) {
            input.forEach(function (el, ind) {
                if (cur(el, ind) === true ) {
                    ret.push(el);
                }
            });
        } else if (cur === true)  {
            input.forEach(function (el) {
                ret.push(el);
            });
        } else {
            _":warn"
        }
    });

[slice]()

We support :b, a:, a:b, b:a with the implications of all up to and including
b, all after and including a,  all between a and b, inclusive, and the same
values for b:a, but in reverse order. Because of inclusive, we use the equals
in the for loop and thus in our default value for the upper limit, we need to
use input.length -1. 

    nums = cur.split(":");
    num1 = parseInt(nums[0].trim(), 10) || 0;
    num2 = parseInt( (nums[1] || '').trim(), 10) || (input.length-1);
    if (num1 > num2) {
        _":for | sub <=, >=, +=, -= " 
    } else {
        _":for"
    }

[for]()

    for (i = num1; i <= num2; i += 1) {
        ret.push(input[i]);
    }

[ax + b]()

This splits on x to get a first number that says how much the step size (and
what direction) to go in and the second number which says where to start (a
negative counts from the end). 

    nums = cur.split("x");
    num1 = ( parseInt(nums[0].replace(/ /g, ''), 10) || 1 );
    num2 = ( parseInt((nums[1] || '').replace(/ /g, ''), 10) || 0);
    if (num2 >= 0) {
        i = num2;
    } else {
        i = input.length + num2;
    }
    if (num1 > 0) {
        n = input.length;
        for (i; i < n; i += num1 ) {
            ret.push(input[i]);
        }
    } else if (num1 < 0) {
        for (i; i >= 0; i += num1) {
            ret.push(input[i]);
        }
    }

[warn]()

A common warning statement.

    
    doc.warn(here, 'unhandled type', typeit(cur), cur, input, args);


##### cdoc

    * **filter** This will filter an array or object into a lesser object,
      based on what the rest of the arguments are. If the input
      is an object, then it will take the rest of the arguments as either: 
        
        * type string: explicit keys to keep.
        * type regexp: keys must match the regexp to be kept.
        * type function: a function that takes in the key and value returns
          the boolean true if the key, value should be added.
        * true: if the boolean true (or no argument at all is supplied) then
          all this essentially copies the object. 
      
      It filters the object based on these criteria and returns the new
      object.

      For an array, it is similar except an array is
      returned. 

        * #  either actual number or one that parses into it. This pushes the
          entry at the number onto the new array.
        * '#:#' will slice it between the two numbers.
        * 'ax + b' b is the starting value (negative counts from the end)
          while a is the increment to add (negative goes down). 
        * type function takes in the value and index and returns true if the
          value should be added. 
        * true adds a whole copy of the array; also default if nothing is
          provided. 


## Join

This will join the incoming text and the arguments beyond the first one
together using the separator which is the first argument. This only makes
sense when there is at least one argument.   

    function (input, args) {
        _"|globals doc, typeit"
        var here = 'cmd:join';
        var sep = args.shift() || '';
        _"|check sep, type, string" 
        var typ = typeit(input);
        var ret, num1, num2, nums, i, n;
        if (typ === 'string') {
            if (input) { 
                // input may be empty and it should  not be added then
                args.unshift(input);
            }
            ret = args;
        } else if (typ === 'array') {
            ret = [];
            _"filter:array"
        } else if (typ === 'object') {
            ret = [];
            _"filter:object 
                | sub ret[el] = input[el], ec('ret.push(input[el])')
                | sub ret[cur] = input[cur], ec('ret.push(input[cur])') "
        } else {
            doc.error(here, 
                "unrecognized input type; need string, array, or object", 
                input, args);
            return '';
        }
        return ret.join(sep);
    }

##### cdoc

    * **join** This will concatenate the incoming text and the arguments
      together using the first argument as the separator. Note one can use
      `\n` as arg1 and it should give you a newline (use `\\n` if in a
      directive due to parser escaping backslashes!). No separator can be as
      easy as `|join ,1,2,...`.

      This also does double duty as something entirely different. If the input
      is an object or an array, then it first filters it according to the
      arguments, just as in the filter command, and then joins the results
      with the first argument as the join separator. For objects, if the keys
      are a group (such as regexp matching), then they will be sorted
      alphabetically first before joining. 



### Cat

Concatenating text together and returning it. Probably mostly a single
argument use case. 

    function (input, args) {
        var sep = '';
        if (input) {
            args.unshift(input);
        }
        return args.join(sep);
    }


##### cdoc


    * **cat**  The arguments are concatenated with the incoming text as is.
      Useful for single arguments, often with no incoming text.

### Echo

This is a simple command to echo the argument and ignore the input. Why?  This
allows one to use subcommands and start it in the chain. `cat` kind of does
this but just for text. 

    function (input, args) {
        return args[0];
    }

##### cdoc

    * **echo** `echo This is output` This terminates the input sequence and
      creates a new one with the first argument as the outgoing. 

##### Sync

    echo
    ---
    _"../"
    ---
    `echo arg` This returns the first argument to pass along the pipe flow.
    Nothing else is done or passed. 


### Get

This gets a section from the document just as if one were using the
substitution text. This is useful for compositions. 

It takes an optional command

    function (input, args, name) {
        var doc = this;
        var colon = doc.colon;

        var section = colon.escape(args.shift());
        doc.retrieve(section, "text ready:" + name);
    }

##### cdoc

    * **get** `get blockname` This is just like using `\_"blockname"` but that
      fails to work in compositions. So get is its replacement. This ignores
      the input and starts its own chain of inputs. 

### Array

This shunts the input and the arguments into an array to be passed onto the
next pipe.

    function (input, args) {
        args.unshift(input);
        return args;
    }
    
##### sync

    arr 
    _"../"
 
##### doc

    arr
    `arr arg1, arg2, ...` This generates an array to pass on that consists of
    `[input, arg1, arg2, ...]`. 


##### test

Basic test and also, having some inline stuff. 

    arr.md
    ---
    var f = _"../";
    var a = f("1", ["2", "3"]);
    var b = ["1", "2", "3"];
    t.deepEquals(a, b);
    t.equals(a, b);


##### cdoc


    * **array** `array a1, a2, ...` This creates an array out of the input and
      arguments. 


## Dot

This defines the command `.`  It takes the incoming thing as an object and
uses the first argument as the method to call. The other arguments are just
used in the calling of the method. 

So for example if the input is an array, then we can use `. join ;\n` to join
the array into text with a semicolon and a newline at each end. 

Adding a little async option. If the object has a method that is the command,
but with a `.` in front, then we call that as if it was a command. Otherwise,
we assume a normal property. 

If property does not exist yet, this causes a problem.

    function (input, args, name, cmdname) {
        var doc = this;
        var gcd = doc.gcd;
        var propname = args.shift();
        var async = false;
        var prop;
        if ( (prop = input["." + propname] ) ) {
            async = true;
        } else {
            prop = input[propname];
        }
        var ret;
        if (typeof prop === "function") {
            if (async) {
                prop.call(doc, input, args, name, cmdname);
                return;
            } else {
                ret = prop.apply(input, args);
                if (typeof ret === "undefined") {
                    doc.log("method returned undefined ", 
                        "cmd:dot", input, "proerty requested:" + propname, args);
                    ret = input;
                } 
            }
        } else if (typeof prop === "undefined") {
            doc.log( "property undefined ", 
                "cmd:dot", input, "property requested:" + propname, args); 
            ret = input; 
        } else {
            ret = prop;
        }
        gcd.emit("text ready:" + name, ret);
    }

##### cdoc

    * **.** `. propname, arg1, arg2,... ` This is the dot command and it
      accesses property name which is the first argument; the object is the
      input (typically a string, but can be anything). If the property is a
      method, then the other arguments are passed in as arguments into the
      method. For the inspirational example, the push directive creates an
      array and to join them into text one could do `| . join, \,`. There is
      also an alias so that any `.propname` as a command works. For example,
      we could do `| .join \,` above.  This avoids forgetting the comma after
      join in the prior example. 

## Dash

This defines the command `-`  It looks up the first argument as a property of
the properties in
the `doc.dash` object and then calls it as a command. 

For example, in full using lodash,  `-pad 5`  will pad incoming strings to
make them length 5. It does this by the leader `-` sending `pad, 5` as the
arguments to this command and this command looking through its objects for the
pad method and then calling that command. The dash object might look like: `{
'lodash' : [lodash, #], {'date': [datefns, #], ...}`  where `lodash` and
`datefns` are the objects with the methods to call and the keys are the
associated command. So it will look in `lodash` for the property `pad` and
then call the `lodash` command as `lodash pad, 5`; it searches in order of the
numbering; random otherwise.

`doc.dash === parent.dash === Folder.dash` avoids prototype issues. Also I
think prototyping the dash is confusing. 
 
    function (input, args, name ) {
        var doc = this;
        var gcd = doc.gcd;
        var propname = args[0];
        var cmd;
        var dash = doc.dash;
       
        _":found"
        
        // no such property
        if (!found) {
            doc.log("Command dash: no such property: " +  propname +
                " with args: " + args.join("\, ") );
            gcd.emit("text ready:" + name, input);
        } else {
            doc.commands[cmd].call(doc, input, args, name);
        }
    }

[found]()

This is also used in the subcommands dash. 


        var found = Object.keys(dash).sort(function (a,b) {
           var numa = dash[a][1], numb = dash[b][1];
           var ret = numa - numb;
           if (isNaN(ret)) {
                return 0;
           } else {
                return ret;
           }
        }).some(function (a) {
            if (typeit(dash[a][0][propname], "function" )) {
                cmd = a;
                return true;
            }
        });

##### cdoc

    * **-** `- propname, arg1, arg2,... ` This is the dash command and it
      accesses the utility property which is the first argument; the object is the
      input (typically a string, but can be anything). It calls the relevant
      command with that method. 

      Each object in the `Folder.dash` has the form `cmdname: [object with
      methods, num]` where the command name is the name to be called (such as
      `lodash` and the methods should be on the called object, such as
      `require('lodash')` and the `num` order the search, with lower numbers
      coming first. 


### Push

    function (input, args, name) {
        var folder = this.parent;
        var stack = folder.stack;
        var cmdpipe = name.slice(0, name.lastIndexOf(folder.colon.v));
        if (stack.hasOwnProperty(cmdpipe)) {
            stack[cmdpipe].push(input);
        } else {
            stack[cmdpipe] = [input];
        }
        return input;
    }

##### cdoc

    * **push** Simply pushes the current state of the incoming text on the
      stack for this pipe process.

### Pop 

    function (input, args, name) {
        var gcd = this.gcd;
        var folder = this.parent;
        var stack = folder.stack;
        var cmdpipe = name.slice(0, name.lastIndexOf(folder.colon.v));
        var ret;
        if (stack.hasOwnProperty(cmdpipe)) {
            ret = stack[cmdpipe].pop();
            if (stack[cmdpipe].length === 0) {
                delete stack[cmdpipe];
            }
        } else {
            gcd.emit("error:pop found nothing to pop:"+name);
            ret = input;           
        }
        return ret;
    }

##### cdoc

    * **pop** Replaces the incoming text with popping out the last unpopped
      pushed on text.

### if

This checks a flag and then runs a command. 

    function (input, args, name) {
        var doc = this;
        var gcd = doc.gcd;
        var bool = args[0];
        var cmd;

        if (bool) {
            cmd = args[1];
            args = args.slice(2);
            _"command waiting"
        } else {
            gcd.emit("text ready:" + name, input);
        }
    }

##### cdoc

    * **if** `boolean, cmd, arg1, arg2, ....` If the boolean is true, 
      then the command will execute with the given input text and
      arguments. Otherwise, the input text is passed on. This is usefully
      paired with the subcommand boolean asks. For example 
      `?and(?flag(left),?flag(right)) will execute the `if` if both `left` and
      `right` are flagged.

#### command waiting

This waits for a command to be defined.

    
    if (doc.commands[cmd]) {
        doc.commands[cmd].call(doc, input, args, name);
    } else {
        gcd.once("command defined:" + cmd, function () {
            doc.commands[cmd].call(doc, input, args, name);
        });
    }


### ifelse

This is similar to the if, but it allows for multiple conditions. Each
argument should be an array of the form `arr(bool, cmdname, arg1, arg2, ..)`

    function (input, args, name) {
        var doc = this;
        var gcd = doc.gcd;

This goes until something has a true boolean. Then it executes and stops. To
have a final condition that will execute, pass in `true()`. 

        var cmd;
        var checked = args.some(function (el) {
            if ( el[0] === true ) {
                cmd = el[1];
                args = el.slice(2);
                _"command waiting"
                return true;
            } else {
                return false;
            }
        });

If checked is false, then no condition meets and we continue on. 

        if (!checked) {
            gcd.emit("text ready:" + name, input);
        }

    }


##### cdoc

    * **ifelse** `arr(bool, cmd, arg1, arg2, ...), arr(bool2, cmd2, arg21,
      arg22, ...), ...` This expects arrays of the above form as arguments. It
      works through the conditions until it finds a true value and then it
      executes the command. If none are found, then it passes along the input
      text. 



### when

This pauses the flow until the argument list of events is done. 

    function (input, args, name) {
        var folder = this.parent;
        var gcd = this.gcd;
        var done = folder.done;
        var cache = done.cache;
        var when = [];

        var i, n = args.length;
        for (i = 0; i < n; i +=1) {
            if (! cache[args[i]]) {
                when.push(args[i]);
            }
        }
        if (when.length > 0) {
            done.gcd.once("ready to send:" + name, function () {
                gcd.emit("text ready:" + name, input);
            });
            done.gcd.when(when, "ready to send:" + name);
        } else {
            gcd.emit("text ready:" + name, input);
        }
    }

##### cdoc

    * **when** `name1, name2, ...` This takes in the event names and waits for
      them to be emitted by done or manually with a
      `doc.parent.done.gcd.once(name, "done")`. That would probably be used in
      directives. The idea of this setup is to wait to execute a cli command
      for when everything is setup. It passes through the incoming text. 

### done

This allows one to issue a command of done. 

    function (input, args, name) {
        var gcd = this.gcd;
        this.parent.done.gcd.emit(args[0]);
        gcd.emit("text ready:" + name, input);
    }

[action]()

This is the action name to assign for listening to done events. Something like
`doc.done.gcd.once(str, "done");` where str is the string that is also in the argument
list, something like `file saved:...`;

    function (data, evObj) {
        var folder = this;
        folder.done.cache[evObj.ev] = true;
    }

##### cdoc

    * **done** `name` This is a command to emit the done event for name. It
      just passes through the incoming text. The idea is that it would be,
      say, a filename of something that got saved. 

## Arrayify

This is a convenience method for creating arrays from a block of text. 


    Folder.plugins.arrayify = {
        sep : "\n",
        esc : "\\",
        trim : true
    };
    Folder.sync("arrayify", _":fun");
    

[fun]()    
    
    function (input, args) {
        var plug = this.plugins.arrayify;
      if (typeof args[0] === "object") {
            plug = merge(true, plug, args.shift());
        } 
        var sep = args[0] || plug.sep;
        var esc = args[1] || plug.esc;
        var trim = args[2] || plug.trim;

        var ret = [];
        var i, n = input.length, j = 0;
        for (i = 0; i < n; i += 1) {

            if (input[i] === sep) {
                ret.push(input.slice(j,i));
                j = i + 1;
                continue;
            }

If we have an escape and the next one is escape or sep, then we slice it to
exclude i, putting i+1 at i, and the next round will bump the i safely past it. 
The only need to escape the escape is if there is a separator after the escape
character and the escape character is not supposed to escape. 

            if (input[i] === esc) {
                if ( (input[i+1] === sep) || (input[i+1] === esc) ) {
                    input = input.slice(0,i) + input.slice(i+1);
                    continue;
                }
            }
        }
        ret.push(input.slice(j, i));

        if (trim) {
            ret = ret.map(function (el) {
                return el.trim();
            });
        }
         
        return ret;

    }


##### cdoc

    * **arrayify** This takes the incoming text and creates an array out of
      it. The first argument is an object with keys `sep` to know what to
      split on, `esc` to escape the separator and itself, `trim` a boolean
      that will trim the text for each entry. The defaults are newline,
      backslash, and true, respectively. You can also pass them as the first,
      second, and third argument, respectively. 
      Note that this assumes that both sep
      and esc are single characters. You can have the usual block
      substitutions, of course, but it might be safer to escape the block and
      run it through compile, e.g., ` | arrayify | .mapc compile`. 
      This also allows nesting of objects. To get a string representation of
      the array, call `| .toString`.


## Objectify


This is a convenience method for creating objects from a block of text. 


    Folder.plugins.objectify = {
        key : ":",
        val : "\n",
        esc : "\\",
        trim : true
    };
    Folder.sync("objectify", _":fun");
    

[fun]()    
    
    function (input, args) {
        var plug = this.plugins.objectify;
        if (typeof args[0] === "object") {
            plug = merge(true, plug, args.shift());
        } 
        var keysep = args[0] || plug.key;
        var valsep = args[1] || plug.val;
        var esc = args[2] || plug.esc;
        var trim = args[3] || plug.trim;

        var ret = {};
        var key = "";
        var i, n = input.length, j = 0;
        for (i = 0; i < n; i += 1) {

            if (input[i] === keysep) {
                key = input.slice(j,i).trim();
                j =  i + 1;
                continue;
            }
            if (input[i] === valsep) {
                ret[key] = input.slice(j,i);
                j =  i + 1;
                continue;
            }


If we have an escape and the next one is escape or sep, then we slice it to
exclude i, putting i+1 at i, and the next round will bump the i safely past it. 
The only need to escape the escape is if there is a separator after the escape
character and the escape character is not supposed to escape. 

            if (input[i] === esc) {
                if ( (input[i+1] === keysep) ||
                     (input[i+1] === valsep) ||
                     (input[i+1] === esc) ) {
                   input = input.slice(0,i) + input.slice(i+1);
                   continue;
                }
            }
        }
        
        ret[key] = input.slice(j, i);
            
        if (trim) {
            Object.keys(ret).forEach( function (key) {
                 ret[key] =  ret[key].trim();
            });
        }

        return ret;    

    }


##### cdoc

    * **objectify** This takes the incoming text and creates an object out of
      it. The first argument is an object with keys `key` to know what to
      split on for the key, `val` to split on for the end of the value, `esc`
      to escape the separator and itself, `trim` a boolean that will trim the
      value for each entry; keys are automatically trimmed. The defaults
      are colon, newline, backslash, and true, respectively. 
      Note that this assumes
      that all the characters are single characters. You can have the usual
      block substitutions, of course, but it might be safer to escape the
      block and run it through compile, e.g., ` | objectify | .mapc compile`.
      This also allows nesting of objects. Call `|.toString()` to get a
      string. 


## regify

    Folder.sync('regify', _":fun");

[fun]()

    function (input, args) {
        _"|globals doc, typeit"

        var text = input;
        var flags = args[0];

        _":core"

    }

[core]()

This is used here and in subcommand reg

    if ( typeit(flags) !== 'string' ) {
        flags = 'g';
    } else if (flags.match('-') !== -1) {
        flags = flags.replace('-', ''); 
    } else if (flags.match('g') === -1) {
        flags += 'g';
    }
    var reg;

    try {
        reg = new RegExp(text, flags);
        return reg;
    } catch(e) {
        doc.error("cmd:regify", "failure to compile regular expression", 
            "to compile:", text, "flags:", flags, 
            "error:", e.message );
    }

##### cdoc

    * **regify** Turns the incoming input into a regular expression. First
      argument are the flags; if none, g is assumed, but if some flags are
      specificed one should add g. If no global needed use, '-'.


## Immediate Function Execution

Nowadays, it is better to use   `{ let ... }`.  But this may still be of some
use. 

When writing this snippets of code everywhere, a problem arises as to where to
place the scope of the variables. How do we avoid temporary variables from
polluting the full scope? And how do we effectively write tests for such
snippets?

The solution is the immediate function expressions. If we enclose a snippet in
function () {} () then we get a nice enclosed scope. If we also want to add in
some parameters from the surrounding (say read-only parameters or something to
be evaluated into a closure for later use), then we can do that as well.

The syntax will be ife for the no parameter version and ` ife v, w=hidethis` to
have parameters such as function(v,w) {} (v, hidethis) That is, the = is used
to rename an outer parameter into a different variable name while just a
single variable name is assumed to have the outer variable blocked.

This is designed to detect whether it is a function or not (by first word
being function) and then return the function or simply execute the code. To
set the return value by piping, include return = text where text is what one
would write after the return: return text

    Folder.sync("ife", _":fun");


[fun]()

    function (code, args) {
        var i, n = args.length;

        var internal = [];
        var external = [];
        var arg,ret; 

        for (i=0; i <n; i +=1 ) {
            arg = args[i] || "";
            arg = arg.split("=").map(function (el) {
                return el.trim();
            });
            if (arg[0] === "return") {
                ret = arg[1] || "";
            } else if (arg.length === 1) {
                internal.push(arg[0]);
                external.push(arg[0]);
            } else if (arg.length === 2) {
                internal.push(arg[0]);
                external.push(arg[1]);
            }

        }

        var start = "(function ( "+internal.join(", ")+" ) {";
        var end = "\n} ( "+external.join(",")+" ) )";

        if (typeof ret === "string") {
            return start + code + "\n return "+ret+";" + end;
        } else if (code.search(/^\s*function/) === -1) {
            return start + code + end;
        } else {
            return start + "\n return "+ code +";"+ end;
        }
    }

##### cdoc

    * **ife** This takes a snippet of code and creates an immediate function
      execution string for embedding in code. the arguments become the
      variable names in both the function call and the function definition. If
      an equals is present, then the right-hand side is in the function call
      and will not be hidden from access in the ife. 


## caps

The idea of this is to use capital letters as abbreviations. This is not
elegant, but it is kind of cool.

    Folder.plugins.caps = _":matches";
    
    Folder.sync("caps", _":fun");
 

[fun]()

    function (input, args) {
        var matches = args[0] || this.plugins.caps;
        var match, ret;

        var i = 0; 
        while (i < input.length) {
            if (matches.hasOwnProperty(input[i]) ) {
                match = matches[input[i]];
                if (typeof match === "string") {
                    //space after cap
                    if ( (input[i+1] === " ") || 
                        (input[i+1] === "\n") ||
                        ( (i+1) === input.length) ) {
                        input = input.slice(0, i) + match + input.slice(i+1);
                        i += match.length;
                    }
                } else if (typeof match === "function") {
                    ret = match(i, input);
                    input = ret[0];
                    i = ret[1];
                }
            }
            i += 1;
        }

        return input;
    }
    
`[test | M W>900px a](# "tranform: | caps | assert echo('@media (min-width: 900px) a') , caps test ")`

[matches]()

These are the matches. Each match is either a simple string or a function that
takes in the index and string and returns the replaced string.
    
    {
        M  : "@media",
        W : function (ind, input) {
                _":width"
            }
    }

[width]()

The width converts "<" and ">" into max and min widths. It is to be surrounded
by parentheses. It should be of the form `W<600px `  with no spaces until
after the unit. 

    var reg = /\ |\n|$/g;
    reg.lastIndex = ind;
    reg.exec(input);
    var end = reg.lastIndex -1; //input.indexOf(" ", ind);
    var num = input.slice(ind+2, end);
    var rep;
    if (input[ind+1] === "<") {
        rep = "(max-width: " + num + ")";
    } else if (input[ind+1] === ">") {
        rep = "(min-width: " + num + ")";
    } else {
        return [input, ind];
    }
    return [input.slice(0, ind) + rep + input.slice(end), ind+rep.length];

##### cdoc

    * **caps** This is a command that tries to match caps and replace them.
      The idea comes from wanting to write `M W>900px` and get `@media
      (min-width:900px)`. This does that. By passing in a JSON object of
      possible matches as argument or setting the caps local object to an
      object of such matches, you can change what it matches. But it only
      will match a single character (though unicode is fine if you can input
      that).  

## assert

This is a little command that should be more general. It tests for equality of
the strings.


    Folder.sync("assert", _":fun");


[fun]()

    function (input, args) {
        var doc = this;
        if (input !== args[0]) {
            doc.log("FAIL: " + args[1] + "\nACTUAL: " + input + 
                "\nEXPECTED: " + args[0]); 
        }
        return input;
    }

##### cdoc

    * **assert** This asserts the equality of the input and first argument
    and if it
      fails, it reports both texts in a log with the second argument as a
      message. `something | assert \_"else", darn that else`. This is a way to
      check that certain things are happening as they should. 


## wrap

This takes the incoming text and wraps it between the first and second
arguments. 

    Folder.sync("wrap", _":fun");

[fun]() 

    function (code, args) {
        return args[0] + code + args[1];
    }

##### cdoc

    * **wrap** This wraps the incoming text in the first and second argument:
      `some text | wrap <, >"  will result in `<some text>`. 

## js-string


If one is trying to insert a long text into a JavaScript function, it can have
issues. So here is a little helper command that will split new lines, escape
quotes, and then put it out as an array of strings joined with new lines.

    Folder.sync("js-string", _":fun");

[fun]()

    function (code, args) {
        var quote = args[0] || '"';
        quote = (args[0] === 'q') ? "'" : quote;
        quote = (args[0] === 'qq') ? '"' : quote;
        code = code.replace(/\\/g, '\\\\');
        code = code.replace(/"/g, '\\' + quote);
        var arr = code.split("\n");
        var i, n = arr.length;
        for (i = 0; i < n; i += 1) {
            arr[i] = quote + arr[i] + quote;
        }
        code = arr.join(" +\n");
        return code;
    }

##### cdoc

    * **js-string** This breaks the incoming text of many lines into quoted
      lines with appropriate plus signs added. The first argument allows for a
      different quote such as `'`. The double quote is default. Also `q` and
      `qq` generates single and double quotes, respectively. 


## Html-wrap

This wraps content in a tag with arguments as attributes. 

    Folder.sync("html-wrap", _":fun");

[fun]()

    function (code, options) {

        var element = options.shift();

        _":Create attribute list"

        return "<" + element + " " + attributes + ">"+code+"</"+element+ ">";
    }  
    
[Create attribute list]()

We want to create an attribute list for html elements. The convention is that
everything that does not have an equals sign is a class name. So we will
string them together and throw them into the class, making sure each is a
single word. The others we throw in as is.

    var i, option, attributes = [], klass = [], str, ind;

    for (i = 0; i < options.length; i += 1) {
        option = options[i];
        if ( ( ind = option.indexOf("=")) !== -1 ) {
            str = option.slice(0, ind+1) + '"' + 
                option.slice(ind+1).trim() + '"';
            attributes.push(str);
        } else { // class
            klass.push(option.trim());
        }
    }
    if (klass.length > 0 ) {
       attributes.push('class="'+klass.join(" ")+'"');
    }
    attributes = attributes.join(" ");

##### cdoc

    * **html-wrap** This takes the incoming text and wraps it in a tag
      element, using the first argument as the element and the rest of the
      arguments as attributes. An equals sign creates an attribute with value,
      no equals implies a class. An attribute value will get wrapped in
      quotes. 
      `text-> | html-wrap p, data, pretty, data-var=right`
      will lead to  `<p class="data pretty" data-var="right">text</p>`

## Html-table

This takes in a matrix and spits out an html table.

This could also have been a property of matrices, but it feels like something
that is a command on it to produce something new. 

    Folder.sync("html-table", _":fun");

[fun]()

    function (mat, options) {
        var type = options.shift();

        _"html-wrap:create attribute list"

        var ret = "<table" + (attributes.length ? " " + attributes : "") + ">\n";

        if (Array.isArray(type) ) {
            _":make row | sub td, th, row, type"
        }
      
    
        var f = function (row) {
            _":make row"
            return null;
        };   

        if (mat.rows) {
            mat.rows(f); //allows for matrix, but if not then dbl arr
        } else {
            mat.forEach(f);
        }


        ret += "</table>\n";
        return ret; 
    }

[make row]()

    ret += "<tr><td>" + row.join("</td><td>") + "</td></tr>\n";

##### cdoc

    * **html-table** This requires an array of arrays; matrix is
      good. The first argument should either be an array of headers or
      nothing. It uses the same argument convention of html-wrap for the rest
      of the arguments, being attributes on the html table element. We could
      allow individual attributes and stuff on rows and columns, but that
      seems best left to css and js kind of stuff. Still thinking on if we
      could allow individual rows or entries to report something, but that
      seems complicated. 


## Html-escape

An extremely simple-minded escaping of the given code to be safe in html, 
e.g., javascript into an html pre element.

Replace <>& with their equivalents.

    Folder.plugins.html_escape = {
        '<' : '&lt;',
        '>' : '&gt;',
        '&' : '&amp;'
    };

    Folder.sync("html-escape", _":fun");

[fun]()


    function (code) {
        var chars = this.plugins.html_escape;
        var record = [];
        var i = 0, start = 0, n = code.length;
        while (i< n) {
            var char = chars[code[i]];
            if ( char) {
                record.push(code.slice(start, i), char);
                start = i+1; 
            }
            i += 1;
        }
        record.push(code.slice(start));
        return record.join('');
    }

##### cdoc
    
    * **html-escape** This escapes `<>&` in html. It is mainly intended for
      needed uses, say in math writing. Very simple minded. One can modify the
      characters escaped by adding to `Folder.plugins.html_escape`. This is
      actually similar to caps and snippets. 

## HTML-Unescape

    Folder.plugins.html_unescape = {
        'lt' : '<',
        'gt' : '>',
        'amp' : '&'
    };

    Folder.sync("html-unescape", _":fun");

[fun]()


    function (code) {
        var reg = /\&(\w+)\;/g;
        var chars = this.plugins.html_unescape;
        var match;
        var record = [];
        var start = 0;
        while ( (match = reg.exec(code) ) !== null)  {
            var char = chars[match[1]];
            if ( char) {
                record.push(code.slice(start, match.index), char);
                start = reg.lastIndex; 
            }
        }
        record.push(code.slice(start));
        return record.join('');
    }


##### cdoc

    * **html-unescape** The reverse of html-escape, depending on what the
      symbols are in `plugins.html_unescape`. 

## Snippets

This handles snippets. Currently it is empty of default snippets. Most likely,
one would develop a standard lprc.js with the snippets in there. 

    Folder.plugins.snippets = {};

    Folder.sync("snippets", _":fun");
    Folder.sync("s", _":fun");

[fun]() 

    function (code, args) {
        var name = args.shift();
        var plug = this.plugins.snippets;
        var snip, ret, reg, match, rep, num;
        if (plug.hasOwnProperty(name)) {
            snip = plug[name];
            if (typeof snip === "function" ) {
                ret = snip.apply(this, args);
            } else if (typeof snip === "string") {
                _":string"
            } else {
                this.log("Unknown type of snippet:"  + args.join(", "));
                ret = args.join(",");
            }
            
        } else {
            this.log("Unknown snippet: " + args.join(", "));
            ret = args.join(",");
        }
    return ret;
    }

[string]()

So we want to be able to plug in simple parameters. 

    ret = snip;
    reg = /ARG(\d+)(?:\|\|([^|]*)\|)?/g;
    while ( (match = reg.exec(ret) ) !== null ) {
        num = parseInt(match[1],10);
        if (typeof args[num]  !== "undefined") {
            rep = args[num];
        } else { //string or undefined
            rep = match[2] || '';
        }
        ret = ret.slice(0, match.index) + rep + 
            ret.slice( match.index + match[0].length );
        // as string is changing, update lastIndex, but make sure we get past
        reg.lastIndex = match.index + rep.length; 
    }



##### cdoc

    * **snippets** (alias **s** ). This is a function for things that are
      easily named, but long to write, such as a cdn download script tag for a
      common js library, say jquery. `s jquery` could then do that. Currently,
      there are no default snippets. To load them, the best bet is in the
      lprc.js file and store the object as `Folder.plugins.snipets = obj` or,
      if you are feeling generous, one could do
      `Folder.merge(Folder.plugins.snippets, obj);`. This is really a
      stand-alone command; incoming text is ignored. 

      In writing a snippet, it can be a function which will take in the
      arguments. Alternatively, you can sprinkle ``ARG#||...| `` 
      in your code for
      the Argument with numner # and the pipes give an optional default; if
      none, then ARG# is eliminated. So `ARG0||1.9.0|` yields a default of
      1.9.0. Pipes cannot be in the default

      Be careful that the first argument is the snippet name. 

## Comments

This is to allow comments in a pipe. It actually does nothing to the input,
but will do a side effect of storing the state for review (kind of a log) if
the hash is followed by text

    Folder.sync("#", _":fun");

[fun]()

    function (input, args) {
        if (args.length === 2) {
            this.comments[args[0]] = input;
        }
        return input;
    }


##### cdoc

    * **#/#name** This is just a comment. For special-character free text,
      one can just write it, but if one wants to include special characters,
      use `ec('...')`. Example `# This is a comment` or `#dude this is a
      comment`. This latter form will store the current state into
      `doc.comments`. 

## Commands

This does a sequence of commands. It is mainly used for an if-else construct.
The compose directive could also be used, but if it is a one-off sequence,
this is probably more convenient. 

    Folder.commands.cmds = _":fun";

[fun]()

A little unsure if the name could conflict. Will use `name + :cmds:#`

We need to extract the command and arguments for each. 

    function (input, seq, finalname) {
        var doc = this;
        var gcd = doc.gcd;
        var colon = doc.colon.v;
        var typeit = doc.Folder.requires.typeit;
        var args, cmd; 

        var hanMaker = _":handler";
        var nameMaker = _":namer";


The number of arguments should be even, but if not, we assume the last
argument is a command. 

        var i, last = ( (seq.length % 2) === 0 ) ? seq.length-2 : seq.length -1; 

When the last command is ready, we emit that text. This is just a passing off. 

        gcd.flatWhen("text ready:" + nameMaker(last), "text ready:" + finalname);

Now we set all the rest to execute. 

        for (i = last; i >= 0; i -= 2 ) {
            if (typeit(seq[i+1], 'array')) {
                args = seq[i+1];
            } else {
                args = [seq[i+1]];
            }
            cmd = seq[i];
            if (i > 0) {
                gcd.once("text ready:" + nameMaker(i-2), 
                    hanMaker(cmd, args, nameMaker(i) ) );
            } else {
                hanMaker(cmd, args, nameMaker(i))(input);
            }
        }
    }

[handler]()

The handle takes in the incoming event data (input) and then runs it through
the command and spits out the name. It may need to wait for the command. This
makes the handler.

    function (cmd, args, name) {
        var f = function (input) {
            _"command waiting"
        }; 
        f._label = "cmds;;" + name;
        return f;
    }


[namer]()

This is where we make the names, based on the position. 

    function (i) {
        var ret = finalname + colon + "cmds" + colon + i;
        return ret;
    }


##### cdoc 

    * **cmds** This creates a sequence of commands to execute, most likely
      used with if-else since a single pathway is covered by the usual pipe
      syntax. The form is `cmds cmd1, array of args for 1, cmd2, args for
      2`, e.g., `cmds sub, arr(awe, dud), cat, arr(dude, what)`... If it is
      just one argument, then the array is not needed (if it is just one
      argument and that is an array, wrap that in an array)). 


## mapc

This runs each element of the input (assuming array or obj) and applies a
command. Else, it applies the command. Shortname of `*`. 

    
    Folder.commands['*'] = Folder.commands.mapc = _":fun";

[fun]()

    function self (input, args, name) {
       _"|globals doc, gcd, colon, typeit, normalize"

Make sure command is normalized

        args[0] = normalize(args[0]);

        var cmd = args.shift();

        var t = typeit(input);

        var newarr, i, n;
        var newobj, keys;
        var setup = "mapc setup:" + name;
        var ready = "mapc ready:" + name;
        var track;
        
        if (t === 'array') {
            _":setup array"
        } else if (t === 'object') {
            _":setup object"
        } else {
            doc.cmdworker(cmd, input, args, name);
        }

    }

[setup array]()

We need to iterate over the input, generating a unique name for each command,
adding it to a .when so that when they are all done, we issue the next command
using a new array of results to pass along. 

    track = gcd.when(setup, ready);
    track.silence(setup);
    n = input.length;
    newarr = [];
    for (i = 0; i < n; i += 1) {
        gcd.when("text ready:" + name + colon + i, ready);
        doc.cmdworker(cmd, input[i], args, name + colon + i);
    }
    gcd.on(ready, function (data) {
        data.forEach(function (el) {
            var ind = el[0].split(colon).reverse()[0]; //gets i
            var idata = el[1];
            newarr[ind] = idata;
        });
        gcd.emit("text ready:" + name, newarr);
    });
    gcd.emit(setup);

[setup object]()

Similar to the array, but we iterate over the keys. Also different from the
array, we scan the args for `*KEY*` and replace that in the args. 

    
    track = gcd.when(setup, ready);
    track.silence(setup);
    keys = Object.keys(input);
    newobj = {};
    var keyreg = /(\*KEY\*)(\**)/g;
    keys.forEach(function (key) {
        gcd.when("text ready:" + name + colon + key, 
            ready);
        var newargs = args.map(function (el) {
            if (typeit(el, 'string') ) {
                el = el.replace(keyreg, _":replace key");
            }
            return el;
        });
        doc.cmdworker(cmd, input[key], newargs, name + colon + key);
    });
    gcd.on(ready, function (data) {
        data.forEach(function (el) {
            var key = el[0].split(colon).reverse()[0]; //gets key
            var kdata = el[1];
            newobj[key] = kdata;
        });
        gcd.emit("text ready:" + name, newobj);
    });
    gcd.emit(setup);


[replace key]()

This is inserts the key and handles escaping by removing an asterisk. 

    function (full, first, asters) {
        if (asters.length !== 0) {
            return first + asters.slice(1);
        } else {
            return key;
        }
    }

##### cdoc

    * **mapc** or **`*`** with `cmd, arg1, ...` 
    This takes the input and applies `cmd` to each, if array or obj.
    Otherwise, just appleis command to whole input. `*cmds arr(...), arr(...)`
    allows a sequence of commands to happen. For the object, if the args
    contains `*KEY*`, then that gets replaced by the key under consideration. 

## for in 

This does a forEach for the object. 

The function takes in a function to act in the first argument, a pass-in
object or value as second argument,  and has an optional sort object (key or
value will sort by default order by keys or values, respectively, nothing
means whatever ordering it happens to be in) for the third argument. 

This can function as a foreach, a map, or a reduce. The return value will be
passed along. If it is undefined, it gets converted to null. 

If, at the end, the return value of f is null, then the object is passed
along as is. 


    Folder.sync("forin", _":fun");

[fun]()

    function (input, args) {
        _"| globals doc, typeit"

        var ret, keys; 

        var fun = args[0];
        var initval = args[1];
        var protosort = args[2];
        var sort;
        _":check fun"
        _":setup sort"
        _":initval"

        var t = typeit(input);

        if ( t === 'object' ) {
            _":object iterate"
        } else if ( t === 'array' ) {
            _":array iterate"
        } else {
            ret = fun(input, '', initval, input);
        }
        if ( typeit(ret) !== "null") {
            return ret;
        } else {
            return input;
        }
    }



        
[iterate]()

We have set it up so that the array and object iterations are nearly
identical. We just need to change it to start. 

    if (sort) {
        sort(keys);
    }
    ret = initval;
    keys.forEach(function (key) {
        ret = fun( input[key], key, ret, input);
        if (typeit(ret, 'undefined')) {
            ret = null;
        }
    });


[object iterate]()

We use the keys and then we sort them.

        keys =  Object.keys(input);
        _":iterate"
       

[array iterate]()

We create the indices as keys to allow for sorting and for fitting in with the
object iteration. 

    keys = input.map(function (el, ind) {return ind;});
    _":iterate"


[check fun]()

We need the first argument to be a function. 

    if (typeit(fun) !== 'function') {
        doc.warn("cmd:forin", 
            "first argument needs to be function; doing nothing", 
            typeit(fun), input, args
        );
        return input;
    }


[setup sort]()

If there is a sort argument (true means default, function, use that), we need
to set up a sort function that will do the work. The sort function is assumed
to have the signature (key a, key b, val a, val b, input). We wrap that in a
more standard function sort function that passes all of that. 

    if (protosort === 'key') {
        sort = function (a, b) {
            _":compare"
        };
    } else if (protosort === 'value') {
        sort = function (key1, key2) {
            var a = input[key1];
            var b = input[key2];
            _":compare"
        };
    } else if (typeit(protosort, 'function') ) {
        sort = function (a,b) {
            return protosort(a, b, input[a], input[b], input);
        };
    } else {
        sort = false;
    }


[compare]()

    if ( a < b) {
        return -1; 
    } else if ( a > b) {
        return 1;
    } else {
        return 0; 
    }
   

[initval]()

The initial value is what it is, unless it is undefined. Then we convert that
to null. 

    if (typeit(initval, 'undefined') ) {
        initval = null;
    }


##### cdoc

    * **forin** The args are 
      `function f (val, key, ret, input), initial value, sort order`.
      This iterates over the input object. 
      
      If the input is not an array or object, then `f` is called on the input
      itself as `val` with a `key` of an empty string, and the `ret` is just
      the initial value. 

      The return value of `f` is used in the third plave of the next loop. If
      it is undefined, `null` is passed in. 
      
       All functions should be synchronous. All values will be visited; there
       is no way to break out of the loop though one could have the function
       do nothing if the ret value was a particular kind (say, looking for
       false values, it starts true and if it becomes false, then it just
       returns that for all later ones). This is not designed for large number
       of keys. 

      The sort should be a comparison function that expects the following
      arguments: `key1, key2, value1, value2, input`.  Alternatively, it can
      send in the strings `key` or `value` to sort the order by intrinsic key or
      value meaning. Note that value needs to be natively comparable in some
      meaningful sense if `value` is sent in. 


## pget pset pstore

This gets and sets properties on the incoming input. The args are the property
descenders, e.g., `abe[2][th]` is `abe ...  | pget 2, th` For pset, the first
argument is what to set it to and the rest is the selector. 

    Folder.sync("pget", _":pget");
    Folder.sync("pset", _":pset");
    Folder.sync("pstore", _":pstore");

[pget]() 

We use some so that if cur becomes undefined, we stop the iteration and return
undefined. 

    function (input, args) {
        var doc = this;
        var typeit = doc.Folder.requires.typeit;
        var cur = input;
        args.some(function (el)  {
            cur = cur[el];
            return typeit(cur, "undefined");
        });
        return cur;
    }

[pset]()


The first of args is the value. We want to call up the object up to that
point. The last of the args is where to point so we exclude that from args.
Then we iterate, adding in objects or arrays as needed. 

    function (input, args) {
        var doc = this;
        var typeit = doc.Folder.requires.typeit;
        var val = args.pop();
        var last = args.pop();

        if ( typeit(input, "undefined") || typeit(input, "null") ) {
            if (typeit(args[0], "number") ) {
                input = [];
            } else {
                input = {};
            }
        }
        var prev, prevkey, cur;
        cur = prev = input; 

        args.forEach(function (elm) {
            _":cur undefined"
            prev = cur;
            cur = cur[elm];
            prevkey = elm;
        });

        _":cur undefined | sub elm, last"

        cur[last] = val;

        return input;
    }

[cur undefined]()
Prev is the last known object to be well-defined. Cur points to prev[prevkey].
If undefined, we define it. Then we assign cur[el]. 

    if (typeit(cur, 'undefined') ) {
        if ( typeit(elm, 'number' )  ) {
            cur = prev[prevkey] = [];
        } else {
            cur = prev[prevkey] = {};
        }
    }


[pstore]() 

We need to switch the input and the value in terms of incoming and outgoing. 

    _":pset | sub return input, return val 
        | sub var val = args.pop();,  var val = input; input = args.shift();
     "



##### cdoc

    * **pget** Gets the property named by the arguments.
    * **pset** Sets the property named by the arguments with the last
      argument being the value. May create objects and arrays as
      needed. 
    * **pstore** This stores the input into the first argument (should be
      object or array) using the rest of the arguments to define. This returns
      the value.

## JSON

This is a trivial JSON conversion layer. 

    Folder.sync('toJSON', _":to");
    Folder.sync('fromJSON', _":from");

[to]()

    function (input, args) {
        _"|globals doc"
        try {
            return JSON.stringify(input, args[0], args[1]); 
        } catch (e) {
            doc.warn("cmd:toJSON", "Failed to stringify", 
               e.message, input, args);
            return '';
        }
    }

[from]()

    function (input, args) {
        _"|globals doc"
        try {
           return JSON.parse(input, args[0]);
        } catch (e) {
            doc.warn("cmd:fromJSON", "Failed to parse", 
               e.message, input, args);
            return {};
        }   
    }


##### cdoc

    * **toJSON** Returns a JSON representation of input. Uses JSON.stringify
      and passes in the first two args (whitelist, spaces) to allow full features. 
    * **fromJSON** Returns an object from a JSON representation. Uses
      JSON.parse and passes in first argument (reviver function) if present. 

## anonymous commands

anon and anonasync generate syncronous and asynchronous, respectively,
anonymous commands. The first argument should be the command function.

    Folder.commands.anon = _":anon";
    Folder.commands.anonasync = _":anon-async";


[common]()

    function (input, args, name) {
        _"|globals doc, gcd, typeit"
        
        var f = args.shift();

        if (typeit(f, "string") ) {
            _":make fun from string"
        } else if  (!(typeit(f, "function") ) ) {
            doc.error("cmd: anon", "unrecognized function", input, args, name);
            return '';
        }

        READY


    }


[make fun from string]()

The string could be of the form `(...) => ...` or `function (..) ...` or just
a set of lines which suggests to enclose that in a function for a command. 

    f.trim();
    if ( ( f[0] === '\u0028')  || (f.slice(0,8) === "function") ) {
        eval('f=' + f); 
    } else {
        eval('f= function (input, args) {' + f + '}');
    }

[anon]() 

    _":common | sub READY, _':emit'  "

[emit]()
    
    var ret =  f.call(doc, input, args, name);
    gcd.scope(name, null);
    gcd.emit("text ready:" + name, ret);

[anon-async]()

    _":common | sub READY, _":cb" "

[cb]() 

    var callback = function (err, data) {
        if (err) {
            doc.error("cmd: anon-async", "error in callback", err, input,
                args, name);
        } else {
            gcd.scope(name, null);
            gcd.emit("text ready:" + name, data);
        }
    };
    f.call(doc, input, args, callback, name);

##### cdoc

    * **anon** The first argument should be a function or string that can be
      converted into a function of command form, namely the arguments are
      `input, arguments` and the `this` is `doc` though that is also in a
      closure if it is a string evaluated. The function should be synchronous
      and return the value to send on. 
   * **anon-async** Just like `anon` but the first function should expect
     `input, args, callback` as the signature and call the callback when done,
     passing along `err, data` into it. 


## minors

This takes in an array as input and associates an object whose keys are the
arguments with values in the array as ordered. Generally good for splitting
some template into an object with appropriate keys for templating. 

    Folder.sync("minors", _":fun"); 

[fun]()

    function (input, args) {
        _"| globals doc, typeit"
        var ret = {};
        _":check for array"

        input.forEach(function (el) {
            var key;
            if ( typeit(el, 'array') && (el.length === 2) ) {
                key = el[0].trim();
                ret[key] = el[1];
            } else {
                key = args.shift();
                if (typeit(key, 'string') ) {
                    key = key.trim();
                    if (typeit(el, '!array') ) {
                        ret[key] = el;
                    } else {
                        ret[key] = el[0];
                    }
                } else {
                    doc.warn("cmd:minors",
                        "not enough keys for unnamed entry",
                        input, args);
                }
            }
        });
        //empty bits for rest
        args.forEach(function (el) {
            if (! ret.hasOwnProperty(el) ) {
                ret[el] = '';
            }
        });
        return ret;
    }

[check for array]()

    var t = typeit(input);
    if (t !== 'array') {
        ret[ args[0] | ''] = input;
        return ret;
    }

##### cdoc 

    * **minors** This converts the input from an array into an object, using
      the arguments as the keys. If there is a mismatch in length, than the
      shorter is used and the rest is discarded. If the input is not an array,
      then it becomes the sole value in the object returned with key as first
      argument or empty string. 


## templating

This deals with templating by having an incoming object whose keys will be the
minors of the block name that is in arg1. We run through it, storing them,
then compiling, then clearing, using a tracker to ensure no conflicts. We use
the same name as there may be other related blocks that are needed that are
not custom. 

    Folder.commands.templating = _":fun";

[fun]()

    function (input, args, name) {
        _"|globals doc, gcd, colon"
        _":check inputs"


        var store = name + colon + "template store";
        var clear = name + colon + "template clear";
        var minorblockname = name + ":*KEY*";

        gcd.flatWhen( "text ready:" + store, 
            "template ready:" + name);

The first data entry is the template and we use the compile command. The name
is the name we have stored the object keys under. 

        gcd.once("template ready:" + name, function () { 
            gcd.once("text ready:" + name, function () {
                doc.cmdworker("mapc", input, ['clear', minorblockname], clear);
            });
            doc.cmdworker("compile", args[0], [name], name);
        });
        
Evoke the store command, storing the keys with the prefix of name. 

        doc.cmdworker("mapc", input, ['store', minorblockname], store ); 
    }



[check inputs]()

The first argument should be a string naming a block. The input should be an
object whose keys will become minors in the blocks names. 


    if (typeit(input) !== 'object') {
        doc.warn("cmd:templating",
            "input needs to be an object", 
            input, args);
        return input;
    }
    if ( typeit(args[0], '!string') ) {
        doc.warn("cmd:templating",
            "first argument needs to be a string to be compiled",
            input, args);
        return '';
    }

    
##### cdoc

    * **templating** This expects an object as an input. Its keys will be
      minor block names when compiling the template given by the first
      argument. It will send along the compiled text.


## clone merge

Just thin wrapper from requires. Could use some inspection.

    Folder.sync("merge", function (input, args) {
        args.unshift(input);
        return merge.apply(args);
    });
    Folder.sync("clone", function (input) {
        return clone(input);
    });

    
##### cdoc

    * **merge** Merges arrays or objects. 
    * **clone** Clones an array or object. 

## apply

The first argument is the key. The second is the command (if string) or
function. The rest are arguments to plug into 
   
    Folder.commands.apply = _":fun"; 

[fun]()

    function (input, args, name) {
        _"|globals doc, gcd, colon"
        
        var key = args[0];
        var cmd = args[1];
        args = args.slice(2);
        var data;
        if (typeit(cmd, 'string') ) {
            var ename = name + colon + "apply" + colon + key + colon + cmd; 
            gcd.once("text ready:" + ename, function (data) {
                _":return"
            });
            doc.cmdworker(cmd, input[key], args, ename); 
        } else if (typeit(cmd, 'function') ) {
            args.unshift(input);
            data = cmd.apply(null, args);
            _":return"
        }

    }

[return]()

    input[key] = data;
    gcd.emit("text ready:" + name, input);


##### cdoc

    * **apply** This applies a function or command to a property of an object
      and replaces it. Clone first if you do not want to replace, but have a
      new. The first arguments is the key, the second is the commnd string or
      function, and the rest are the args to pass in. It returns the object
      with the modified property. 

    
## Command worker

This deals with invoking a command in something like .apply or .mapc. 

    function (cmd, input, args, ename) {
        _"|globals doc, gcd, leaders, typeit"
        
        var lead;

        if ( (leaders.indexOf(cmd[0]) !== -1) && (cmd.length > 1) )  {
            lead = cmd[0];
            cmd = cmd.slice(1);
            args.unshift(cmd);
            doc.commands[lead].call(doc, input, args, ename, ".");
        } else if ( typeit(doc.commands[cmd], 'function') ) {
            doc.commands[cmd].call(doc, input, args, ename, cmd );
        } else {
            gcd.once("command defined:" + cmd, function () {
                doc.commands[cmd].call(doc, input, args, ename, cmd );
            });
        }
    }

## subcommands

This is the object that holds subcommands. Commands with unique requirements
can use this as a prototype.  

    (function () {
        var ret = {};
        
        ret.echo = ret.ec = _"echo";
       
        ret.join = _"join";
        
        ret.array = ret.arr = _"array";

        ret.object = ret.obj =  _"object";

        ret.merge = _"merge";

        ret["key-value"] = ret.kv = _"key value";

        ret.act = _"act";

        ret.property = ret.prop = _"property";

        ret.json = _"json";

        ret.set = _"set";

        ret.gset = _"gSet";

        ret.get = _"get";

        ret.gget = _"gGet";

        ret.arguments = ret.args = _"arguments";

        ret.number = ret.num = _"number";

        ret.date = _"date";

        ret.function = ret.fun = _"function";

        ret.eval = ret.ev =  _"eval";

        ret.log = _"log";

        ret.dash = ret["-"] = _"dash";
        ret.dot = ret["."] = _"dot";
        ret.bool = ret["?"] = _"boolean";

        ret.true  = function () {return true;}; 
        ret.false = function () {return false;}; 
        ret.null = function () {return null;}; 
        ret.doc =  function () {return this;}; 
        ret.skip = function () {return ;}; 
        ret.type = function (obj) {
            _"|globals typeit"
            return typeit(obj);
        };
        ret.reg = ret.regexp = function (text, flags) {
            _"|globals doc"
            _"commands::regify:core | sub cmd:regify, subcmd:reg"
        };

        return ret;
    })()

## Attach Subcommands

This attaches subcommands to plugins and folders. Note that this will attach
to the appropriate object based on the `this` whether it be Folder, folder, or
doc. 

    function (sub, f, cmd) {
        var subs, cmdplug,  cmdsub;

        if (cmd) {
            cmdplug = this.plugins[cmd];
            if (!cmdplug) {
                cmdplug = this.plugins[cmd] = {};
            } 
            cmdsub = cmdplug.subCommands;
            if (!cmdsub) {
                cmdsub = cmdplug.subCommands = {};
            }
            cmdsub[sub] = f;
        } else {
            subs = this.subCommands;
            subs[sub] = f; 
        }
    }




### Echo

This simply returns the input, but if it is surrounded by quotes, we remove
them. 

    function () {
        var arr = Array.prototype.slice.call(arguments);
        
        var ret = arr.map(function (str) { 
            if (("\"'`".indexOf(str[0]) !== -1) && 
                (str[0] === str[str.length-1]) ) {
                
                return str.slice(1, -1);
            } else {
                return str;
            }
        });

        ret.args = true;

        return ret;
    }

### Join


The first entry is the joiner separator and it joins the rest
  of the arguments. For arrays, they are flattened with the separator as well
  (just one level -- then it gets messy and wrong, probably).

    function (sep) {
        var args = Array.prototype.slice.call(arguments, 1);
        var ret = [];
        
        args.forEach( function (el) {
            if ( Array.isArray(el)) {
                ret.push(el.join(sep));
            } else {
                ret.push(el);
            }
        });

        return ret.join(sep);

    }

### Array 

This creates an array of the arguments.

    function () {
        return Array.prototype.slice.call(arguments, 0);
    }


### Object

This presumes that a JSON stringed object is ready
  to be made into an object.

    function (str) {
        var ret, doc = this;
        try {
            ret = JSON.parse(str);
            if (Array.isArray(ret) ) {
                return ["val", ret];
            } else {
                return ret;
            }
        } catch (e) {
            doc.gcd.emit("error:arg prepping:bad json parse:" + this.cmdname, 
                [e, e.stack, str]);
            return ["error", e];
        }
    }


### Merge

Merge arrays or objects, depending on what is there.

To merge the arrays, we use concat with the first argument as this and the
rest as arguments from slicing the arguments. 

For objects, we use the first object, iterate over the keys, adding. The later
objects will overwrite the earlier ones. 

    function (a) {
        var ret, args; 
        if (Array.isArray(a) ) {
            args = Array.prototype.slice.call(arguments, 1);
            return Array.prototype.concat.apply(a, args);
        } else {
            args = Array.prototype.slice.call(arguments, 1);
            ret = a;
            args.forEach( function (el) {
                var key;
                for (key in el) {
                    ret[key] = el[key];
                }
            });
            return ret; 
        }
    }

### Key Value

This produces an object based on the assumption that a
  `key, value` pairing are the arguments. The key should be text. 

    function () {
        var ret = {};
        var i, n = arguments.length;
        for (i = 0; i < n; i += 2) {
            ret[arguments[i]] = arguments[i+1];
        }

        return ret;
    }

### Property

This takes in an object and a list of keys to access something along the
property chain. 

    function () {
        var props = Array.prototype.slice.call(arguments, 0);
        var obj;
        try {
            obj = props.reduce(function (prev, cur) {
                return prev[cur];
            });
            return obj;
        } catch (e) {
            this.gcd.emit("error:bad property access:" +
                this.cmdname, [e, e.stack, props]);
            return;
        }
    }

### Act

This allows one to do `obj, method, args` to apply a method to an
  object with the slot 2 and above being arguments. For example, one could do
  `act( arr(3, 4, 5), slice, 2, 5)` to slice the array.

    function (obj, method) {
        try {
            return  obj[method].apply(obj, 
                Array.prototype.slice.call(arguments, 2)) ;
        } catch (e) {
            this.gcd.emit("error:arg prepping:bad method:" + this.cmdname, 
                [e, e.stack, obj, method,
                Array.prototype.slice.call(arguments)]);
            return ;
        }
    }

### JSON

This will convert an object to to JSON representation. If it fails (cyclical
structures for example), then it emits an error.

    function (obj) {
        try {
            return JSON.stringify(obj);
        } catch (e) {
            this.gcd.emit("error:arg prepping:bad json:" + this.cmdname, 
                [e, e.stack, obj]);
            return ;
        }
    }

### Set

The presumption is that this is an object passed in whose scope is to be used.
If one wants to bubble the argument up, one can use `pass` in third
argument.

    function (obj, retType) {
        var doc = this;
        var gcd = doc.gcd;
        var name = doc.cmdName;
        var scope, key; 
        
        scope = gcd.scope(name);
        if (!scope) {
            scope = {};
            gcd.scope(name, scope);
        }
        for (key in obj) {
            scope[key] = obj[key];
        }
        if (retType === "pass" ) {
            return obj;
        } else {
            return ;
        }
    }

### gSet
  
This does this in a way that other commands in the pipe chain can
  see it.

    _"set | sub  doc.cmdName , _":sub line" " 

[sub line]()

    doc.cmdName.slice(0, doc.cmdName.lastIndexOf(doc.colon.v)) 
    

### Get

This retrieves the value for the given key argument(s).

    function () {
        var doc = this;
        var gcd = doc.gcd;
        var name = doc.cmdName;
        var scope; 
        
        scope = gcd.scope(name);
        if (!scope) {
            gcd.emit("error:arg prepping:no scope:" + name);
            return ;
        }

        var i, n = arguments.length;
        var ret = [];
        for (i = 0; i < n; i +=1 ) {
            ret.push(scope[arguments[i]]);
        }
        ret.args = true; // each is separate 
        return ret;
    }

### gGet

This retrieves the value for the given key argument from the pipe chain.

    _"get | sub  doc.cmdName , _":sub line" " 

[sub line]()

    doc.cmdName.slice(0, doc.cmdName.lastIndexOf(doc.colon.v)) 
    

### Arguments

This expects an array and each element becomes a separate
  argument that the command will see. E.g., `cmd arguments(arr(3, 4))` is
  equivalent to `cmd 3, 4`. This is useful for constructing the args
  elsewhere. In particular, `args(obj(_"returns json of an array"))` will
  result in the array from the subsitution becoming the arguments to pass in.  

    function (arr) {
        var ret =  arr.slice(0); //make a shallow copy
        ret.args = true;
        return ret;
    }


### Number

This converts the argument(s) to numbers, using js Number function. Each
number becomes a separate argument. If there is no argument, then it returns
0. 

    function () {
        var ret = [], i, n = arguments.length;
        if ( n === 0 ) {
            return 0;
        }
        for (i = 0; i < n; i += 1) {
            ret.push(Number(arguments[i]));
        }
        ret.args = true;
        return ret;
    }

### Date

This converts the argument(s) to dates, using the date constructor.
Each date becomes a separate argument. If no argument, it returns the object
of now. 

    function () {
        var ret = [], i, n = arguments.length;
        if (n === 0) {
            return new Date();
        }
        for (i = 0; i < n; i += 1) {
            ret.push(new Date(arguments[i]));
        }
        ret.args = true;
        return ret;
    }

### Function 

This returns a function. Similar to eval, this will check for backticks as a
quote character. The function text should be what is in the first argument. 


    function (code) {
        var f, doc = this;
        var args = Array.prototype.slice.call(arguments, 1);

        if ( (code[0] === "`" ) && (code[code.length-1] === code[0]) ) {
            code = code.slice(1, code.length-1);
        }
       
        try {
            eval("f=" + code);
            return f;
        } catch (e) {
            doc.gcd.emit("error:arg prepping:bad function:" + doc.cmdname, 
                [e, e.stack, code, args]);
            return;
        }

    }


### Eval

Will evaluate the argument and use the magic `ret` variable as the value to
  return. This can also see doc and args has the arguments post code.
  Recommend using backticks for quoting the eval; it will check for
  that automatically (just backticks, can do echo for the others if needed).

    function (code) {
        var ret, doc = this;
        var args = Array.prototype.slice.call(arguments, 1);

        if ( (code[0] === "`" ) && (code[code.length-1] === code[0]) ) {
            code = code.slice(1, code.length-1);
        }
       
        try {
            eval(code);
            return ret;
        } catch (e) {
            doc.gcd.emit("error:arg prepping:bad eval:" + doc.cmdname, 
                [e, e.stack, code, args]);
            return;
        }
    }

### Log

This logs the argument and passes them along as arguments.

    function () {
        var doc = this, name = doc.cmdName;
        var args = Array.prototype.slice.call(arguments);
        doc.log("arguments in " + name + ":\n---\n" + 
            args.join("\n~~~\n") + "\n---\n");
        return args;  
    }

### Dash

This is a utility function and uses the same utility functions as the main
dash command. But here, the arguments are just the arguments; no incoming
input. 

    function (propname) {
        var doc = this;
        var dash = doc.dash;
        var cmd;

        var args = Array.prototype.slice.call(arguments, 1);

        _"commands::dash:found"

        if (!found) {
            doc.log("Subcommand dash: no such property: " +  propname +
                " with args: " + args.join("\, ") );
            doc.log("no such property on dash: ", propname);
            return '';
        } else {
            return dash[cmd][0][propname].apply(dash[cmd][0], args);
        }
    }

### Dot

This assumes that the first argument is a method of the second argument. It
then calls it all as such. No async stuff here, please. This also assumes that
the second argument is an object with property access. If there are not at
least two arguments, an empty string is returned. 

    function (method, obj) {
        var doc = this;
        var fun;

        if (arguments.length < 2) {
            doc.log("insufficient number of arguments for dot command:" +
                arguments.join(", "));
            return '';
        }

        var args = Array.prototype.slice.call(arguments, 2);
    
        fun = obj[method];
        if ( typeit(fun) === "function") {
            return fun.apply(obj, args);
        } else {
            return fun; //ex: .length(arr(1, 5) )
        }
    }

### Boolean

This is another leader kind of subcommand with the properties being functions
that return booleans. 

    function (propname) {
        var doc = this;
        var bool = doc.booleans;

        var args = Array.prototype.slice.call(arguments, 1);

        if ( bool[propname] ) {
            var ret = bool[propname].call(doc, args);
            return ret;
        } else {
            doc.log("no such boolean tester: ", propname);
            return false;
        }
    }

#### Booleans

These are the default boolean functions.

    { 
        "and" : function (args) {
            return args.every(function (el) {
                return !!el;
            });
        },
        "or" : function (args) {
            return args.some(function(el) {
                return !!el;
            });
        },
        "not" : function (args) {
            return !args[0];
        },
        "===" :  _":comparator | sub OP, ===",   
        "==" :  _":comparator | sub  OP, ==",   
        ">=" :  _":comparator | sub OP, >=",   
        ">" :  _":comparator | sub OP, >",   
        "<=" :  _":comparator | sub OP, <=",   
        "<" :  _":comparator | sub OP, <",   
        "!=" : _":compare all | sub OP, ==",   
        "!==" :  _":compare all | sub  OP, ===",
        "flag" : function (flag) {
            return this.parent.flags.hasOwnProperty(flag);
        },
        "match" : _":match",
        "type" : _":type"
    }
   
 [comparator]()

     function (args) {
            var prev = args.shift();
            var ret = args.every(function (el) {
                var one = prev;
                prev = el;
                return (one OP el);
            });
            return ret;
        }
[compare all]()

For something like not equals, we need to compare all the pairs. 

    function (args) {
        var i, j, n = args.length, cur;
        for (i = 0; i < n; i += 1) {
            cur = args[i];
            for (j = i + 1; j < n; j += 1) {
               if ( (cur OP args[j] ) ) {
                    return false;
               }
            }
        }
        return true;
    }

[match]()

This checks if the first argument has or matches the string/reg that followes
it. 

    function (args) {
        _"|globals doc, typeit"

        var str = args[0];
        var condition = args[1];

        if (typeit(str) !== 'string') {
            _":match-warn | sub DESC, 
                first argument needs to be a string"
        }

        var typ = typeit(condition);
        
        if (typ === 'string') {
            return (str.indexOf(condition) !== -1);
        } else if (typ === 'regexp') {
            return (condition.test(str)); 
        } else {
            _":match-warn | sub DESC,
                second argument needs to be string or regex"
        }

    }

[match-warn]()

    doc.warn("subcmd:boolean match",
        "DESC",
        "inputs: ", str, condition);
    return false;



[type]()

This uses typeit to check the type of the object and checks to see if it
matches any of the types. If the second argument is an exclamation point, it
checks to see if it is not any of the types that follow. 

    function (obj) {
        _"|globals typeit"

        var args = Array.prototype.slice.call(arguments, 1);

        var t = typeit(obj);

        if (args.length === 1) {
            return t === args[0];
        } else if (args[0] === '!') {
            args.shift();
            return args.every(function (el) {
                return t !== el;
            });
        } else {
            return args.some(function (el) {
                return t === el;
            });
        }

    }


