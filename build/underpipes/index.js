/* eslint-disable no-console */
let par = '('; let cpar = ')';
let bra = '{'; let cbra = '}'; //eslint-disable-line no-unused-vars
let squ = '['; let csqu = ']'; //eslint-disable-line no-unused-vars

let defTypeFirst = {
    "'" : function rawQuote (p) {
        let value;
        let start = p.ind;
        let end = p.text.indexOf("'", p.ind);
        if (end === -1) {
            end = p.text.length-1;
            value =  p.text.slice(p.ind);
            let info = {start: p.f.ln(start), end : p.f.ln(end), value};
            p.f.tracker('unterminated quote', info);
            throw new Error('unterminated quoted:' + info.start + ':' + value);
        }
        value = p.text.slice(p.ind, end);
        p.ind = end+1;
        return {
            start: p.f.ln(start),
            end: p.f.ln(end),
            value 
        };
    },
    '"' : function parseBackSlash (p) {
        let start = p.ind;
        let end, value; 
        let reg = /[\\]*"/g;
        reg.lastIndex = p.ind;
        let len = p.text.length;
        while (reg.lastIndex < len) {
            let match = reg.exec(p.text);
            if (match) {
                if ( (match[0].length % 2) === 0 ) { //escaped
                    continue;
                } else { // quote found
                    end = reg.lastIndex-1;
                    value = eval('"' + p.text.slice(p.ind,reg.lastIndex));
                    p.ind = reg.lastIndex;
                    return {
                        start: p.f.ln(start),
                        end: p.f.ln(end),
                        value 
                    };
                }
            } else { //no matching quote
                end = len;
                value = p.text.slice(p.ind);
                let info = {start: p.f.ln(start), end : p.f.ln(end), value};
                p.f.tracker('unterminated quote', info);
                throw new Error('unterminated quoted:' + info.start + ':' + value);
            }
        }
        throw new Error('internal error at parseBackSlash; unreachable point reached');
    },
    '`' : function parseBackTick (p) {
        let start = p.ind;
        let end, args;
        let cmd = 'backtick';
        let bind = 1;
        let reg = /[\\]*`/g;
        reg.lastIndex = p.ind;
        let len = p.text.length;
        while (reg.lastIndex < len) {
            let match = reg.exec(p.text);
            if (match) {
                if ( (match[0].length % 2) === 0 ) { //escaped
                    continue;
                } else { // quote found
                    end = reg.lastIndex-1;
                    args = [{value:p.text.slice(p.ind, reg.lastIndex-1)}];
                    p.ind = reg.lastIndex;
                    return {
                        start: p.f.ln(start),
                        end: p.f.ln(end),
                        cmd, bind, args
                    };
                }
            } else { //no matching quote
                end = len;
                let value = p.text.slice(p.ind);
                let info = {start: p.f.ln(start), end : p.f.ln(end), value};
                p.f.tracker('unterminated quote', info);
                throw new Error('unterminated quoted:' + info.start + ':' + value);
            }
        }
        throw new Error('internal error at parseBackSlash; unreachable point reached');
    },
    '\u005f' : function parseGet (p, terminator) {
        let start = p.ind;
        if (p.q.test(p.text[p.ind])) {
            let quote = p.text[p.ind];
            p.ind += 1 ;
            let piece = p.f.toTerminator(p, 'code', quote); 
            return piece;
        }
        p.ind = p.f.findFirst(p, '|' + terminator)[1];
        let args = [{value: p.f.norm(p.text.slice(start, p.ind))}];
        let cmd = 'get';
        let bind = true;
        let end = p.ind-1;
        return {
            start: p.f.ln(start),
            end: p.f.ln(end),
            cmd, bind, args
        };
    },
    '!' : function parseCmd (p, terminator) {
        let cmd, bind;
        let start = p.ind;
        let args = p.f.textArgs(p, terminator);
        let cmdName = args.shift();
        if (!cmdName) {
            cmd = 'call';
        } else if (cmdName.hasOwnProperty('value') ) {
            cmd = cmdName.value;
        } else {
            cmd = 'call';
            args.unshift(cmdName);
            bind = 1;
        }
    
        let end = p.ind-1;
        if (bind) {
            return {
                start: p.f.ln(start),
                end: p.f.ln(end),
                cmd, bind, args
            };
        } else {
            return {
                start: p.f.ln(start),
                end: p.f.ln(end),
                cmd, args
            };
        }
    }        ,
    '~' : function parseEval (p, terminator) {
        let bind;
        let start = p.ind;
        let cmd = 'eval';
        let args = p.f.textArgs(p, terminator);
        if (args[0]) {
            bind = 1;
        } else {
            args.shift();
        }
        
        let end = p.ind-1;
        if (bind) {
            return {
                start: p.f.ln(start),
                end: p.f.ln(end),
                cmd, bind, args
            };
        } else {
            return {
                start: p.f.ln(start),
                end: p.f.ln(end),
                cmd, args
            };
        }
    }    ,
    '#' : function parseNumber (p, terminator) {
        const start = p.ind;
        const cmd = 'math';
        let first = p.f.findFirst(p, '#' + terminator);
        if (first[0] === '#') {
            p.ind = first[1] + 1; // past the hash
            first = {value : p.f.norm(p.text.slice(start, first[1]))};
        } else {
            first = {value: 'js:eval'};
        }
        
        let args = p.f.textArgs(p, terminator);
        let bind;
        if (!args[0]) {
            bind = 1; // no explicit math text so from pipe
            args.shift(); // get rid of null
        } else {
            bind = 2;
        }
        args.unshift(first); //add the type
        let end = p.ind-1;
        return {
            start: p.f.ln(start),
            end: p.f.ln(end),
            cmd, bind, args
        };
    },
    '?' : function parseBoolean (p, terminator) {
        let start = p.ind-1;
        let cmd = 'bool';
        let args = p.f.textArgs(p, terminator);
        let bind = 2;
        let end = p.ind-1;
        return {
            start: p.f.ln(start),
            end: p.f.ln(end),
            cmd, bind, args
        };
    },
    '=' : function parseOperator (p, terminator) {
        let start = p.ind-1;
        let cmd = 'op';
        let first = p.f.firstFind(p, '=' + terminator);
        let op, bind, args;
        if (first[0] === '=') {
            op = p.text.slice(p.ind, first[1]).trim();
            p.ind = first[1];
            bind = 2;
            args = p.f.textArgs(p, terminator);
            if (!args[0]) {
                args.shift(); 
                bind = 1; // nothing after equals after all
            }
            args.unshift(op);
        } else { 
            args = p.f.textArgs(p, terminator);
            bind = 1;
            if (!args[0]) {
                args.shift();
                bind = 0; //maybe operator is incoming
            }
        }
        let end = p.ind-1;
        return {
            start: p.f.ln(start),
            end: p.f.ln(end),
            cmd, bind, args
        };
    },
    '[' : function parseArray (p) {
        let start = p.ind-1;
        let cmd = 'arr';
        let args = p.f.parseArgs(p, csqu);
        let end = p.ind-1;
        return {
            start: p.f.ln(start),
            end: p.f.ln(end),
            cmd, args
        };
    }, //]
    '{' : function parseObject (p) {
        let start = p.ind-1;
        let cmd = 'obj';
        let key;
        const pre = function (p) {
            key = p.f.toTerminator(p, 'args', ':,' + cbra);
            if (key.terminate !== ':') {
                p.ind -= 1;                 
            } 
            delete key.terminate;
        };
        const post = function(val) {
            let term = val.terminate;
            delete val.terminate;
            let ret = {
                cmd : 'kv',
                args : [ key, val ]
            };
            if (term) {
                ret.terminate = term;
            }
            return ret;
        };
        let args = p.f.parseArgs(p, cbra, pre, post);
        let end = p.ind-1;
        return {
            start: p.f.ln(start),
            end: p.f.ln(end),
            cmd, args
        };
    }, //}
    '-' : function parseDash (p, terminator) {
        let start = p.ind-1;
        let cmd = 'dash';
        let bind = 1;
        let args = p.f.textArgs(p, terminator);
        let end = p.ind-1;
        return {
            start: p.f.ln(start),
            end: p.f.ln(end),
            cmd, bind, args
        };
    }, 
    '.' : function parseDot (p,terminator) {
        let start = p.ind-1;
        let args = p.f.textArgs(p, terminator);
        let end = p.ind-1;
        let cmd, bind;
        if (args[0]) {
            cmd = 'methodCall';
            bind = 1;
            return {
                start: p.f.ln(start),
                end: p.f.ln(end),
                cmd, bind, args
            };
        } else {
            args.shift();
            cmd = 'propertyAccess';
            return {
                start: p.f.ln(start),
                end: p.f.ln(end),
                cmd, args
            };
        }
    },
    '/' : function parseComment (p, terminator) {
        const start = p.ind-1;
        const cmd = 'comment';
        let slash = p.f.findFirst(p, '/'); //there must be a second slash
        let type = p.text.slice(p.ind, slash[1]);
        if (!type) { type = 'js-inline'; }
        p.ind = slash[1]+1;
        let args = p.f.textArgs(p, terminator);
        let bind;
        let end = p.ind-1;
        if (!args[0]) { 
            args.shift(); 
            bind = 1; // no text after slashes so assume incoming
        } else {
            bind = 2; //there is text; incoming can go in extra arguments if needed
        }
        args.unshift(type);
        return {
            start: p.f.ln(start),
            end: p.f.ln(end),
            cmd, bind, args
        };
    },
    '@' : function atParse (p, terminator) {
        let start = p.ind;
        let end = p.f.findFirst(p, terminator)[1]-1;
        let text = {value:p.f.norm(p.text.slice(start, end))};
        p.ind = end+1;
        let cmd, args;
        if (!text.value) {
            cmd = 'pipeInput';
            args = [];
        } else if (text[0].search(/^[!0-9^]/) !== -1 ) {
            cmd = 'pipeInput';
            args = [text];
        } else {
            cmd = 'getScope';
            args = [text];
        }
        return {
            start: p.f.ln(start),
            end: p.f.ln(end),
            cmd, args
        };
    },
    '^' : function eqParse (p, terminator) {
        let start = p.ind-1;
        let args = p.f.textArgs(p, terminator);
        let end = p.ind-1;
        let cmd = 'storeScope';
        let bind = 1; // input is the second argument
        return {
            start: p.f.ln(start),
            end: p.f.ln(end),
            cmd, bind, args
        };
    }
};
const toTerminator = function toTerminator (p, mode, terminator) {
    let typeFirst = p.f.typeFirst;
    let len = p.text.length;
    if (p.ind >= len) {
        return {terminate:true};
    }
    let ln = p.f.ln;
    let reg = /\s*/g;
    reg.lastIndex = p.ind;
    reg.exec(p.text); //just advances past whitespace
    p.ind = reg.lastIndex;
    let first = p.text[p.ind];
    if (terminator.indexOf(first) !== -1) {
        p.ind += 1;
        return { terminate : (first || true) };
    }
    let piece, start = p.ind;
    if (typeFirst.hasOwnProperty(first) ) {
        p.ind += 1;
        piece = typeFirst[first](p, terminator);
    } else {
        let paren = p.f.findFirst(p, par + '|' + terminator);
        if (paren[0] === par ) {
            piece =  typeFirst['!'](p, terminator);
        } else {
            if (mode === 'args') {  
                let start = p.ind;
                p.ind = p.f.findFirst(p, terminator)[1];
                piece = {
                    start : p.f.ln(start),
                    end : p.f.ln(p.ind-1),
                    value : p.text.slice(start, p.ind).trim(),
                };
            } else {
                piece = typeFirst[p.f.plainText[mode]](p, terminator);
            }
        }
    }
    let nxt = p.f.findFirst(p, '|'+terminator);
    p.ind = nxt[1]+1;
    if (nxt[0] === '|') {
        if (mode !== 'pipe') {
            let args = [piece];
            piece = {cmd: 'pipe', args};
            piece.terminate = true; //likely to be replaced if proper
            let go = true;
            while (go) {
                let further = toTerminator(p, 'pipe', terminator);
                if (further.terminate) { 
                    go = false;
                    piece.terminate = further.terminate;
                    delete further.terminate; //not generally needed
                }
                if (p.ind >= len) { go = false;}
                if (further.cmd || further.values) {args.push(further);}
            }
            piece.start = ln(start);
            piece.end = ln(p.ind-1);
        } 
    } else {
        piece.terminate = nxt[0] || true;
    }
    return piece;
};
const normalizeString = function normalizeString (str) {
    return str.trim().toLowerCase();
};
const lineNumberFactory = function (text,[ls, cs, ps]) {
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
   
    return function genLineNumber (data) { 
        if (Array.isArray(data)) {
            let [line, col] = data;
            if (line === ls) {
                return lines[0] +cs + col;
            } else {
                return lines[line-ls] + col;
            }
        } else if (typeof data === 'number') { 
            let target = data;
            let min = 0;
            let max = lines.length;
            while ( (max - min) > 1 ) {
                let guess = (min + max);
                guess = (guess + (guess % 2) )/2;
                if (lines[guess] === target) {
                    min = guess;
                    break;
                } else if (lines[guess] < target) {
                    min = guess;
                } else {
                    max = guess;
                }
            }
            let line = min+ls;
            let col = (target - lines[min] ) +
                ( (line===ls) ? cs : 1 );
            return [line, col, ps + data];
        }
    };
};
const parseArgs = function (p, close, pre, post) {
    const len = p.text.length;
    const term = ',' + close;
    let args = [];
    while (p.ind < len) {
        if (pre) {pre(p);}
        let piece = toTerminator(p, 'args', term);
        if  (piece) {
            if (post) { piece = post(piece);}
            if  (piece.hasOwnProperty('value') || piece.hasOwnProperty('cmd') ) {
                args.push(piece);
            }
            let terminate = piece.terminate;
            delete piece.terminate;
            if (terminate === close) {
                break;
            }
        } else {
            //should never happen
            throw new Error('undefined piece:' + p.text.slice(p.ind) +
                p.ind);
        }
    }
    return args;
};
const textArgs = function textArgs (p, terminator) {
    terminator = terminator + '|';
    let args, firstArg;
    let start = p.ind;
    while (/\s/.test(p.text[p.ind]) ) {
        p.ind += 1;
    }

    let first = p.text[p.ind];
    if (p.q.test(first) ) {
        let qEnd = p.text.indexOf(first, p.ind+1);
        if (qEnd !== -1) {
            firstArg = {value: p.text.slice(p.ind+1, qEnd)};
            p.ind = p.f.findFirst(p, par+terminator, qEnd)[1];
        } else {
            let end = p.text.length;
            let value = p.text.slice(start);
            let info = {start: p.f.ln(start), end : p.f.ln(end), value};
            p.f.tracker('unterminated quote', info);
            throw new Error('unterminated quoted:' + info.start + ':' + value);
        }
    } else if (first === p.u) {
        let quote = p.text[p.ind+1];
        if (p.q.test(quote)) {
            p.ind +=2;
            firstArg = p.f.toTerminator(p, 'code', quote); 
        } else {
            let uEnd = p.f.findFirst(p, par + terminator)[1];
            firstArg = {
                cmd: 'get', 
                args : [ {value: p.f.norm(p.text.slice(p.ind+1, uEnd))}]
            };
            p.ind = uEnd; //on parentheses or terminator
        }
    } else {
        let tEnd = p.f.findFirst(p, par + terminator)[1];
        if (tEnd === p.ind) {  // no text
            firstArg = null;
        } else {
            firstArg = {value : p.text.slice(p.ind, tEnd).trim()};
        }
        p.ind = tEnd;
    }


    if (firstArg) {
        firstArg.start = p.f.ln(start);
        firstArg.end = p.f.ln(p.ind-1);
    }
    if (p.text[p.ind] === par) {
        p.ind += 1;
        args = p.f.parseArgs(p, cpar);
        args.unshift(firstArg);
    } else {
        args = [firstArg];
    }


    return args;
    

};
const plainText = {
    'code' : "\u005f",
    'pipe' : "!"
};
const findFirst = function findFirst (p, chars, ind) {
    ind = ind || p.ind;
    let len = p.text.length;
    while (ind < len) {
        if (chars.indexOf(p.text[ind]) !== -1) {
            return [p.text[ind], ind];
        } else {
            ind += 1;
        }
    }
    return [null, ind];
};
module.exports = function cta ({
    type = 'code',
    text = '', 
    //eslint-disable-next-line no-console
    tracker = (note, data) => {console.log("UP/" + note, data);}, 
    start = [1,1,0],
    ind = 0,
    u = '\u005f',
    q = /['"`]/,
    typeFirst = {}, 
    f = {} 
}) {
    Object.keys(defTypeFirst).forEach( (key) => {
        if (typeFirst.hasOwnProperty(key) ) {
            if (typeof typeFirst[key] !== 'function' ) {
                delete typeFirst[key];
            }
        } else {
            typeFirst[key] = defTypeFirst[key];
        }
    });
    let p = {text, ind, q, u, 
        begin : ind,
        f : {typeFirst, toTerminator, findFirst, tracker, parseArgs, 
            norm:normalizeString, textArgs, plainText}
    };
    Object.assign(p.f,f); // a way to override most of the parsing stuff 
    if (!p.f.hasOwnProperty('ln') ) {
        p.f.ln = lineNumberFactory(text, start);
    }
    let parsed, ret;
    if (type === 'code') {
        tracker("parsing code block", {text, start});
        let len = text.length;
        let pieces = [];
        let begin = ind;
        while (ind < text.length) {
            let quote;
            ind = text.indexOf(p.u, ind);
            if (ind === -1) { break; }
            if (!p.q.test(text[ind+1])) {ind += 1; continue;}
            quote = text[ind+1];
            {
                let backind = ind-1;
                let num = '';
                let escape = false;
                while (backind >= 0) {
                    let char = text[backind];
                    if (char === '\u005c') { //backslash
                        escape = true; 
                        break;
                    } else if (char.match(/\d/)) {
                        num = char + num; // index is going down
                        ind -= 1;
                        continue;
                    } else {
                        break;
                    }
                }
                if (escape) {
                    let prefix;
                    num = parseInt(num, 10);
                    if (num > 1) {
                        num = num -1;
                        prefix = '\u005c' + num; //backslash
                    } else if (num === 1) {
                        prefix = '\u005c';
                    } else {
                        prefix = '';
                    }
                    let txt = p.text.slice(begin,backind) + prefix + p.u + quote;
                    ind +=2;
                    pieces.push({
                        start : p.f.ln(begin),
                        end : p.f.ln(ind-1),
                        value : txt
                    });
                    continue;
                }
            }
            let prevText = p.text.slice(begin, ind);
            if (prevText) {
                pieces.push( {
                    start : p.f.ln(begin),
                    end : p.f.ln(ind-1),
                    value : prevText
                });
            }
            p.ind = ind + 2;
            let further = toTerminator(p, 'code', quote);
            delete further.terminate;
            pieces.push(further);
            begin = ind = p.ind;
        }
        ind = len;
        if (begin < text.length) {  
            let prevText = p.text.slice(begin, ind);
            if (prevText) {
                pieces.push( {
                    start : p.f.ln(begin),
                    end : p.f.ln(ind-1),
                    value : prevText
                });
            }
        }
        ret = pieces;
        tracker("code block parsed", ret);
    } else if (type === 'transform') {
        tracker('transform about to be parsed', {text, start});
        parsed = toTerminator(p, 'pipe', '');
        ret = {
            start,
            end: p.f.ln(p.ind-1),
            cmd : ['pipe'],
            args : parsed.cmds
        };
        tracker('transform parsed', ret);
    } else if (type === 'args') {
        tracker('args about to be parsed', {text, start});
        let len = p.text.length;
        let args = [];
        while (p.ind < len) {
            let piece = toTerminator(p, 'args', ',');
            if (piece.hasOwnProperty('value') || piece.hasOwnProperty('cmd') ) {
                args.push(piece);
            }
        }
        tracker('args parsed', args);
        ret = args;
    } else {
        tracker('unrecognized type of parsing', {type, text, start});
        throw new Error('unrecognized type for parsing:' + type);
    }
    return ret;
};
