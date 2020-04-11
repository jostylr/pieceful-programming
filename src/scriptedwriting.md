# Scripted Writing

This is simple flow of taking in a document that gets processed with the
underpipes syntax, not commonmark. That is, there are no actual code blocks to
substitute in. There is a scope. 

The idea is to have a document that basically requires some computation in
place and this does that. It has a lead section of yaml, then the main body
which is what the output will be and, followed by that section, any named
sections. 

This should be the scaffolding for both cli and browser. 

Basic outline:

    Abstract (raw)
    --- yaml
    yaml stuff
    --- main | transform stuff
    
    main block
    --- name1
    
    stuff

    --- name2 | transform :=> save file.txt

We cut the stuff up looking for `\n--- `  

Note that in contrast to literate programming, the whole named block is
considered a piece (equivalent of a code block). There is no explanatory text
role though an empty `\n---\n` can not be called and thus is ignored. This
should lead to an easy ignoring of random code stuff. 

We can also use directives indicated by `:=> dirname target (args)` the src is
the named block or empty if no name. Hopefully `:=>` doesn't conflict with
anything.

Unlike the commonmark version, there are no local directives impacting the
processing of the parser. Also, there are no different levels of heading;
they are all global as written. 


Note the convention of yaml and main having special behaviors is not apparent
in the file processor. This happens in the client and can be overriden. 

## Core

This is a simple module that exports a function that will take in a file of
the above form and produce an output similar to commonmark processing. 

    sw = async function scriptedwriting (text, prefix, options) {
        let scope = Object.assign({ 
            firstName : 'abstract',
            current : [1,1, 0],
            getText : _"get text"
        }, options); 

Allows customization, but not part of scope.  

        let {firstName, current, getText} = scope;
        delete scope.firstName;
        delete scope.current;
        delete scope.getText;

        if (typeof text !== 'string') {
            throw 'First argument (text) needs to be a string in scriptedwriting';
        }
    
        if (typeof prefix !== 'string') {
            throw 'Second argument (prefix) needs to be a string in scriptedwriting';
        }

        let ret = {};
        let lines = [];
        scope.prefix = prefix;
        scope.lv1 = prefix + '::' + firstName;
        scope.lv1only = firstName;

        scope.fullname = scope.lv1;
        scope.majorname = scope.fullname;
        let piece = {
            scope: Object.assign({sourcepos : [current.slice()]}, scope),
            code : []
        };
        let web = {};
        web[scope.fullname] = piece;
        ret.web = web;
        let directives = ret.directives = [];
        let ind = 0;
        let len = text.length;
        let start = current.slice();
        let lang = '';
        while (ind < len) {
            if (text[ind] === '\n') {
                if (text.slice(ind+1, ind+5) === '--- ') {
                    _"new heading"
                    continue;
                } else {
                    _":current update"
                }
            }
            ind +=1;
        }
        current[1] = 1+ ind - current[2]; //get column
        piece.code.push( {code: getText(text, start[2], ind), start, end:current.slice(), lang});
        return ret; 

    };


[current update]()

This is the same regardless, but we only want it to happen after closing the
old object.

    current = [current[0]+1, 1, ind+1];
    lines.push(current.slice());

## Module

The separate module part is here.

    let sw;

    {
        const has = function (obj, key) {
            return Object.prototype.hasOwnProperty.call(obj, key);
        };
        _"core"
    }

    module.exports = sw;

