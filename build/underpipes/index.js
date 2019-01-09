let defTypeFirst = {
    "'" : function rawQuote (p, terminator) {
        let end = p.text.indexOf("'", p.ind);
        let ln = p.f.ln;
        if (end === -1) {
            let ret = {
                start: ln(p.ind),
                end: ln(p.text.length),
                text: p.text.slice(p.ind)
            };
            p.tracker('unterminated quote', ret );
            throw new Error('unterminated quote', ret);
        }
        let quote = text.slice(p.ind, end);
        cmd = [first, quote];
        ret = {
            start : ln(p.ind),
            end: ln(end),
            text : p.text.slice(p.ind, end) //end is on quote
        };
        p.ind = end+1;
        return ret;
    },
    '"' : function parseBackSlash (p, terminator) {
        let ret;
        let ln = p.f.ln;
        let reg = /[\\]*"/g;
        reg.lastIndex = p.ind;
        let len = p.text.length;
        while (reg.lastIndex < len) {
            let match = reg.exec(p.text);
            if (match) {
                if ( (match[0].length % 2) === 0 ) { //escaped
                    continue;
                } else { // quote found
                    ret = {
                        start: ln(p.ind),
                        end : ln(reg.lastIndex-1),
                        text : eval('"' + text.slice(p.ind,reg.lastIndex) + '"')
                    };
                    p.ind = reg.lastIndex;
                    return ret;
                }
            } else {
                ret = {
                    start: ln(p.ind),
                    end: ln(end),
                    text: p.text.slice(p.ind)
                };
                p.tracker('unterminated quote', ret );
                throw new Error('unterminated quote', ret);
            }
        }
        throw new Error('internal error at parseBackSlash; unreachable point reached');
    },
    '`' : function parseBackSlash (p, terminator) {
        let ret;
        let ln = p.f.ln;
        let reg = /[\\]*`/g;
        reg.lastIndex = p.ind;
        let len = p.text.length;
        while (reg.lastIndex < len) {
            let match = reg.exec(p.text);
            if (match) {
                if ( (match[0].length % 2) === 0 ) { //escaped
                    continue;
                } else { // quote found
                    ret = {
                        start: ln(p.ind),
                        end : ln(reg.lastIndex-1),
                        cmd: ['backtick', [p.text.slice(p.ind, reg.lastIndex-1)], ln(p.in
                    };
                    p.ind = reg.lastIndex;
                    return ret;
                }
            } else {
                ret = {
                    start: ln(p.ind),
                    end: ln(end),
                    text: p.text.slice(p.ind)
                };
                p.tracker('unterminated quote', ret );
                throw new Error('unterminated quote', ret);
            }
        }
        throw new Error('internal error at parseBackSlash; unreachable point reached');
    },
    '\u005f' : ,
    '!' : ,
    '~' : ,
    '#' : ,
    '?' : ,
    '[' : , //]
    '{' : , //}
    '-' : , 
    '.' : ,
    '/', : 
}
const toTerminator = function toTerminator (p, mode, terminator) {
    let len = p.text.length;
    let origInd = p.ind;
    let ln = p.f.ln;
    let reg = /\s*/g;
    reg.lastIndex = p.ind;
    let match = reg.exec(text);
    let p.ind = reg.lastIndex;
    let first = p.text[p.ind];
    if (terminator.indexOf(first) !== -1) {
        return {
            terminate : true,
        };
    }
    let typed, cmd, start = p.ind;
    if (typeFirst.hasOwnProperty(first) ) {
       cmd = typeFirst[first](p, terminator);
    } else {
        let paren = findFirst(p, '(' + terminator));
        if (paren[0] === '(' /*)*/ ) {
            cmd =  typeFirst['!'](p, terminator);
        } else {
            cmd = typeFirst[plainText[mode]])(p, terminator);
        }
    }
    let nxt = findFirst(p, '|', terminator);
    p.ind = nxt[1];
    let term;
    if (nxt[0] === '|') {
        if (mode !== 'pipe') {
            cmd = {name: 'pipe', args:cmd};
            let go = true;
            while (go) {
               let further = toTerminator(p, 'pipe', terminator);
               if (further.terminate) { go = false;}
               if (p.ind >= len) { go = false;}
               if (further.cmd) {cmd.push(cmd);}
            }
            term = true;

        } else {
            term = false; 
        }
    } else {
        term = true
    }
    let ret = {
        terminate : term,
        cmd,
        start : ln(start),
        end : ln(p.ind-1)
    };
    return ret; 
}
module.exports = function cta ({
    type = 'code',
    text = '', 
    tracker = (note, data) => {console.log("UP/" + note, data)}, 
    start = [1,1,0],
    ind = 0,
    u: '\u005f',
    q : '\'"`',
    typeFirst : {}
}) {
    let ln = (function (text,[ls, cs, ps]) {
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
            if (Array.isArray(data) {
                let [line, col] = data;
                return lines[line-ls] + col - (linecs;
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
    })(text, start);
    Object.keys(defTypeFirst).forEach( (key) => {
        if (typeFirst.hasOwnProperty(key) ) {
            if (typeof typeFirst[key] !== 'function' ) {
                delete typeFirst[key];
            }
        } else {
            typeFirst[key] = defTypeFirst[key];
        }
    });
    let p = {text, tracker, ind, begin : ind, q, u, 
        f : {typeFirst, checkParen, toTerminator, ln}};
    let parsed, ret;
    if (type === 'code') {
        tracker("parsing code block", {text, start});
        let len = text.length;
        let pieces = [];
        while (ind < text.length) {
            let quote;
            ind = text.indexOf('\u005', ind);
            if (ind === -1) { break; }
            if (p.q.indexOf(text[ind+1]) === -1) {ind += 1; continue;}
            quote = text[ind+1];
            {
                let backind = ind-1;
                let num = '';
                let escape = false;
                while (backind >= 0) {
                    let char = text[backind];
                    if (char === '\') {
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
                        text : txt
                    });
                    continue;
                }
            }
            let prevText = text.slice(begin, ind)
            if (prevText) {
                pieces.push( {
                    start : ln(begin),
                    end : ln(ind-1),
                    text : prevText
                });
            }
            p.ind = ind + 2;
            
            let further = toTerminator(p, 'code', quote);
            pieces.push( {
                start : ln(ind),
                end : ln(p.ind-1),
                block : further
            });
            begin = ind = p.ind;
        }
        ind = len;
        let prevText = text.slice(begin, ind)
        if (prevText) {
            pieces.push( {
                start : ln(begin),
                end : ln(ind-1),
                text : prevText
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
            cmds : ['pipe', parsed.cmds, parsed.start, parsed.end] 
        };
        tracker('transform parsed', ret);
    } else if (type === 'args') {
        tracker('args about to be parsed', {text, start});
        parsed = toTerminator(p, 'args', '');
        ret = {
            start, 
            end : ln(p.ind-1),
            args : parsed.args
        };
        tracker('args parsed', ret);
    } else {
        tracker('unrecognized type of parsing', {type, text, start});
        throw new Error('unrecognized type for parsing:' + type);
    }
    return ret;
};
