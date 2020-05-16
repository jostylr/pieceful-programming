This is a collection of utility functions and some immediate parsing
functions. Not sure that these should be in their own module or anything, but
we do create one for testing purposes. 

    const has = _"has";
    const last = (arr => arr[arr.length-1] );
    const convertToMap = _"convert to map";
    
    const makeScanners = _"scanning";

    const immediates = _"immediates";

    module.exports = {has, last, convertToMap, makeScanners, immediates};

[utilities/index.js](# "save:")

## Has

A simple function that shortens the checking of a key. It also returns false
if it is not an object. 

    function has (obj, key) {
        return (typeof obj === 'object') && 
            Object.prototype.hasOwnProperty.call(obj, key);
    }


## Scanning

These functions all are replicating the string functions but with the idea of
skipping over enclosed content, unless those are escaped. 

This generates these functions. Some rely on others. 

    function (moreDelimiters ={}) {

        const conreg = (/a/).constructor; //for detecting regex.
    

        let delimiterCatalog;
        _"delimiters"

        const descend = _"descend";
        const indexOf = _"index of";
        const lastIndexOf = _"last index of";
        const match = _"match";
        const replace = _"replace";
        const allIndexOf = _"all indexes";
        const matchAll = _"match All";
        const replaceAll = _"replace All";
        const split = _"split";
        const chunk = _"chunk";
        const chunkAll = _"chunk all";
        const walker = _"walker";
    

        return {indexOf, lastIndexOf, match, replace, descend, 
            allIndexOf, matchAll, replaceAll,
            split, chunk, chunkAll, walker, delimiterCatalog};
    }

### Descend

This walks the string looking for delimiters. It has no intrinsic behavior;
these get passed in as an argument. Other functions should call this, having
prepped everything they compare about. Will assume types are fine other than
having default functions. 

Function top decides on behavior at the top level. The inner function
determines behavior within the descent into delimiters (say wanting to match
inside of it). Both have the
convention that a null return value means to continue through the processing
of looking for delimiters. If it returns something less than 1, then we return
from the function (termination of the whole process). Otherwise, it should
return a positive integer that gets added to i and we continue the loop. There
is also the pop function which is behavior for dealing with the ending of a
delimiter, say for chunking up the delimited expressions. 

Any data that is being created should be done within the functions as closures
to the calling functions. 


    function descend ({ 
        str = '', 
        start = 0, 
        delimiters = 'common', 
        terminator = () => null,
        top = () => null, 
        inner = () => null,
        push = () => null, 
        pop = () => null, 
        end = () => null
    } = {}) {

        if (typeof delimiters === 'string') {
            delimiters = delimiterCatalog[delimiters];
        }

        _":prep terminator" 

        if (!Array.isArray(delimiters) ) {
            throw "delimiters should be presented in the form `[key, obj]`";
        }

Now we proceed to do the processing. 

        const n = str.length;
        let insides = []; // pop/push of delimiters
        const originalDelimiters = delimiters;

        for (let i = start; i < n; i += 1) {
            let substr = str.slice(i);
            
            _":check for terminator"
            _":check for delimiter | sub //TOP, _':top flow' "

            let lead = delim[1].lead;
            _":check for escaping"
            
            { //delimiter has been found, not escape
            
                _":descend into delimiters"
                

It is possible that we did not empty out the delimiters. So we have problems
and this is an attempt to report it. Insides first element is the starting
delimiter and the second entry is the i that started it. 

                if ( insides.length ) {
                    throw `ending delimiters not found:  [${insides.join(',')}] not found in:\n  ${str.slice(insides[0][2])}`;
                }

            }

        }
        end(); 
        return -1; //not found 
    }

[top flow]() 

This is after delimiter checking so that we know that it is not a delimiter

    let control = top(substr);
    _":flow"


[flow]()

This has the basic result of the functions being able to advance the loop
(return a number greater than 1), return out of the function (return a number
less than 1), or continue with the loop (non-number return, generally null). 

    if (typeof control === 'number') {
        if (control < 1) {
            return;
        } else {
            i += control-1; // the loop is going to add 1
            continue;
        }
    }



[check for delimiter]()

delimiters is an array of `[leftdelim, object details]`

    let delim = delimiters.find( arr => {
        const left = arr[0];
        return ( left === substr.slice(0, left.length) );
    });
    if (!delim) {
        //TOP
        continue;
    }

[check for escaping]()

There is a leftDelim. Now we check for escaping. The escape could be an empty
string, meaning there is no escaping.  

    if (lead) {
        if (str[i-1] === lead) {
            let esci = 1;
            while (str[i - esci - 1] === lead) {
                esci += 1;
            }
            if (esci % 2 === 1) {
                continue; //odd number of escapes leave an escape so no delim
            }
        }
    }

[descend into delimiters]()

This is where the interesting stuff is. We have a left delimiter which tells
us to look for the right delimiter. We may have different behavior in descent
land so we use the function inner for that behavior. We then have a function
for popping out of the delimiter (for chunking). 

    let [left, right] = delim;
    insides.push([left, right, i]);
    push(str, i, left, right);  // no effect on anything
    i += left.length;
    let current = insides[0];
    let cdl = right.end.length;
    _":update delimiters"
    while (insides.length && (i < n) ) {
        let substr = str.slice(i);
        
        let control = inner(substr, current, insides, i); 
        _":flow"

        if (str.slice(i, i+cdl) === right.end) { //end delimiter found
            let escape = right.escape;
            _":check for escaping | sub lead, escape, continue, i+=1; continue"
 
            insides.pop();
            let leftPos = current[2];
            let positions = [leftPos, leftPos+left.length, i, i +cdl]

            let control = pop(str, positions, current, insides);
            
We run control with the current insides; it could do weird stuff. Probably bad
idea. Afterwards, we prep the insides for more rounds. We still invoke flow
in case control wants to do increment differently or return, but we want to
prepare the insides first. 

            if (insides.length !== 0) {
                current = last(insides);
                [left, right] = current; 
                _":update delimiters"
            } else {
                delimiters = originalDelimiters;  
            }

            _":flow"

            i += cdl;
            if (insides.length === 0) { i -= 1;} // for loop increments
            continue;
        }
        
        _":check for delimiter | sub continue, i+=1; continue"
        _":check for escaping | sub continue, i+=1; continue"

Next delimiter has been found. We need to update current, left, right, and
push it on to the insides. We also need to modify the delimiters being looked
at. 

        [left, right] = delim;
        current = [left, right, i]; 
        insides.push(current);
        push(str, i, left, right);
        i += left.length;
        cdl = right.end.length;

    }
    
[update delimiters]()

    if (right.delimiters) {
        delimiters = delimiterCatalog[right.delimiters];
    }

[prep terminator]()

This 

    {
        const ttype = typeof terminator;
        if (ttype !== 'function') {
            const origTerminator = terminator;
            if (ttype === 'string') {
                const tlength = origTerminator.length;
                terminator = (substr) => {
                    return substr.slice(0,tlength) === origTerminator;
                };
            } else if (
                (ttype === 'object') && 
                (origTerminator.constructor === conreg) 
            ) { 
                origTerminator = (substr) => {
                    return terminator.test(substr);
                };
            } else {
                throw `Unknown terminator value: should be string, function, regex: ${ttype}`;
            }
        }
    }

[check for terminator]()

This is just like the match length; just different names and break condition.
Terminators are looked for only on the top level. 

    {
        const t = terminator(substr);
        if (t) {
            return [i, t];
        }
    }

### Common

This is the basic function that the others use. It is like the standard index
of, except it skips over delimited stuff. To do so, one has to worry about
nested stuff so it recurses. 

It can be passed in a regular expression. The regex should start searches at the beginning of the regex. Delimiters can be multi-character strings. 


    function (str, ARGS { start = 0, delimiters = null, terminator = null } ) {

        console.log('hi');

        PREP

        let ttype, tlength;
        if (terminator) {
            ttype = typeof terminator;
            tlength = (ttype === 'string') ? terminator.length : 0;
        }

        delimiters = delimiters || delimiterCatalog.common; 

We create an array to go through and check for delimiters. We filter out any
keys that have false (we want to keep them in delimiters to pass them in
recursing) and we sort by length of the key so that longer ones get seen
first. 

        let delArr = Object.keys(delimiters).
            sort ( (a,b) => b.length - a.length );

         
Now we do the searching. This code is shared with chunk, but they have
different purposes. For chunk, search is not present at the top level. Here it
is to see if the search matches 

        const n = str.length;
        
        console.log('made it here', n, str, searchValue);

        let descent = []; // pop/push of ending delimiters
        for (let i = start; i < n; i += 1) {
            let end, delimited;
            
            MATCH

            _":check for terminator"

            _":check for delimiter"

            let delimObj = delimiters[leftDelim];
            
            _":check for escaping"
            
            { //delimiter has been found, not escape
            
                _":descend into delimiters"
                
                if ( descent.length ) {
                    throw `ending delimiters [${descent.join(',')}] not found in:\n  ${str.slice(i)}`;
                } else {
                    i = end;
                }
            }

        }

        return -1; //not found 
    }

  

[check for delimiter]()

The keys are in delArr. Just check if any of them match. 

    let leftDelim = delArr.find( left => left === str.slice(i, left) );
    if (!leftDelim) {
        continue;
    }

[check for escaping]()

There is a leftDelim. Now we check for escaping. The escape could be an empty
string, meaning there is no escaping.  

    let lead = delimObj.lead;
    if (lead) {
        if (str[i-1] === lead) {
            let esci = 1;
            while (str[i - esci - 1] === lead) {
                esci += 1;
            }
            if (esci % 2 === 1) {
                continue; //odd number of escapes leave an escape so no delim
            }
        }
    }

[descend into delimiters]()

This is where the interesting stuff is. We have a left delimiter which tells
us to look for the right delimiter. We are no longer caring about matching the
search value (that's the point of this custom index of). So we just go through
matching delimiters. 

    descent.push(leftDelim);
    let end = i+1; 
    let curDel = leftDelim;
    let cdl = curDel.length;
    while (descent.length && (end < n) ) {
        if (str.slice(end, end+cdl) === curDel) { //end delimiter found
            end = end + cdl;
            let finishedDelim = descent.pop();
            CHUNK
            continue;
        }
        let i = end;
        end += 1;
        _":check for delimiter"
        _":check for escaping"
        curDel = leftDelim;
        cdl = curDel.length;
        descent.push(curDel);
        end = i + cdl;
    }
    
[check for terminator]()

This is just like the match length; just different names and break condition.
Terminators are looked for only on the top level. 

    if (ttype === 'string') {
        if (str.slice(i, tlength) === terminator ) {
            break;
        }
    } else {
        let substr = slice(i); 
        if (ttype === 'function') {
            if (terminator(substr)) {
                break;
            }
        } else { //should be a regex
            if (terminator.test(substr)) {
                break;
            }
        }
    }


### Index Of

This uses the common part; see that which was written from the perspective of
indexOf but is also used by match. 

    _"common | sub
        ARGS, echo('searchValue,'),
        PREP, _':searchValue setup', 
        MATCH, _':check for match', 
        CHUNK, echo(' ') "
        

[check for match]()

This checks the string for a match. The search value could be a string, regex,
or function. If it is a regex, it should be a global regex that starts at the
beginning. The function should determine the match based on the beginning of
the string and return null if not found (allows same function for match if
desired). 

    
    if (t === 'string') {
        if (str.slice(i, svlength) === searchValue ) {
            return i;
        }
    } else {
        let substr = slice(i); 
        if (t === 'function') {
            svlength = searchValue(substr);
            if (svlength !== null) {
                return i;
            }
        } else { //definitely a regex
            let regmatch = searchValue.test(substr);
            if (regmatch) {
                return i;
            }
        }
    }

[searchValue setup]()

The searchValue will typically be a string, but it can be a matching function
or regex. We will throw if it is not one of those types. 

    const tsv = typeof searchValue;
    if ( (tsv !== 'string') && (tsv !== 'function') ) {
        if (searchValue.constructor !== conreg) {
            throw "indexOf requires a matching string, a matching function, explicit null, or a regex as the second argument";
        }
        let regstr = searchValue.toString();
        if (regstr[1] !== '^') {
            throw `regex ${regstr} must check from the beginning of the string`; 
        }
    }
    let svlength = (tsv === 'string') ? searchValue.length : 0;
        
          

### Last Index Of

A better implementation would do this more efficiently, but we expect these to
be called on small bits of text and so we don't care. There is no index from
like in indexOf.

    function (...args) {
        let arr = allIndexOf(...args);
        if (arr.length) {
            return arr[arr.length-1];
        } else {
            return -1;
        }
    }

### Match 

This is like indexOf except it returns the match as if it was a regex: an
array where the first element is the matched string and the rest are
subgroups. The array also has index of the location where the match starts and
a property end which is +1 beyond the end of the match so that
slice(index,end) will give the substring. 

We reuse the code of indexOf, but replace the match checking. 
    
    _"common | sub 
        ARGS, echo('searchValue,'),
        PREP, _"index of:searchvalue setup",
        MATCH, _':check for match',
        CHUNK, echo(' ') "

[check for match]()

This checks the string for a match. The search value could be a string, regex,
or function. If it is a regex, it should be a global regex that starts at the
beginning. The function should determine the match based on the beginning of
the string and return the endpoint. It returns as if it was a regex match
(which it could be). 

    
    if (t === 'string') {
        let substr = str.slice(i, svlength);  
        if (substr === searchValue ) {
            let ret = [searchValue];
            ret.input = subst;
            ret.index = i; 
            return ret;
        }
    } else {
        let substr = slice(i); 
        if (t === 'function') {
            let match = searchValue(substr);
            if (match) {
                match.index = i;
                return match; 
            }
        } else { //definitely a regex
            let regmatch = searchValue.exec(substr);
            if (regmatch) {
                regmatch.index = i; 
                return regmatch;
            }
        }
    }




### Replace

This takes in a search value and a replacement string or function. It
functions similar to the index ones, but replaces the string. Its return is an
array with the new string as the first element and the index i that points to
the first character after the replacement string (or -1 if end of string).
This allows for replaceAll (and maybe other uses) to continue processing after
the first replacement.

The replacment string or function should function identically to the replace
string action. 

    _"common | sub
        ARGS, echo('searchValue, replaceValue,'), 
        PREP, _":prep",
        MATCH, _":check for match and replace",
        CHUNK, echo(' ')"

[prep]()

Do the search value setup followed by a replacement analysis

[check for match and replace]()

This does the same kind of checking as the index, but then also does a
replace. 



### All indexes

This returns the indexes of all matches. This is only for stuff on the outside
of the delimiters. Pass in a delimiters object with empty strings for the
canonical delimiters `()[]{}""''` and backtick  to not care about delimiters
(only the first in the pair should be passed; painful with some syntax
highlighters. 

We use the same arguments as indexOf except for start. We will call indexOf
repeatedly until we get a -1. 

The argument list is the same as indexOf except no start value. We take it in
as an args, insert the index, call indexOf with it. 

    function (str, searchValue, options = {})  {
        options = {
            delimiters : null,
            start :0,
            terminator :null, 
            ...options
        };


        let n  = str.length;
        let ret = [];
        let ind = options.start;
        if (ind < 0) {
            ind = str.length + ind;
            if (ind < 0) {
                ind = 0;
            }
        }

        let prev = ind;
        while ( (ind < n) ) {
            args[2] = ind; //give start value;
            ind = indexOf(...args);
            if (ind === -1) {
                break;
            }
            ret.push(ind);
            ind = Math.max(ind, prev+1);
            prev = ind;
        }
        return ret;
    }


    
### Match All

This returns all matches as an array of match objects from match. (not like
the global match of regex)

    function (...args) {

    }


### Replace All

This will call through replace repeatedly until done. 

The replace value is the third argument where the start value would have been. 

    function (...args) {
        

    }


### Split

This will split a str at a top-level based on the searchValue (string,
function, regex). 

We grab all the indices of where the object is. Then we do a reduce where the
accumulator is of the form [index to start slice, [previous pieces] ]. 


    function split (...args) {
        const [str, searchValue] = args;
        let inds = indexAll(...args);
        if (inds.length === 0) {
            return [str]; // nothing to split
        }
        if (typeof searchValue === 'string') {
            let len = searchValue.length;
            inds.reduce( (acc, ind) => {
                acc[1].push(str.slice(0,ind));
                acc[0] = ind + len;
                return acc;
            }, [0, []]);
        } else {

        }




    }

### Chunk

This breaks a given string into its top level pieces in terms of the
delimiters returning an array with strings being the non-delimited parts and
the delimited stuff being an array with three elements: left delimiter,
middle, and right delimiter.

    function (...args) {

    }

### Chunk All 

This breaks a given string into all of its chunked pieces based on the
delimiters and stuff. It differs from Chunk in that it will return chunked
forms for the middle stuff. So instead of the middle being a string, it is an
array

    function (...args) {

    }

### Walker

This is like chunk and chunkAll, but we have a function that executes when
there would be an array push. This allows us to do stuff as we descend, if we
wish. 

    function (...args) {

    }

## Immediates

These are common functions that go in the core of commonmark and
scriptedwriting parsing; these are the immediate functions. 

    {
        eval : _"local eval",
        scope : _"scope",
        report : _"report",
        prefix : _"prefix",
        escape : _"escape"
    }

### local eval

This is a an eval-like execution; it is asynchronous. It grabs the code from the current
node and that's it. It then removes the code from the node from the web being generated. 

localContext, the webNode, and the data object are there simply to be referenced by the
evaling code if it wants. 

The behavior is a little more complicated. If there is a code fence block with
language `eval` then we take those code blocks, concatenate and use them,
removing them from the webnode. If there is just one block remaining, then we
eval the code with the code variable referencing that text and then that text
being stored in replacement of the original code in the webnode. If there are
no other blocks (eval code fence or not), then we return the code that gets
generated and stash it in the web Node. To short circuit, that, return from
the code. If there are multiple webNode.code blocks, then we make no guesses
as to what the desired outcome is. One can empty that array and return text to
get the behavior of the other scenarios. 



    async function (data) {
        let evalLang, outLang;
        if (data.src[0] === '.') {
            evalLang = data.src.slice(1);
        } else {
            'eval';
        }
        if (data.target[0] === '.') {
            outLang = data.target.slice(1);
        } else {
            outLang = 'generated';
        }
        let webNode = data.webNode;
        let start, end;
        let localContext = this; //eslint-disable-line no-unused-vars
        _":pick code to eval"
        localContext.tracker("local directive evaling code", {webNode, code});
        let str;
        if (webNode.code.length === 1) {
            str = `const origCode = webNode.code[0].code; let code = origCode; ${code}; 
            if (code !== origCode) {webNode.code.pop();} return code;`
        } else if (webNode.code.length === 0) {
            str = `let code = ''; ${code}; return code;`;
        } else {
            str = `${code}`;
        }
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const af = new AsyncFunction( 
            'localContext', 
            'webNode',
            'data',
            str
        );
        
        let ret = await af(localContext, webNode, data);
        if (ret) {
            webNode.code.push({
                code:ret + '', //this must be a string;
                lang: outLang,
                start,
                end
            });
        }

    }

[pick code to eval]()

Evaling could be two things. The first is that all of the code in the section
up to the directive being called is to be eval'd. The second is to concatenate
only eval language blocks and eval them. This second option is employed if
there is an eval language block already present. 

        let code = webNode.code;
        if (!webNode.evaldCode) { webNode.evaldCode = [];}
        if (code.some( (obj) => obj.lang === evalLang) ) {
            let [evblocks, origev, other] = code.reduce( (acc, next) => {
                if (next.lang === evalLang) {
                    acc[0].push(next.code);
                    acc[1].push(next);
                    _":start end"
                } else {
                    acc[2].push(next);
                }
                return acc;
            }, [[],[], []]);
            code = evblocks.join('\n');
            webNode.code = other; 
            webNode.evaldCode.push(origev);
        } else {
            code = webNode.code.reduce( (acc, next) =>{
                _":start end"
                acc.push(next.code);
                return acc;
            }, []).join('\n');
            webNode.evaldCode.push(webNode.code);
            webNode.code = [];
        }

[start end]()

Start and end markers if we create a code node. 

    if (!start) { start = next.start;}
    end = next.end;


### scope

This sets a local variable of the scope. 

    function ({target, scope}) {
        let ind = target.indexOf('=');
        if (ind === -1) {
            delete scope[target.trim()];
        } else {
            let vname = target.slice(0,ind).trim();
            let val = target.slice(ind+1);
            scope[vname] = val;
        }
    }

An example would be to set `[cwd=core](# "!scope:")` with a directive presumably
seeing `cwd` as `change working directory`. One could alternatively have
`scwd` and `lcwd` for different save and loading directories. 

To eliminate a variable, pass in the vname with no equal signs. If there is an
equals sign with no value after it, then an empty string will happen. We find
the first equals sign rather than, say, split, in order to allow for the
passing of a second equals sign.

The vname is trimmed (stuff to left of =), but the stuff to the right is
passed in as is. 

### prefix

This sets (or unsets) the prefix. It makes the most sense to do this just
before a new header. Minors will not use a new prefix until a new header, but
their scope will report it if done before. 

If it ends in double colons (useful style to indicate the change), then those
are stripped. A set of double colons by itself will reset the prefix to the
original state.  

    function ({target, scope}) {
        if (target.slice(-2) === '::') {
            target = target.slice(0,-2);
        }
        if (target) {
            scope.prefix = target;
        } else {
            scope.prefix = this.originalPrefix;
        }
    }


### report

This reports current state of parsing. 

    function ({target, scope, webNode}) {
        this.tracker("commonmark immediate directive report", {target, scope,
            webNode}); 
    }

### Escape

This escapes all underlines in the code that are followed by one of the
quotes. It is a hack purely for the purpose of being able to write about
pieceful programming. This could be moved to its own tool, but it gives a nice
example of going through the code. 

    function ({webNode}) {
        webNode.code.forEach( (el) => {
            el.code = el.code.replace(/\_"/g, '\\\_"');
            el.code = el.code.replace(/\_'/g, "\\\_'");
            el.code = el.code.replace(/\_`/g, '\\\_`');
        });
    }


## Convert to map

This converts objects into array maps: `{key:value}` becomes `[key, value]`
with it sorted by key length by default or by a custom passed in sort. 

    function (obj, sort = (a,b) => b.length - a.length ) {

        if (typeof obj !== 'object') {
            throw "not convertable to an array map: " + (typeof obj);
        }
        if (Array.isArray(obj) ) {
            return obj;
        } 

        return Object.keys(obj).
            sort(sort).
            map( key => [key, obj[key]] );
    }

## Delimiters


Each beginning delimiter comes with an object whose keys can determine what
happens next: 

* confirm. This is a function that confirms the lead delimiter is a delimiter.
  Maybe it can be escaped, maybe there is a regex that should be applied. If
  it returns a falsy value, then it is not a delimiter. If it returns
  something else, it could be passed along? 
* delimiters. This is an object of delimiters that shall be used. 
* end. This is the ending symbol. 
* escape. This is a function that functions similar to the confirm but for the
  ending delimiter. 

We supply the object as a default object on the function itself to access it
internally. 

    {
        const common =  _":common";
        const javascript = _":javascript";
        const litproTop = _":litpro top level";
        const litpro = _":litpro";
        _":litpro variants | sub QQ, qq, 0000, 0022"
        _":litpro variants | sub QQ, q, 0000, 0027"
        _":litpro variants | sub QQ, bt, 0000, 0061"


        delimiterCatalog = {none: {}, common, javascript, 
            litproTop, litpro, litproqq, litproq, litprobt,
            ...moreDelimiters
        };


We actually want these objects to be array-maps `[key, val]` ordered by size
of key. 

        
        Object.keys(delimiterCatalog).forEach( lang => {
            delimiterCatalog[lang] = convertToMap( delimiterCatalog[lang]);
        } );
    }


[javascript]()

    { 
        ...common,
        '//': {
            end: '\n', 
            delimiters : 'none'
        }, 
        '/*' : {
            end: '*/', 
            delimiters : 'none'
        }
    }


[common]()

    { 
        '"' : {
            end: '"', 
            escape: '\\', 
            delimiters : 'none'
        },
        '`' : {
            end: '`', 
            escape: '\\', 
            delimiters : 'none'
        },
        "'" : {
            end: "'", 
            escape: '\\', 
            delimiters : 'none'
        },
        '[' : {
            end: ']' 
        },
        '{' : {
            end: '}' 
        },
        '(' : {
            end: ')' 
        }
    }

[litpro top level]()

We chunk over underscore-quote combinations. But then on sub-levels we go on
in deep. 

    {
        '\u005f"' : {
            lead: '\\',
            escape: '\\',
            end : '"',
            delimiters: 'litproqq'
        },
        '\u005f`' : {
            lead: '\\',
            escape: '\\',
            end : '`',
            delimiters: 'litprobt'
        },
        "\u005f'" : {
            lead: '\\',
            escape: '\\',
            end : "'",
            delimiters: 'litproq'
        }
    }

[litpro]()

The quotes need to be excluded for the corresponding litpro if
that is what we are in. Thus, we take the litpro as a template and then modify
as needed. The parentheticals need to take delimiters of  `litpro` as the
subvairants delete a quote character.  


    {
        '\u005f"' : {
            lead: '\\',
            escape: '\\',
            end : '"',
            delimiters: 'litproqq'
        },
        '\u005f`' : {
            lead: '\\',
            escape: '\\',
            end : '`',
            delimiters: 'litprobt'
        },
        "\u005f'" : {
            lead: '\\',
            escape: '\\',
            end : "'",
            delimiters: 'litproq'
        },
        ...common, 
        '[' : {
            end: ']', 
            delimiters: 'litpro'
        },
        '{' : {
            end: '}', 
            delimiters: 'litpro'
        },
        '(' : {
            end: ')',
            delimiters: 'litpro'
        }
    }



[litpro variants]()

We take a copy of the litpro descenders. We delete the quote character 

    const litproQQ = { ...litpro};
    delete litproQQ['\u0000'];

## Tests

This is where we setup tests for this thing. 
    
    function (input) {
        return `const tap = require('tap'); 
    const myutils = require('../index.js'); 

    const main =  async function () {
        ${input}
    };

    main();`; 
    }


[utiltest](# "define:")


[utilities/tests/](# "cd: save")

### Test Has

Has is a simple function to detect if an object has a property. Optional
chaining probably reduces the need for this. 

    tap.test('has', async(t) => {
        t.ok(myutils.has({a:5}, 'a'));
        t.notOk( myutils.has({a:5}, 'b'));
    });

[has.js](# "save: | utiltest")
    
### Test IndexOf

IndexOf takes a search string and tries to find the search value not inside a
parenthetical, etc. 

    tap.test('simple indexOf', async (t) => {
        const s = myutils.makeScanners();
        console.log('hello');
        let subs = [];
        s.descend({
            str : 'This',
            top : (a) => {subs.push(a); return 2;}
        });
        t.equal(subs.join(''),'Thisis', 'skipping by 2');

        {
        let a = [];
        let ret = s.descend({
            str : 'This(5)',
            terminator : 's',
            top : (c) => {a.push(c[0]); return null;}
        });
        t.equals(ret.join(','), '3,true', 'return value');
        t.equal(a.join(''), 'Thi', 'checking terminating');
        }

        {
        let a = [];
        s.descend({
            str : 'This(5)ab',
            top : (c) => {a.push(c[0]); return null;}
        });
        t.equal(a.join(''), 'Thisab', 'skipping over delimiter');
        }

        {
        let a = [];
        let last = 0;
        let plevel = 0;
        let str = 'i(5+2*[new]+3)+9';
        s.descend({
            str, 
            push : (str, start, left) => {
                a.push(str.slice(last, start) );
                last = start+left.length;
                plevel += 1;
                return null;
            },
            pop : (str, positions) => {
                a.push(str.slice(last, positions[2]));
                last = positions[3];
                plevel -= 1;
                return null;
            },
            end : () => {
                a.push(str.slice(last));
                return null;
            }
        });
        t.equal(a.join(','), 'i,5+2*,new,+3,+9', 'segments');
        }

        
    });

[descent.js](# "save: | utiltest")