[scriptedwriting/index.js](# "save:")

### New Heading

This is where all the magic happens. Once a new heading appears, we need to
close the old object, get/parse the name, get the transform, get the
directive, and start the new object. 

The start variable is the start of the code block. We set piece for the new
piece, storing it in web at the time of its creation. 

If there is no name, then we do not store the node at all, but we still create
a piece to avoid complications; it is just wasted. If there is a
directive, then it becomes a stand-alone added directive. 

    _"core:current update"
    _"close old piece"

    ind += 5; 

    let name, transform, directive;
    _"loop through heading"

After looping through the heading, the index points to the end of the heading
line. 

    _"core:current update"
    start = current.slice();

    let fullname = scope.fullname;
        
    if (name ) {
        if (has(web, fullname) ) {
            piece = web[fullname];
            scope = piece.scope;
            scope.sourcepos.push(start);
        } else {
            piece = web[fullname] = {
                code:[], 
                scope : Object.assign({ sourcepos: [start]}, scope)
            };
        }
    } else {
    
No name present.  Directive and transform can link in to previous piece, but
any text of the code essentially gets ignored.

        piece = {
            scope : Object.assign({}, scope, { sourcepos: [start]}),
            code:[]
        };
    }

    if (transform && transform[1]) {
        if (has(piece,'rawTransform') ) {
            piece.rawTransform.push(transform);
        } else {
            piece.rawTransform = [transform];
        }
    }

This is to conform with the standard directive format. 

    if (directive[0]) {
        directive[0].scope = Object.assign({}, directive[0].scope,
            {start:directive[1], end:directive[2]});
        directives.push(directive[0]);
    }


### Close old piece

We cut out the body now that we have the end and push it onto code. 

    let end = current.slice();
    piece.code.push( {code: getText(text, start[2], end[2]),  start, end, lang});

### Get Text

This does a little text slicing. 

    function getText (text, start, end) {
        return text.
            slice(start, end).
            replace(/\n---(\\)(\\*) /g, '\n---$2 ').
            trim();
    }
### Loop through heading

We need to get the name, a possible transform (started by a pipe) and/or a
directive started by `:=>`.  

    _":current"
    let nameStart = current.slice()[2]; // only need it for slicing; no tracking
    let transStart, transEnd, direStart, direEnd;
    ind -= 1;
    while (ind < len) {
        ind += 1;
        if ( (!transStart ) && (text[ind] === '|') ) {

We have found a pipe so start transform unless we have already done so or
avoided it because we found something else first. 

            _":end name"
            ind +=1;
            _":current"
            transStart = current.slice();
        } else if (text.slice(ind, ind+3) === ':=>') {
            ind -=1;
            if (!transStart) {
                _":end name"
            } 
            _":end transform"
            ind +=1+3; //get past :=>
            _":current"
            direStart = current.slice();
            ind -=1;
        } else if (text[ind] === '\n' || ind >= text.length) {
            _":current"
            if (!transStart) {
                _":end name"
                transStart = transEnd = current.slice();
            }
            if (!direStart) {
                direStart = current.slice();
            }
            ind -= 1;
            direEnd = current.slice();
            directive = [
                text.slice(direStart[2], direEnd[2]+1).trim(),
                direStart, direEnd
            ];
            if (name) {
                _"parse name"
            } 
            if (directive[0]) {
                _"parse directive"
            }
            ind +=1; //now pointing to newline
            break;
        }
    }

[end name]()

If a name ends in `.ext` then we take that to be a language for the code and
remove it from the name. Only the last period matters. So if one wants the
name to be `this.js` but not language js, write `this.js.` 

    name = text.slice(nameStart, ind).trim().toLowerCase();
    let perind = name.lastIndexOf('.');
    if (perind !== -1) {
        lang = name.slice(perind+1);
        name = name.slice(0, perind);
    } else {
        lang = '';
    }

[end transform]()

    _":current"
    transEnd = current.slice();
    if (transStart) {
        transform = [
            transStart, 
            text.slice(transStart[2], transEnd[2]+1).trim()
        ];
    } else {
        transStart = transEnd; 
    }

[current]()

    current = [current[0], current[1] + ind - current[2], ind];

### Parse name

So we have a name and we want to break it into possible parts, similar to what
one might see with literate-programming. This is not as convenient as that,
but it may have its uses for a longer document. 

Essentially, we have the format `prefix::lv1/lv2/lv3:lv4`.  We do a lot of
redundancy as we build up the full name, clearing away old levels if new stuff
is found that arises earlier. 

    let reg = /([^:/]*::)?([^:/]+)?(\/[^:/]*)?(\/[^:/]*)?(:.*)?/;
    let match = reg.exec(name); //match can't fail as far as I know
    if (match[1]) {
        scope.prefix = match[1].slice(0, -2);
        delete scope.lv1only;
        delete scope.lv1;
        delete scope.lv2;
        delete scope.lv3;
        delete scope.lv4;
        scope.fullname = scope.majorname = scope.prefix;
    }
    if (match[2]) {
        scope.lv1only = match[2];
        scope.lv1  = prefix + '::' + scope.lv1only;
        delete scope.lv2;
        delete scope.lv3;
        delete scope.lv4;
        scope.fullname = scope.majorname = scope.lv1;
    }
    if (match[3]) {
        scope.lv2  = match[3].slice(1);
        delete scope.lv3;
        delete scope.lv4;
        scope.fullname = scope.majorname = scope.fullname + '/' + scope.lv2;
    }
    if (match[4]) {
        scope.lv3 = match[4].slice(1);
        delete scope.lv4;
        scope.fullname = scope.majorname = scope.fullname + '/' + scope.lv3;
    }
    if (match[5]) {
        scope.lv4 = match[5].slice(1);
        scope.fullname = scope.majorname + ':' + scope.lv4;
    }

     
### Parse Directive

Directives, unlike transforms, do get parsed a bit here. 

Basically, we return a directive with keys "name, src, target, args". The src
is the fullname variable (may be previous section if no name). 

The form should be `directivename target args` with the src being the
fullname.

    let chunk = directive[0];
    let reg = /^\s*(\S+)(?:\s*$|\s+(\S+)(?:\s*$|\s+(.+$)))/;
    let match = reg.exec(chunk);
    if (match) {
        directive[0] = {
            directive : match[1],
            src : name ||scope.fullname,
            target : (match[2] || ''),
            args : (match[3] || ''),
            scope : Object.assign({}, scope)
        };
    } else {
        //some error reporting of directive? 
        console.log('failed to parse directive: ' +
            current.slice().join(',') + ' : ' + chunk
        );
    }


## Sample

    let fs = require('fs');
    let util = require('util');
    let swparse = require('../../scriptedwriting');
    
    let txt = fs.readFileSync(__dirname + '/simple.txt', {encoding:'utf8'});
    let result = swparse(txt, 'sample');

    console.log(util.inspect(result, {depth:10}));


[sample/scriptedwriting/simple.js](# "save")


## Tests

This is where we develop the tests to run. We have a separate setup script
that puts source and compiled versions of cases in the test folder. We run
through each and make sure the generated objects are the same. 

    const f = require('../index.js');
    const ext = '.pfp';
    const tap = require('tap');
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
            readFile(src + fname + ext, {encoding:'utf8'}).then(
                async txt => await f(txt, fname, {
                    origin: src + fname + ext
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

    const f = require('./index.js');
    const ext = '.pfp';

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

[scriptedwriting/maketests.js](# "save:")

[main]()

    try {
        const {stdout, stderr} = await exec(
            'rsync -av ../../tests/src/*.pfp tests/src/'
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

    const srcfiles = (await readdir(src)).
        filter( file => (path.extname(file) === ext) ).
        map( file =>  path.basename(file, ext) );


We read in the source file and the json file (json may not exist --> return null)
If it does not exist, then we create a test file for it and later it gets a
json saved for it. 


    const results = await Promise.all(srcfiles.map( async (fname) => {
        let jsons = await Promise.all( [
            readFile(src + fname + ext, {encoding:'utf8'}).then(
                async txt => { return await f(txt, fname, {
                origin: src + fname + ext}); }
            ),
            readFile(out + fname + '.json', {encoding:'utf8'}).then( 
                txt => JSON.parse(txt)
            ).catch(e => {
                return null;
            })
        ]);
        if (  jsons[1] === null) {
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

## Readme

    # Scripted Writing

    This is the scripted writing component for pieceful programming. The usual
    require of this module returns a function that expects the text to parse,
    a prefix string, and includes an optional argument that can put anything
    one likes in the scope for all the blocks and directives. 

    It will output a JSON object with directives and a web of nodes, each
    node being labeled with a name and having a scope and code object. The
    code objects have code, start, end, and lang properties. 

    ## The format
    
    Between the lines of `--- `, we have a block of code. It gets added asa
    code block and so the typical pieceful flow is to process the
    underscore-quote parts, subbing in. There is no raw text given. 

    Each block is created by a separator `--- ` where the space after the
    three dashes is critical for indicating a separation. That is, `---` will
    be considered just a part of the current code context. To have a heading
    like object but without it being a heading use `---\ ` This is the only
    escape that is done. More slashses in that configuration get reduced by
    one. 
    
    After the dashes
    can go a name. It can be of the form `prefix::name1/lv2/lv3:minor.ext`
    where pretty much all of that is optional, with prefix and name1 being
    filled in if missing and .ext being a separate thing; to include an
    extension in the name, put an extra period at the end. 

    After the name, we can have option pipe transformations. These get stored
    as 'rawTransformations' in the JSON object and pieceful flow should
    transform the code according to all that before reporting the code as done. 

    Then we can include a directive with the syntax `:=> dirname args` 
    
    ## Options object

    While most keys in the options object will go into scope, a few are
    special: 

    * `firstName` is the name of the first block. It is `abstract` by default
    * `current` is `[1,1,0]` which tells how to start counting the lines and
      positions. Not sure why it would need to be different, but maybe some
      useful offset. 
    * `getText` this takes in the text, start, and end, and slices it,
      returning the code piece. It trims the ends. It also does the escaping
      of heading like dashes with slashes. A different function can be passed
      into to do something different to the code blocks. 


            
[scriptedwriting/readme.md](# "save:")

