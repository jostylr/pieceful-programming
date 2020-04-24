# Commonmark parsing

Here we implement the parsing of markdown into a web of pieces and directives.
We use commonmark and it generates an AST which we can then do whatever we
like with it. Our purposes are purely informational and we extract headers,
links, and code blocks. 

We output an object with nodes and directives. This is a purely synchronous
function as we are given the text to start and are only concerned with
returning the parsed contents of that text. 

This handles the markdown structure. To parse the code parts into pieces, we
use a separate code parsing function. To compensate for that, the nodes have a
major field associated with them if they are not independent blocks. 

    let cmparse;
    
    {    
        const has = function (obj, key) {
            return Object.prototype.hasOwnProperty.call(obj, key);
        };
        _"core"
    }

    module.exports = cmparse;

We have a separate module for this, but in the core running class, we
integrate the script directly. 


[commonmark/index.js](# "save:")

## Core


    let commonmark = require('commonmark');

The parsing directives get passed in the scope and current webNode as well as
the link text and title text. They cannot see or affect anything else.

Origin is the filepath or other basic identifier. 

    cmparse = async function cmparse (text, prefix, options = {})  {
        let scope = Object.assign({ 
            tracker : () => {},
            immediateDirectives : {}
        }, options); 

        if (typeof text !== 'string') {
            throw 'First argument (text) needs to be a string in cmparse';
        }
    
        if (typeof prefix !== 'string') {
            throw 'Second argument (prefix) needs to be a string in cmparse';
        }
        scope.prefix = prefix; 
        
        scope.immediateDirectives = Object.assign(
            _"immediate directives",
            scope.immediateDirectves 
        );

        
        const {tracker, immediateDirectives} = scope;
        delete scope.tracker;
        delete scope.immediateDirectives;

        tracker('commonmark parsing about to begin', {scope, text});

        let lineNumbering = _"source information"


The return objects

        let web = {};
        let directives = [];

The current state

        let htext = false;
        let ltext = false;
        let webNode;

        let event;

        const originalPrefix = scope.prefix;
        let localContext = {originalPrefix, tracker, lineNumbering, web, immediateDirectives, event, directives};


        let reader = new commonmark.Parser();
        let parsed = reader.parse(text);

        let walker = parsed.walker();

        while ( ( event = walker.next()) ) {
            let node = event.node;

            tracker("commonmark node found", {type: node.type, literal : node.literal || '', destination: node.destination|| '', title : node.title|| '', info: node.info|| '', level: node.level|| '', sourcepos: node.sourcepos, entering: event.entering});
            
            let entering = event.entering;
            if (node.sourcepos)  { 
                scope.sourcepos = [ lineNumbering(node.sourcepos[0]),
                    lineNumbering(node.sourcepos[1]) ];
            }

            _"walk the tree"
        }

        {//scope 
            let end = scope.sourcepos[1];
            _"finish webnode"
        }

        tracker('commonmark parsing done', {origin: scope.origin || originalPrefix, web, directives, text});

        return {web, directives};

    };



# walk the tree

So we examine the nodes and decide when to do something of interest. The nodes
of interest are of type Heading, Link, Text, and CodeBlock. CodeBlock is easy
as the literal is all we need. Both Heading and Link require us to descend and
string together the text. 


    let ty = node.type;
    if (ty === 'text') {
        _"text"
    } else if (ty === 'link') {
        _"link"
    } else if (ty === 'code_block') {
        _"code"
    } else if (ty === 'heading') {
        _"heading"
    } else if (ty === 'document' && entering) {
        _"create initial webnode"
    }
    

## Text

This simply adds the text to an array if the array is there. We have header
text and link text. Since links may be in headers, we have two separate text
trackers. 

    if (htext) {
        htext.push(node.literal);
    }
    if (ltext) {
        ltext.push(node.literal);
    }


## Create initial webnode

This is where we create an initial webnode. It has the key of the prefix by
itself. 

    scope.lv1 = scope.prefix + '::^';
    scope.fullname = scope.majorname = scope.lv1; 
    scope.lv1only = '^';
    webNode = web[scope.fullname] = {
        name : '^', 
        heading:'^', 
        raw : [ [scope.sourcepos[0]] ],
        code : [],
        scope : Object.assign({}, scope)
    };


## Heading

Headings create blocks. We track to say we found one. We collect the
text as we go with htext and then join them when ready. 

Once the heading is ready, we create a new node, deciding what to do based on
the level. 

We also look for a transform command in the heading. A pipe in the heading
will lead to it being a transformation string. 

    if (entering) {
        htext = [];
    } else {
        let sourcepos = scope.sourcepos;
        {
            let end = sourcepos[0];//start of this heading
            _"finish webnode"
        }
        
        let heading = htext.join('');
        let ind = heading.indexOf('|');
        if (ind === -1) { ind = heading.length;}
        let name = heading.slice(0, ind).
            trim().
            toLowerCase().
            replace(/\s+/g, ' ');

        let transStart = lineNumbering([scope.sourcepos[0][0],
            scope.sourcepos[0][1]+ind]);
        let transformText = heading.slice(ind).trim();
        let transform;
        if (transformText) {
            transform = [transStart, transformText];
        } 

        let hlevel = node.level;
        let fullname;
        
        _":compute name"
        
        if (has(web, fullname) ) {
            tracker('repeat heading found', {fullname, heading});
            webNode = web[fullname];
            webNode.raw.push( [sourcepos[0]] );
            if (transform) {
                if (has(webNode, 'rawTransform') ) {
                    webNode.rawTransform.push(transform);
                } else {
                    webNode.rawTransform = [transform];
                }
            }
        } else {
            tracker('new heading found', {fullname, heading});
            webNode = web[fullname] = {
                name, heading, 
                raw : [ [sourcepos[0]] ],
                code : [],
                scope : Object.assign({}, scope)
            };
            if (transform) {
                webNode.rawTransform = [transform];
            }
        }
        
        htext = false;
    }

[compute name]()

We allow limited hierarchies. This should be for material that is tightly
coupled and just needs a little expansion. The h5-h6 are more for topical
relations, such as documentation and testing while the minors are for shifting
out bits to be their own explanations. 

This is a bit into the weeds, but we have that h1-h4 headings are stand-alone.
For h5-h6, we have these are subblocks and we use `/` along with the top level to create these. 

* lv1: top name (h1-h4)
* lv2: h5. lv1/lv2
* lv3: h6. lv1/lv2/lv3, possible lv2 being empty string
* lv4: minor. any of the above then :lv4 

And now the code...

    if (hlevel == 5) {
        delete scope.lv4;
        delete scope.lv3;
        scope.lv2 = name;
        scope.majorname = scope.lv1 + '/' + scope.lv2; 
    } else if (hlevel == 6) {
        delete scope.lv4;
        scope.lv2 = scope.lv2 || '';
        scope.lv3 = name;
        scope.majorname = scope.lv1 + '/' + scope.lv2 + '/' + scope.lv3; 
    } else {
        delete scope.lv4;
        delete scope.lv3;
        delete scope.lv2;
        scope.lv1 = scope.prefix + '::' + name;
        scope.lv1only = name;
        scope.majorname = scope.lv1; 
    }
    scope.fullname = fullname = scope.majorname;

### switch

This creates a new webNode, being the minor stuff. 

    let sourcepos = scope.sourcepos;
    {
        let end = sourcepos[0];//start of the link
        _"finish webnode"
    }
    
    let name = ltext.
        trim().
        toLowerCase().
        replace(/\s+/g, ' ');

To improve location, slice out the text and look for first quoted character. 
    
    let transform;
    if (title) { //colon starts
        title = title.slice(1);
        let ind = text.slice(sourcepos[0][2], sourcepos[1][2]).
            search(/('|"):/);
        let transStart = lineNumbering([sourcepos[0][0],
            sourcepos[0][1]+ind]);
        let transText = title.trim();
        if (transText) {
            transform = [transStart, transText];
        }
    } 

    scope.minor = name;

Note the prefix is not here because the majorname should contain it and this
preserves against the prefix changing before a minor; minors should always be
path related to the last header. 

    let fullname = scope.fullname = scope.majorname + ':' + name;
    
    if (has(web, fullname)) {
        tracker('repeat minor found', {fullname});
        webNode = web[fullname];
        webNode.raw.push( [sourcepos[0]] );
        if (transform) {
            if (has(webNode, 'rawTransform') ) {
                webNode.rawTransform.push(transform);
            } else {
                webNode.rawTransform = [transform];
            }
        }
    } else {
        tracker('new minor found', {fullname});
        webNode = web[fullname] = {
            name, 
            raw : [ [sourcepos[0]] ],
            code : [],
            scope : Object.assign({}, scope)
        };
        if (transform) {
            webNode.rawTransform = [transform];
        }
    }


## Finish webnode

This finishes the webnode which is basically dealing with the raw component
which is an array of arrays (in case of repeat headers): [ start, text, end]
and the start/end are [line num, col, absolute pos]

    let cur = webNode.raw[webNode.raw.length-1];
    let begin = cur[0][2];
    cur[1] = text.slice(begin, end[2]);
    cur[2] = end;


## Code

We emit found code blocks with optional language. These should be stored. It
can be the responsibility of something else to convert the code blocks into
something else, mainly for source mappish concerns.  

    let lang = node.info || '';
    let code = node.literal || '';
    if (code[code.length -1] === "\n") {
        code = code.slice(0,-1);
    }
    _":adjust sourcepos"

    webNode.code.push( {code, lang, start:sourcepos[0], end:sourcepos[1]});

    if (lang.slice(0,4) === 'eval') {
        _":eval block"    
    }

If there are code fences in the code, then the positioning information is
going to be off. Not sure whether to address this. 

If there are fences, then the code block starts at column 1. 

[eval block]()

This is a bit of a hack. We will use a code fence eval lang as meaning it
should be eval'd. We pretend it comes from a directive and reuse that code.
This helps ensure that if we want to replace eval, that we end up doing so. 

    let data = {
        directive : 'eval',
        args : '',
        src: '.eval',
    };
    let tar = lang.slice(4);
    if (tar) {
        data.target = '.' + tar;
    } else {
        data.target = '';
    }

    let directive = data.directive;
    data.scope = scope; //live scope
    data.webNode = webNode;
    tracker("evaling code block", {directive, data});
    await immediateDirectives[directive].call(localContext, data);
    tracker("done with evaling code block", {directive, scope, webNode});


[adjust sourcepos]()

If the start column is 1 (text or number, idk) then we need to recompute
sourcepos for the actual code block by removing the first line and setting the
end to the start of the last line which seems to be the code fence line. could
be wrong. 

    let sourcepos = scope.sourcepos;
    if (sourcepos[0][1] == 1) {
        let start = sourcepos[0];
        let end = sourcepos[1];
        start = [start[0]+1, start[1]];
        end = [end[0], 1];
        sourcepos = [lineNumbering(start), lineNumbering(end)];
    }



### Link

Links may be directives if one of the following things occur:

1. Title contains a colon. If so, then it is emitted as a directive with the
   stuff preceeding the colon being a directive. The data sent is an array
   with the link text, the stuff after the colon, and the href being sent. No
   pipe parsing is done at this point.
2. Title starts with a colon in which case it is a switch directive. The stuff
   after the colon is sent as second in the data array, with the link text as
   first. The href in this instance is completely ignored. There is some pipe
   processing that happens.
3. Title and href are empty in which case this is a switch to a minor.
4. The href starts with a `!` in which case it is a local directive and
   processed as such. 

Return the text in case it is included in a header; only the link text will be
in the heading then. 

    if (entering) {
        ltext = [];
    } else {
        let title, href, ind; // links

        href = node.destination;

Commonmark translates `^` into `%5E`. This undoes that. May want to think
about a general transformation back or to block it, but this is sufficient for
now. 

        if (href === "#%5E") {
            href = "#^";
        }
        title = node.title;
        ltext = ltext.join('').trim();
        
        if (title) {
            title = title.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
        }   

href is not used in the minor stuff, but if it is present with no title, we
assume it is an ordinary link. To have a title, there must be an href. The
title tells us the information we need in all other cases. 

        if ((!href) && (!title)) { //pipeless switch
            _"switch"
        } else if (title[0] === ":") { 
            if  ( (ltext[0] === '|') || ( ltext.length === 0) ) { //transform
                _":transform"
            } else if (ltext[0] === "=") { //store directive
                _":store"
            } else { // switch
                _"switch"
            }
        } else if ( (ind = title.indexOf(":")) !== -1) { //compile directive
            _":parse out directive"
            if (data.directive[0] === '!') {
                _":execute local directive"
            } else {
                _":store the directive"
            }
        }
        ltext = false;
    }

[transform]()

This parses both the link text and the title text to add transforms to the
current node block. 

    webNode.rawTransform.push([scope.sourcepos[0], ltext + '|' + title.slice(1)]); 

[store]()

This is a shortcut for having a store directive which could also be called
with a standard `store:` directive. 

The store command uses the prefix 

    let data = {
        directive : 'store',
        args : title.slice(1),
        src:href,
        target : ltext.slice(1),
        scope : Object.assign({}, scope)
    };

    tracker("directive call found", data);
    directives.push(data);
    
[parse out directive]()

    let data = {
        directive : title.slice(0, ind).
            trim().
            toLowerCase().
            replace(/\s+/g, ' '),
        args : title.slice(ind+1),
        src:href,
        target : ltext,
    };
    
[execute local directive]()

These are directives identified by being a directive with a leading `!`. 
They are executed immediately and pause further processing until resolved. The
eval directive, for example, can be asynchronous. 

These have access to the localContext variable via `this` as well as in the
data object being the args, target, and src as with other directives. It
additionally has access to the current scope object and the current piece
being worked on under webNode. 

The main goal is allowing modification of either the current webnode or scope 
objects. They can do more by tapping in to the localContext but hopefully that
is kept to a minimum. 

    let dir = data.directive.slice(1); //strip !
    data.scope = scope; //live scope
    data.webNode = webNode;
    tracker("calling local directive", {dir, data});
    await immediateDirectives[dir].call(localContext, data);
    tracker("done with local directive", {directive:dir, scope, webNode});


[store the directive]()

This is where the directives for processing occur, such as save or load. We
assemble the data and then push it on to the directives array, for later
processing. No further processing is done here. We do send the full name
information of its location with it. 

We allow for custom data to be set which is what the scope provides along with
location data. The scope variables are set
with a local directive and then shipped with the directive data. 


    data.scope = Object.assign({}, scope)
    tracker("directive call found", data);
    directives.push(data);
    


## Immediate Directives

This is where we can have local directives that impact the parsing. We can 
add to a scope variable that can be tapped
into elsewhere. 

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

## Differences

Removed the remove comments. Doesn't seem to impact the parser as far as I can
tell. So HTML comments can still be embedded with no change. Needed to get rid
of it for faithful location information. 

More information about source information.

Pipes in a heading lead to automatic transforming of the computed values. 

Directives for parsing should have a `!:` in the title. 

In directives title, we parse it more simply as a series of arguments into the
directive as a double pipe for the separator, using single pipes for piping of
commands into one another. This eliminates the need for the middle in the
title. 

There are parsing directives that impact the parsing, such as changing the
prefix, but are not present in the final directives. 

The transform semantics changed. 

# Source information

Commonmark notes the source position with line number and then character.
While convenient in some respects, to slice the text, we need to convert this
to absolute position numbers. We create a function that takes in a (line
number, column) and returns an absolute position in the text as the third item
of an array. It precomputes
this in creating the function. 

We only need this once here as far as I know so it is ife

Commonmark is using 1 based, probably because that is how line and column
positioning is usually used this way. 

The first line starts at 0 with no newlines

    ( function (text) {
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
        return function ([line, col]) {
            return [line, col, lines[line-1] + col-1]; 
        };
    })(text);



# Understanding Commonmark

This is a short script and test file that allows for commonmark exploration. 

    
    const commonmark = require('commonmark');
    
    const fs = require('fs');

    const text = fs.readFileSync('tests/src/variety.md', {encoding:'utf8'});

    let lineNumbering = _"source information"
    console.log(text);

    let reader = new commonmark.Parser();
    let parsed = reader.parse(text);

    let walker = parsed.walker();


    let event, sourcepos;

    while ( (event = walker.next()) ) {
        let node = event.node;
        if (node.sourcepos)  { 
            sourcepos = [ lineNumbering(node.sourcepos[0]),
            lineNumbering(node.sourcepos[1]) ];
        }
        console.log(node.type, node.literal || '', node.destination|| '', node.title|| '', node.info|| '', node.level|| '',  sourcepos, text.slice(sourcepos[0][2], sourcepos[1][2]+1), event.entering);
        
    }

[commonmark/explore.js](# "save:")


## sample

A sample md doc


## Run sample

This is the code to run the sample and see how it goes. 

    const cmparse = require('./index.js');
    const util = require('util');
    const fs = require('fs');

    const text = fs.readFileSync('tests/src/variety.md', {encoding:'utf8'});

    const ret = cmparse( text, 'first', {tracker : () => {} });

    
    console.log(util.inspect(ret, {depth : 8, colors:true} ) ) ;


[commonmark/runsample.js](# "save")
    
## Tests

This is where we develop the tests to run. We have a separate setup script
that puts source and compiled versions of cases in the test folder. We run
through each and make sure the generated objects are the same. 

    const tap = require('tap');
    const cmparse = require('../index.js');
    const util = require('util');
    const {isDeepStrictEqual: deep} = util;
   
    const path = require('path');
    const {readdir, readFile, writeFile} = require('fs').promises;


    const main = async function () {
        _":main"
    };

    main();
    

[main]()

    const src = "tests/src/";
    const out = "tests/json/";
    const fname = 'FNAME'; 

    tap.test('Checking '+fname, async (t) => {
        let jsons = await Promise.all( [
            readFile(src + fname + '.md', {encoding:'utf8'}).then(
                async txt => await cmparse(txt, fname, {
                    origin: src + fname + '.md'
                    }) 
            ),
            readFile(out + fname + '.json', {encoding:'utf8'}).then( 
                txt => JSON.parse(txt)
            ).catch(e => null )
        ]);

        t.ok(deep(jsons[0], jsons[1]));

    });


## Setup Tests

There are two distinct steps. One is to generate the output files. The other,
once those output files are confirmed to be correct, is to put them where
automated test runs can be run. The original place is under the root directory
tests/src and we create output files in tests/commonmark  

### Generate test output

    const cmparse = require('./index.js');
    const util = require('util');
    const {isDeepStrictEqual: deep} = util;
    const path = require('path');
    const {readdir, readFile, writeFile} = require('fs').promises;
    const stringify = require('json-stringify-pretty-compact');
    const cp = require('child_process');
    const exec = util.promisify(cp.exec);
    const deepdiff = require('deep-diff').diff;

    const main = async function () {
        _":main"
    };

    main();

[commonmark/maketests.js](# "save:")

[main]()

    try {
        const {stdout, stderr} = await exec(
            'rsync -av ../../tests/src/ tests/src/'
        );
        console.log(stdout);
        if (stderr) {
            console.error("error:", stderr);
        }
    } catch (e) {
        console.log("error in syncing src:", e);
    }

    const src = "tests/src/";
    const out = "tests/json/";

    const mdfiles = (await readdir(src)).
        filter( file => (path.extname(file) === '.md') ).
        map( file =>  path.basename(file, '.md') );


We read in the md file and the json file (json may not exist --> return null)
If it does not exist, then we create a test file for it and later it gets a
json saved for it. 


    const results = await Promise.all(mdfiles.map( async (fname) => {
        let jsons = await Promise.all( [
            readFile(src + fname + '.md', {encoding:'utf8'}).then(
                async txt => { return await cmparse(txt, fname, {
                origin: src + fname + '.md'}); }
            ),
            readFile(out + fname + '.json', {encoding:'utf8'}).then( 
                txt => JSON.parse(txt)
            ).catch(e => {
                return null;
            })
        ]);
        if ( jsons[1] === null) {
            let testfile = `_"tests"`;
            let tname = 'tests/' + fname + '.js';
            testfile = testfile.replace('FNAME', fname);
            await writeFile(tname, testfile);
            console.log('written test file ' + tname);
        }


The json file might not exist in which case json[1] is null and evaluates to
false and short circuits the comparison. 

        return [fname, jsons[1] && (deep(jsons[0], jsons[1]) ), jsons[0],
        jsons[1] ];  
    }) );

    const same = results.filter( arr => arr[1] );
    const diff = results.filter( arr => !arr[1] );
    
    console.log('The following are unchanged: ' + 
        same.map( arr => arr[0] ).join(',') );

    diff.forEach( async (arr) => {
        try {
            await writeFile(out + arr[0] + '-new.json', 
                stringify(arr[2]) );
            console.log(`New json file saved ${out+arr[0]}-new.json`);
            if (arr[3]) { // differences, not just a new one
                console.log('The differences are (new, old): ', 
                util.inspect(deepdiff(arr[2], arr[3]), {depth : 8, colors:true}) );
            }
        } catch (e) {
            console.log(`Error in saving ${out+arr[0]}-new.json ${e}`);
        }
    });
        


## README

This is the readme for this module. Very little to say. 

    # Pieceful Commonmark

    This a component of [pieceful programming](https://github.com/jostylr/pieceful-programming).

    It takes in a markdown document (commonmark dialect) and outputs a
    javascript object suitable for further processing by the rest of the
    pieceful programming setups. 

    Headings in markdown convert to names of the pieces. 

    Code blocks become pieces of code. Code blocks within the same heading
    get added to an array of code blocks for that heading group. They
    eventually get concatenated together, in general. Code fences with a
    language after the fences have code blocks with that language tag. Any
    language tag that leads with `eval` will be evaluated in line as a chunk.
    See the eval immediate directive below. 

    Most of the other markdown syntax is ignored. The only other bit is that
    of links. 

    ## Links

    A link of the form `[target](src "directive: args")` becomes a directive.
    That colon is crucial in the title to recognize as a directive. The names
    in that link form are the headings of the directive object produced. There
    is also a scope object. If `src = #`, then the current section is used for
    the src. 

    To produce a minor block (a kind of subheading), we use `[name]()` as the
    main way. Also possible is `[name](whatever ":pipes")`. In both cases, this
    creates a new piece whose name is the name of the piece it appears in plus
    `:name` where name is the link text. 

    We also have `[=varname](whatever ": pipes")` to store the current
    section, after piping, into a new piece name. There is also a way to
    transform the current section by having `[](whatever ":pipes")` or
    `[|](whatever ":pipes")`.  

    ### Immediate directives

    The final form of the link is that of an immediate directive. Most directives
    are executed later without regard to order of appearance (though the piece
    they appeared in is recorded in a scope variable). Local directives get
    executed immediately and are triggered by `[target](src "!directive:
    args")`  Basically, directives with a leading exclamation point. 

    There are several built-in: 

    * `eval`. This evaluates some code in the current block and does something
      with it. The target, if a leading ., gives the output language. The src,
      with a leading ., leads to those blocks in that heading to be
      concatenated and then evaluated.
      
        This is a an eval-like execution; it is asynchronous. It grabs the code from the current
        node and that's it. It then removes the code from the node from the web being generated. 

        localContext, the webNode, and the data object are there simply to be referenced by the
        evaling code if it wants. 

        The behavior is a little more complicated. If there is a code fence
        block with language `eval` then we take those code blocks, concatenate
        and use them, removing them from the webnode. If there is just one
        block remaining, then we eval the code with the code variable
        referencing that text and then that text being stored in replacement
        of the original code in the webnode. If there are no other blocks
        (eval code fence or not), then we return the code that gets generated
        and stash it in the web Node. To short circuit, that, return from the
        code. If there are multiple webNode.code blocks, then we make no
        guesses as to what the desired outcome is. One can empty that array
        and return text to get the behavior of the other scenarios. 
    * `scope`. This affects the scope variables. Whatever it does will persist
      until changed by another scope command. `[cwd=core](# '!scope:')` sets
      the cwd (say change working directory) to core. To later delete this, do
      `[cwd](# '!scope:')`. To the left of the equal sign gets trimmed, but
      not to the right. 
    * `prefix`. This changes the prefix (`prefix::...`) of how stuff gets
      referred to. `[name](# "!prefix:")` If name is not present, this reverts
      to original prefix. 
    * `report`. This calls the tracker to record the target, scope, and
      webNode. Note these are live. 
    * `escape`. This escapes (inserts slash) all underscore-quotes. This is
      for being able to write about pieceful programming without having to
      slash everything. Of course, this only works if one does not want to put
      in any substitutions at all. 


    ## Require

    If using this module separately, the `require` exports a function, (I call
    it `cmparse`), and that function takes in `text` which gets parsed, a
    prefix string for referring to the pieces,  and an
    `options` argument that can contain whatever scope variables one wants,
    but it can also contain two special pieces: `tracker`, if present, should
    be a function that expects to take in arguments for some kind of reporting
    to be done, and `immediateDirectives` which should be an object whose keys
    are the immediate directive names and values are functions that get
    called; their argument is a data object that contains the target, src,
    args, scope, directive, webNode. The `this` is the localContext which
    contains access to all directives, webNodes (under web), and some other
    stuff. To disable the ability to do eval in these blocks, pass in a
    key-value pair of eval-function that does not evaluate. 


[commonmark/readme.md](# "save:")


## TODO

Test transform

Implement lang extension on names like in scriptedwriting giving automatic
language extension to all code blocks in it? 

Implement current being passed in, maybe first name like in sw? 

