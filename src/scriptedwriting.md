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

    scriptedwriting = function scriptedwriting (text='', {
        prefix = '',
        firstName = 'abstract',
        current = [1,1, 0]
    } = {}) {
        let ret = {};
        let lines = [];
        let scope = {
            prefix,
            lv1 : (prefix ? prefix + '::' : '' ) + firstName,
            lv1only : firstName,
        };
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
        while (ind < len) {
            console.log(ind);
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
        piece.code.push([text.slice(start[2], ind), start, current.slice()]);
        return ret; 

    };


[current update]()

This is the same regardless, but we only want it to happen after closing the
old object.

    current = [current[0]+1, 1, ind+1];
    lines.push(current.slice());

## Module

The separate module part is here.

    let scriptedwriting;
    {
    _"core"
    }

    module.exports = scriptedwriting;

[swparse/index.js](# "save:")

### New Heading

This is where all the magic happens. Once a new heading appears, we need to
close the old object, get/parse the name, get the transform, get the
directive, and start the new object. 

The start variable is the start of the code block. We set piece for the new
piece, storing it in web at the time of its creation. 

If there is no name, then we do not store the node at all, but we still create
a piece to avoid complications; it is just wasted. If there is a
directive, then it becomes a stand-alone added directive. 

    _"file processor:current update"
    _"close old piece"

    ind += 5; 

    let name, transform, directive;
    _"loop through heading"

After looping through the heading, the index points to the end of the heading
line. 

    _"file processor:current update"
    start = current.slice();

    let fullname = scope.fullname;
        
    if (name ) {
        if (web.hasOwnProperty(fullname) ) {
            piece = web[fullname];
            scope = web.scope;
            scope.sourcepos.push(start);
        } else {
            piece = web[fullname] = {
                code:[], 
                rawTransform : [],
                scope : Object.assign({ sourcepos: [start]}, scope)
            };
        }
    } else {
    
No name present.  Directive and transform can link in to previous piece, but
any text of the code essentially gets ignored.

        piece = {
            scope : Object.assign({ sourcepos: [start]}, scope),
            code:[]
        };
    }

    if (transform[1]) {
        web[fullname].rawTransform.push(transform);
    }

    if (directive[0]) {
        directives.push(directive);
    }


### Close old piece

We cut out the body now that we have the end and push it onto code. 

    let end = current.slice();
    piece.code.push([text.slice(start[2], end[2]).trim(), start, end]);


### Loop through heading

We need to get the name, a possible transform (started by a pipe) and/or a
directive started by `:=>`.  

    _":current"
    let nameStart = current.slice()[2]; // only need it for slicing; no tracking
    let transStart, transEnd, direStart, direEnd;
    ind -= 1;
    while (ind < len) {
        ind += 1;
        console.log(text[ind], current, ind);
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
                transStart = current.slice();
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
                transStart = current.slice();
                _":end transform"
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
        } else {
        }
    }

[end name]()

    name = text.slice(nameStart, ind).trim().toLowerCase();

[end transform]()

    _":current"
    transEnd = current.slice();
    transform = [
        transStart, 
        text.slice(transStart[2], transEnd[2]+1).trim()
    ];

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
        scope.lv1  = (prefix ? prefix + '::' : '') + scope.lv1only;
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
            src : scope.fullname,
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
    let swparse = require('../../swparse');
    
    let txt = fs.readFileSync(__dirname + '/simple.txt', {encoding:'utf8'});
    let result = swparse(txt);

    console.log(util.inspect(result, {depth:10}));


[sample/scriptedwriting/simple.js](# "save:")



