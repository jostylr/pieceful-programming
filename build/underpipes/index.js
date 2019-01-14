let par = '('; let cpar = ')';
let bra = '{'; let cbra = '}';
let squ = '['; let csqu = ']';

let defTypeFirst = {
    "'" : function rawQuote (p, terminator) {
        let value;
        let start = p.ind;
        let end = p.text.indexOf("'", p.ind);
        if (end === -1) {
            end = text.length-1;
            value =  p.text.slice(p.ind);
            let info = {start: p.f.ln(start), end : p.f.ln(end), value};
            p.f.tracker('unterminated quote', info);
            throw new Error('unterminated quoted:' + info.start + ':' +
                value +'\n---\n' + p.text);
        }
        value = text.slice(p.ind, end);
        p.ind = end+1;
        return {
            start: p.f.ln(start),
            end: p.f.ln(end),
            value 
        };
    },
    '"' : function parseBackSlash (p, terminator) {
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
                    value = eval('"' + p.text.slice(p.ind,reg.lastIndex) + '"');
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
                throw new Error('unterminated quoted:' + info.start + ':' +
                    value +'\n---\n' + p.text);
            }
        }
        throw new Error('internal error at parseBackSlash; unreachable point reached');
    },
    '`' : function parseBackTick (p, terminator) {
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
                    args = [p.text.slice(p.ind, reg.lastIndex-1)];
                    p.ind = reg.lastIndex;
                    return {
                        start: p.f.ln(start),
                        end: p.f.ln(end),
                        cmd, bind, args
                    };
                }
            } else { //no matching quote
                end = len;
                value = p.text.slice(p.ind);
                let info = {start: p.f.ln(start), end : p.f.ln(end), value};
                p.f.tracker('unterminated quote', info);
                throw new Error('unterminated quoted:' + info.start + ':' +
                    value +'\n---\n' + p.text);
            }
        }
        throw new Error('internal error at parseBackSlash; unreachable point reached');
    },
    '\u005f' : function parseGet (p, terminator) {
        let end = p.f.findFirst(p, '|' + terminator)[1];
        let name = p.text.slice(p.ind,end);
        let piece = p.f.makeGet(name, p.ind, end-1);
        p.ind = end;
        return piece;
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
            first = p.f.norm(p.text.slice(start, first[1]));
        } else {
            first = 'js:eval';
        }
        
        let args = p.f.textArgs(p, terminator);
        let bind;
        if (!args[0]) {
            bind = 1; // no explicit math text so from pipe
            args.shift();
        } else {
            bind = 2;
        }
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
    '[' : function parseArray (p, terminator) {
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
    '{' : function parseObject (p, terminator) {
        let start = p.ind-1;
        let cmd = 'obj';
        let args = p.f.parseArgs(p, cbra);
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
        let text = p.text.slice(start, end).trim();
        p.ind = end+1;
        let cmd, args;
        if (!text) {
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
}
const toTerminator = function toTerminator (p, mode, terminator) {
    let len = p.text.length;
    if (p.ind >= len) {
        return {terminate:true};
    }
    let origInd = p.ind;
    let ln = p.f.ln;
    let reg = /\s*/g;
    reg.lastIndex = p.ind;
    let match = reg.exec(text);
    p.ind = reg.lastIndex;
    let first = p.text[p.ind];
    if (terminator.indexOf(first) !== -1) {
        return { terminate : true };
    }
    let typed, piece, start = p.ind;
    if (typeFirst.hasOwnProperty(first) ) {
        p.ind = p.ind+1;
        piece = typeFirst[first](p, terminator);
    } else {
        let paren = findFirst(p, par + terminator);
        if (paren[0] === par ) {
            piece =  typeFirst['!'](p, terminator);
        } else {
            piece = typeFirst[plainText[mode]](p, terminator);
        }
    }
    let nxt = findFirst(p, '|', terminator);
    p.ind = nxt[1];
    if (nxt[0] === '|') {
        if (mode !== 'pipe') {
            let args = [piece];
            piece = {cmd: 'pipe', args};
            let go = true;
            while (go) {
               let further = toTerminator(p, 'pipe', terminator);
               if (further.terminate) { go = false;}
               if (p.ind >= len) { go = false;}
               if (further.cmd || further.values) {args.push(further);}
            }
            piece.start = ln(start);
            piece.end = ln(p.ind-1);
            piece.terminate = true;
        } 
    } else {
       piece.terminate = true;
    }
    return piece;
}
const normalizeString = function normalizeString (str) {
    return str.trim().toLowerCase();
}
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
                return linees[0] +cs + col;
            } else {
                return lines[line-ls] + col;
            }
        } else if (typeof target === 'number') { 
            let target = data;
            let min = 0;
            let max = lines.length;
            let guess = (min + max);
            guess = (guess + (guess % 2) )/2
            while ( (max - min) > 1 ) {
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
}
module.exports = function cta ({
    type = 'code',
    text = '', 
    tracker = (note, data) => {console.log("UP/" + note, data)}, 
    start = [1,1,0],
    ind = 0,
    u = '\u005f',
    q = /'"`/,
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
    let p = {text, tracker, ind, q, u, 
        begin : ind,
        f : {typeFirst, checkParen, toTerminator, 
            norm:normalizeString}
    };
    Object.assign(p.f,f); // a way to override most of the parsing stuff 
    if (!p.f.hasOwnProperty('ln') ) {
        p.f.ln = lineNumberingFactory(text, start);
    }
    let parsed, ret;
    if (type === 'code') {
        tracker("parsing code block", {text, start});
        let len = text.length;
        let pieces = [];
        while (ind < text.length) {
            let quote;
            ind = text.indexOf(p.u, ind);
            if (ind === -1) { break; }
            if (p.q.test(text[ind+1])) {ind += 1; continue;}
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
                    let txt = text.slice(begin,backind) + prefix + p.u + quote;
                    ind +=2;
                    pieces.push({
                        start : ln(begin),
                        end : ln(ind-1),
                        value : txt
                    });
                    continue;
                }
            }
            let prevText = text.slice(begin, ind)
            if (prevText) {
                pieces.push( {
                    start : ln(begin),
                    end : ln(ind-1),
                    value : prevText
                });
            }
            p.ind = ind + 2;
            
            let further = toTerminator(p, 'code', quote);
            pieces.push(further);
            begin = ind = p.ind;
        }
        ind = len;
        let prevText = text.slice(begin, ind)
        if (prevText) {
            pieces.push( {
                start : ln(begin),
                end : ln(ind-1),
                value : prevText
            });
        }
        ret = pieces;
        tracker("code block parsed", ret);
    } else if (type === 'transform') {
        tracker('transform about to be parsed', {text, start});
        parsed = toTerminator(p, 'pipe', '');
        ret = {
            start,
            end: ln(p.ind-1),
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
