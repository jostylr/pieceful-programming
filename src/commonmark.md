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


    cmparse = function cmparse (text, { prefix = '', origin = '' }) {
        const tracker = cmparse.tracker;

        tracker('commonmark parsing about to begin', {prefix, text});
        
        const parsingDirectives = cmparse.parsingDirectives;

        const originalPrefix = prefix;
        let scope = { prefix, origin};

        let lineNumbering = _"source information"


The return objects

        let web = {};
        let directives = [];

The current state

        let htext = false;
        let ltext = false;
        let webNode;

        let event;

        let localContext = {originalPrefix, tracker, lineNumbering, web, parsingDirectives, event, directives};


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

        tracker('commonmark parsing done', {prefix, web, directives, text});

        return {web, directives};

    };


    cmparse.parsingDirectives = _"common parsing directives";
    cmparse.tracker = () => {};


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
        name : '^', heading:'^', 
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

If there are code fences in the code, then the positioning information is
going to be off. Not sure whether to address this. 

If there are fences, then the code block starts at column 1. 

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
3. Title and href are empty.
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
        } else if (href[0] === '!') { //parse directive
            _":parse directive"
        } else if ( (ind = title.indexOf(":")) !== -1) { //compile directive
            _":compile directive"
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
    


[parse directive]()

These are directives identified by the href having an `!` as the first
character. Seems harmless and we don't need a ref because these are always
synchronous, mainly modifying either the current webnode or scope 
objects. They can do more by tapping in to the localContext but hopefully that
is kept to a minimum. 

    let directive = href.slice(1).
        trim().
        toLowerCase();
    let args = title;
    let target = ltext;
    let data = {args, target, scope, context:webNode};
    tracker("calling parse directive", {directive, data});
    parsingDirectives[directive].call(localContext, data);
    tracker("done with parse directive", {directive, scope, context : webNode});


[compile directive]()

This is where the directives for processing occur, such as save or load. We
assemble the data and then push it on to the directives array, for later
processing. No further processing is done here. We do send the full name
information of its location with it. 

We allow for custom data to be set which is what the scope provides along with
location data. The scope variables are set
with a local directive and then shipped with the directive data. 


    let data = {
        directive : title.slice(0, ind).
            trim().
            toLowerCase().
            replace(/\s+/g, ' '),
        args : title.slice(ind+1),
        src:href,
        target : ltext,
        scope : Object.assign({}, scope)
    };

    tracker("directive call found", data);
    directives.push(data);
    


## Common Parsing Directives

This is where we can have local directives that impact the parsing. We can 
add to a scope variable that can be tapped
into elsewhere. 

    {
        eval : _"local eval",
        scope : _"scope",
        report : _"report",
        prefix : _"prefix"
    }
    
### local eval

This is a simple eval execution. No async. It grabs the code from the current
node and that's it. It then removes the code from the node from the web being generated. 

Both localContext and originalCode are there simply to be referenced by the
evaling code if it wants. 

We have a special variable ret that the code can set to a value that gets put
in for the code. The ret object should have at least the code property.  


    function (data) {
        let webNode = data.webNode;
        let localContext = this; //eslint-disable-line no-unused-vars
        let originalCode = webNode.code; //eslint-disable-line no-unused-vars
        let code = webNode.code.reduce( (acc, next) => {
            return acc.push(next[0]);
        }, []).join('\n');
        webNode.code = [];
        localContext.tracker("local directive evaling code", {webNode, code});
        let ret;
        eval(code);
        if (ret && ret.code) {
            webNode.code.push(ret);
        }
    }

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

An example would be to set `[cwd=core](!scope)` with a directive presumably
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

    function ({label, scope, webNode}) {
        this.tracker("commonmark parsing directive report", {label, scope,
            webNode}); 
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

    const ret = cmparse(
    text, {tracker : () => {}, prefix: 'first' }
    );

    
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
    
[commonmark/tests/generated.js](# "save:")

[main]()

    const src = "tests/src/";
    const out = "tests/json/";

    const mdfiles = (await readdir(src)).
        filter( file => (path.extname(file) === '.md') ).
        map( file =>  path.basename(file, '.md') );


We read in the md file and the json file (json may not exist --> return null)


    const results = await Promise.all(mdfiles.map( async (fname) => {
        tap.test('Checking '+fname, async (t) => {
            let jsons = await Promise.all( [
                readFile(src + fname + '.md', {encoding:'utf8'}).then(
                    txt => cmparse(txt, {tracker: ()=> {}, prefix: fname})
                ),
                readFile(out + fname + '.json', {encoding:'utf8'}).then( 
                    txt => JSON.parse(txt)
                ).catch(e => null )
            ]);

            t.ok(deep(jsons[0], jsons[1]));

        })
    }) );


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


    const results = await Promise.all(mdfiles.map( async (fname) => {
        let jsons = await Promise.all( [
            readFile(src + fname + '.md', {encoding:'utf8'}).then(
                txt => cmparse(txt, {tracker: ()=> {}, prefix: fname})
            ),
            readFile(out + fname + '.json', {encoding:'utf8'}).then( 
                txt => JSON.parse(txt)
            ).catch(e => null )
        ]);

The json file might not exist in which case json[1] is null and evaluates to
false and short circuits the comparison. 

        return [fname, jsons[1] && (deep(jsons[0], jsons[1]) ), jsons[0] ];  
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
        } catch (e) {
            console.log(`Error in saving ${out+arr[0]}-new.json ${e}`);
        }
    });
        




