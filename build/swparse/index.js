let sw;
{
sw = function scriptedwriting (text='', {
    prefix = '',
    firstName = 'abstract',
    current = [1,1, 0]
} = {}) {
    let ret = {};
    let lines = [];
    let scope = {
        prefix,
        lv1 : prefix + '::' + firstName,
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
        if (text[ind] === '\n') {
            if (text.slice(ind+1, ind+5) === '--- ') {
                current = [current[0]+1, 1, ind+1];
                lines.push(current.slice());
                let end = current.slice();
                piece.code.push([text.slice(start[2], end[2]).trim(), start, end]);
                
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
                        ind +=1;
                        current = [current[0], current[1] + ind - current[2], ind];
                        transStart = current.slice();
                    } else if (text.slice(ind, ind+3) === ':=>') {
                        ind -=1;
                        if (!transStart) {
                            name = text.slice(nameStart, ind).trim().toLowerCase();
                            transStart = current.slice();
                        } 
                        current = [current[0], current[1] + ind - current[2], ind];
                        transEnd = current.slice();
                        transform = [
                            transStart, 
                            text.slice(transStart[2], transEnd[2]+1).trim()
                        ];
                        ind +=1+3; //get past :=>
                        current = [current[0], current[1] + ind - current[2], ind];
                        direStart = current.slice();
                        ind -=1;
                    } else if (text[ind] === '\n' || ind >= text.length) {
                        current = [current[0], current[1] + ind - current[2], ind];
                        if (!transStart) {
                            name = text.slice(nameStart, ind).trim().toLowerCase();
                            transStart = current.slice();
                            current = [current[0], current[1] + ind - current[2], ind];
                            transEnd = current.slice();
                            transform = [
                                transStart, 
                                text.slice(transStart[2], transEnd[2]+1).trim()
                            ];
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
                        }
                        ind +=1; //now pointing to newline
                        break;
                    } else {
                        console.log('should not be here: loop through heading swparse');
                    }
                }
                current = [current[0]+1, 1, ind+1];
                lines.push(current.slice());
                start = current.slice();
                
                let fullname = scope.fullname;
                    
                if (name ) {
                    if (has(web, fullname) ) {
                        piece = web[fullname];
                        scope = web.scope;
                        scope.sourcepos.push(start);
                    } else {
                        piece = web[fullname] = {
                            code:[], 
                            scope : Object.assign({ sourcepos: [start]}, scope)
                        };
                    }
                } else {
                    piece = {
                        scope : Object.assign({ sourcepos: [start]}, scope),
                        code:[]
                    };
                }
                
                if (transform[1]) {
                    if (has(piece,'rawTransform') ) {
                        piece.rawTransform.push(transform);
                    } else {
                        piece.rawTransform = [transform];
                    }
                }
                
                if (directive[0]) {
                    directives.push(directive);
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
    piece.code.push([text.slice(start[2], ind), start, current.slice()]);
    return ret; 

};
}

module.exports = sw;
