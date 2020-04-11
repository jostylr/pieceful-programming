let sw;

{
    const has = function (obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    };
    sw = async function scriptedwriting (text, prefix, options) {
        let scope = Object.assign({ 
            firstName : 'abstract',
            current : [1,1, 0],
            getText : function getText (text, start, end) {
                return text.
                    slice(start, end).
                    replace(/\n---\\ /g, '\n--- ').
                    trim();
            }
        }, options); 
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
                    current = [current[0]+1, 1, ind+1];
                    lines.push(current.slice());
                    let end = current.slice();
                    piece.code.push( {code: getText(text, start[2], end[2]),  start, end, lang});
                    
                    ind += 5; 
                    
                    let name, transform, directive;
                    current = [current[0], current[1] + ind - current[2], ind];
                    let nameStart = current.slice()[2]; // only need it for slicing; no tracking
                    let transStart, transEnd, direStart, direEnd;
                    ind -= 1;
                    while (ind < len) {
                        ind += 1;
                        if ( (!transStart ) && (text[ind] === '|') ) {
                            name = text.slice(nameStart, ind).trim().toLowerCase();
                            let perind = name.lastIndexOf('.');
                            if (perind !== -1) {
                                lang = name.slice(perind+1);
                                name = name.slice(0, perind);
                            } else {
                                lang = '';
                            }
                            ind +=1;
                            current = [current[0], current[1] + ind - current[2], ind];
                            transStart = current.slice();
                        } else if (text.slice(ind, ind+3) === ':=>') {
                            ind -=1;
                            if (!transStart) {
                                name = text.slice(nameStart, ind).trim().toLowerCase();
                                let perind = name.lastIndexOf('.');
                                if (perind !== -1) {
                                    lang = name.slice(perind+1);
                                    name = name.slice(0, perind);
                                } else {
                                    lang = '';
                                }
                            } 
                            current = [current[0], current[1] + ind - current[2], ind];
                            transEnd = current.slice();
                            if (transStart) {
                                transform = [
                                    transStart, 
                                    text.slice(transStart[2], transEnd[2]+1).trim()
                                ];
                            } else {
                                transStart = transEnd; 
                            }
                            ind +=1+3; //get past :=>
                            current = [current[0], current[1] + ind - current[2], ind];
                            direStart = current.slice();
                            ind -=1;
                        } else if (text[ind] === '\n' || ind >= text.length) {
                            current = [current[0], current[1] + ind - current[2], ind];
                            if (!transStart) {
                                name = text.slice(nameStart, ind).trim().toLowerCase();
                                let perind = name.lastIndexOf('.');
                                if (perind !== -1) {
                                    lang = name.slice(perind+1);
                                    name = name.slice(0, perind);
                                } else {
                                    lang = '';
                                }
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
                            } 
                            if (directive[0]) {
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
                            }
                            ind +=1; //now pointing to newline
                            break;
                        }
                    }
                    current = [current[0]+1, 1, ind+1];
                    lines.push(current.slice());
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
                    if (directive[0]) {
                        directive[0].scope = Object.assign({}, directive[0].scope,
                            {start:directive[1], end:directive[2]});
                        directives.push(directive[0]);
                    }
                    continue;
                } else {
                    current = [current[0]+1, 1, ind+1];
                    lines.push(current.slice());
                }
            }
            ind +=1;
        }
        current[1] = 1+ ind - current[2]; //get column
        piece.code.push( {code: getText(text, start[2], ind), start, end:current.slice(), lang});
        return ret; 
    
    };
}

module.exports = sw;
