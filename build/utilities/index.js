const has = function has (obj, key) {
    return (typeof obj === 'object') && 
        Object.prototype.hasOwnProperty.call(obj, key);
};
const last = (arr => arr[arr.length-1] );
const convertToMap = function (obj, sort = (a,b) => b.length - a.length ) {

    if (typeof obj !== 'object') {
        throw "not convertable to an array map: " + (typeof obj);
    }
    if (Array.isArray(obj) ) {
        return obj;
    } 

    return Object.keys(obj).
        sort(sort).
        map( key => [key, obj[key]] );
};

const makeScanners = function (moreDelimiters ={}) {

    const conreg = (/a/).constructor; //for detecting regex.


    let delimiterCatalog;
    {
        const common =  { 
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
        };
        const javascript = { 
            ...common,
            '//': {
                end: '\n', 
                delimiters : 'none'
            }, 
            '/*' : {
                end: '*/', 
                delimiters : 'none'
            }
        };
        const litproTop = {
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
        };
        const litpro = {
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
        };
        const litproqq = { ...litpro};
        delete litproqq['\u0022'];
        const litproq = { ...litpro};
        delete litproq['\u0027'];
        const litprobt = { ...litpro};
        delete litprobt['\u0061'];
    
    
        delimiterCatalog = {none: {}, common, javascript, 
            litproTop, litpro, litproqq, litproq, litprobt,
            ...moreDelimiters
        };
        Object.keys(delimiterCatalog).forEach( lang => {
            delimiterCatalog[lang] = convertToMap( delimiterCatalog[lang]);
        } );
    }

    const descend = function descend ({ 
        str = '', 
        start = 0, 
        delimiters = 'common', 
        first = () => null,
        terminator = () => null,
        last = () => null, 
        innerFirst = () => null,
        innerLast = () => null,
        push = () => null, 
        pop = () => null, 
        end = () => null
    } = {}) {
    
        if (typeof delimiters === 'string') {
            delimiters = delimiterCatalog[delimiters];
        }
    
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
    
        if (!Array.isArray(delimiters) ) {
            throw "delimiters should be presented in the form `[key, obj]`";
        }
        const n = str.length;
        let insides = []; // pop/push of delimiters
        const originalDelimiters = delimiters;
    
        for (let i = start; i < n; i += 1) {
            let substr = str.slice(i);
            
            {
            const control = first(substr, i, str);
            if (typeof control === 'number') {
                if (control < 1) {
                    return;
                } else {
                    i += control-1; // the loop is going to add 1
                    continue;
                }
            } 
            }
    
            {
                const t = terminator(substr, i);
                if (t) {
                    return [i, t];
                }
            }
            let delim = delimiters.find( arr => {
                const left = arr[0];
                return ( left === substr.slice(0, left.length) );
            }); 
            
            if (delim) {
                let lead = delim[1].lead;
                if (lead) {
                    if (str[i-1] === lead) {
                        let esci = 1;
                        while (str[i - esci - 1] === lead) {
                            esci += 1;
                        }
                        if (esci % 2 === 1) {
                            delim = false; //odd number of escapes leave an escape so no delim
                        }
                    }
                }  
            }
    
            if (!delim) {
                const control = last(substr, i, str);
                if (typeof control === 'number') {
                    if (control < 1) {
                        return;
                    } else {
                        i += control-1; // the loop is going to add 1
                        continue;
                    }
                }
                continue;
            }
            
            { //delimiter has been found, not escape
            
                let [left, right] = delim;
                insides.push([left, right, i]);
                push(str, i, left, right);  // no effect on anything
                i += left.length;
                let current = insides[0];
                let cdl = right.end.length;
                if (right.delimiters) {
                    delimiters = delimiterCatalog[right.delimiters];
                }
                while (insides.length && (i < n) ) {
                    let substr = str.slice(i);
                    
                    {
                    const control = innerFirst(substr, current, insides, i, str); 
                    if (typeof control === 'number') {
                        if (control < 1) {
                            return;
                        } else {
                            i += control; // the loop is going to add 1
                            continue;
                        }
                    }  //not a for loop here so need +1
                    }
                
                        if (substr.slice(0, cdl) === right.end) { //end delimiter found
                            let rightFound = true;
                            let escape = right.escape;
                            if (escape) {
                                if (str[i-1] === escape) {
                                    let esci = 1;
                                    while (str[i - esci - 1] === escape) {
                                        esci += 1;
                                    }
                                    if (esci % 2 === 1) {
                                        rightFound = false; //odd number of escapes leave an escape so no rightFound
                                    }
                                }
                            }
                           
                            if (rightFound) {
                                insides.pop();
                                let leftPos = current[2];
                                let positions = [leftPos, leftPos+left.length, i, i +cdl]
                    
                                pop(str, positions, current, insides);
                                if (insides.length !== 0) {
                                    current = insides[insides.length-1];
                                    [left, right] = current; 
                                    if (right.delimiters) {
                                        delimiters = delimiterCatalog[right.delimiters];
                                    }
                                } else {
                                    delimiters = originalDelimiters;  
                                }
                    
                                i += cdl;
                                if (insides.length === 0) { i -= 1;} // for loop increments
                                continue;
                            }
                        }
                
                    let delim = delimiters.find( arr => {
                        const left = arr[0];
                        return ( left === substr.slice(0, left.length) );
                    });
                    
                    if (delim) {
                        let lead = delim[1].lead;
                        if (lead) {
                            if (str[i-1] === lead) {
                                let esci = 1;
                                while (str[i - esci - 1] === lead) {
                                    esci += 1;
                                }
                                if (esci % 2 === 1) {
                                    delim = false; //odd number of escapes leave an escape so no delim
                                }
                            }
                        }
                    }
                
                    if (!delim) {
                        let control = innerLast(substr, current, insides, i, str); 
                        if (typeof control === 'number') {
                            if (control < 1) {
                                return;
                            } else {
                                i += control; // the loop is going to add 1
                                continue;
                            }
                        }
                        i+=1; 
                        continue;
                    }
                    [left, right] = delim;
                    current = [left, right, i]; 
                    insides.push(current);
                    push(str, i, left, right);
                    i += left.length;
                    cdl = right.end.length;
                    if (right.delimiters) {
                        delimiters = delimiterCatalog[right.delimiters];
                    }
                
                }
                if ( insides.length ) {
                    throw `ending delimiters not found:  [${insides.join(',')}] not found in:\n  ${str.slice(insides[0][2])}`;
                }
    
            }
    
        }
        end(); 
        return -1; //not found 
    };
    const getMatch = function (value ) {
        let vtype = typeof value;
        if (vtype === 'function') {
            return value;
        }
        if (vtype === 'string') {
            let vl = value.length;
            return (str) => {
                if (str.slice(0,vl) === value) {
                    return [value];
                } else {
                    return null;
                }
            };
        } else if ( (vtype === 'object') && (value.constructor === conreg) ) {
            let regstr = value.toString();
            if (regstr[1] !== '^') {
                const lastInd = regstr.lastIndexOf('/');
                const flags = regstr.slice(lastInd+1); 
                value = RegExp('^' + regstr.slice(1, lastInd), flags);
            } 
            return (str) => {
                if (value.lastIndex) { value.lastIndex = 0;} // make sure starts at 0
                let match = value.exec(str);
                return (match ? match : null);
            };
        } else {
            throw `Value must be string, function, or regex: ${value}`;
        }
    };
    const indexOf = function (str, searchValue, args = {} ) {
        searchValue = getMatch(searchValue);
        let ret = -1;
        const flow = function (substr, i, str) {
            const match = searchValue(substr, i, str);
            if (match) {
                ret = i;
                return -1; //breaks further search
            } else {
                return null;
            }
        }
        if (args.last === true) {
            args.last = flow;
        } else {
            args.first = args.first || flow;
        } 
        descend({ str, ...args });
        return ret;
    };
    const lastIndexOf = function (str, searchValue, args = {}) {
        searchValue = getMatch(searchValue);
        let lastIndex = args.lastIndex ?? +Infinity;
        let ret = -1;
        const flow = function (substr, i, str) {
            if (i > lastIndex) {
                return -1; //matches that start after endInd not allowed
            }
            const match = searchValue(substr, i, str);
            if ( match ) {
                ret = i;
                return 1; //goes to the next character, may match within match
            } else {
                return null;
            }
        }
        if (args.last === true) {
            args.last = flow;
        } else {
            args.first = args.first || flow;
        } 
        descend({ str, ...args });
        return ret;
    };
    const match = function (str, searchValue, args = {} ) {
        searchValue = getMatch(searchValue);
        let ret = null;
        const flow = function (substr, i, str) {
            const match = searchValue(substr, i, str);
            if (match) {
                ret = match;
                match.index = i;
                match.input = str;
                return -1; //breaks further search
            } else {
                return null;
            }
        }
        if (args.last === true) {
            args.last = flow;
        } else {
            args.first = args.first || flow;
        } 
        descend({ str, ...args });
        return ret;
    };
    const replace = function (str, searchValue, replaceValue, { start = 0, delimiters = null, terminator = null } ) {
    
        console.log('hi');
    
        
    
        let ttype, tlength;
        if (terminator) {
            ttype = typeof terminator;
            tlength = (ttype === 'string') ? terminator.length : 0;
        }
    
        delimiters = delimiters || delimiterCatalog.common; 
        let delArr = Object.keys(delimiters).
            sort ( (a,b) => b.length - a.length );
        const n = str.length;
        
        console.log('made it here', n, str, searchValue);
    
        let descent = []; // pop/push of ending delimiters
        for (let i = start; i < n; i += 1) {
            let end, delimited;
            
            
    
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
    
            let leftDelim = delArr.find( left => left === str.slice(i, left) );
            if (!leftDelim) {
                continue;
            }
    
            let delimObj = delimiters[leftDelim];
            
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
            
            { //delimiter has been found, not escape
            
                descent.push(leftDelim);
                let end = i+1; 
                let curDel = leftDelim;
                let cdl = curDel.length;
                while (descent.length && (end < n) ) {
                    if (str.slice(end, end+cdl) === curDel) { //end delimiter found
                        end = end + cdl;
                        let finishedDelim = descent.pop();
                         
                        continue;
                    }
                    let i = end;
                    end += 1;
                    let leftDelim = delArr.find( left => left === str.slice(i, left) );
                    if (!leftDelim) {
                        continue;
                    }
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
                    curDel = leftDelim;
                    cdl = curDel.length;
                    descent.push(curDel);
                    end = i + cdl;
                }
                
                if ( descent.length ) {
                    throw `ending delimiters [${descent.join(',')}] not found in:\n  ${str.slice(i)}`;
                } else {
                    i = end;
                }
            }
    
        }
    
        return -1; //not found 
    };
    const allIndexOf = function (str, searchValue, options = {})  {
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
    };
    const matchAll = function (...args) {
    
    };
    const replaceAll = function (...args) {
        
    
    };
    const split = function split (...args) {
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
    
    
    
    
    };
    const chunk = function (...args) {
    
    };
    const chunkAll = function (...args) {
    
    };


    return {indexOf, lastIndexOf, match, replace, descend, 
        allIndexOf, matchAll, replaceAll,
        split, chunk, chunkAll, walker:descend, delimiterCatalog};
};

const immediates = {
    eval : async function (data) {
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
            let code = webNode.code;
            if (!webNode.evaldCode) { webNode.evaldCode = [];}
            if (code.some( (obj) => obj.lang === evalLang) ) {
                let [evblocks, origev, other] = code.reduce( (acc, next) => {
                    if (next.lang === evalLang) {
                        acc[0].push(next.code);
                        acc[1].push(next);
                        if (!start) { start = next.start;}
                        end = next.end;
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
                    if (!start) { start = next.start;}
                    end = next.end;
                    acc.push(next.code);
                    return acc;
                }, []).join('\n');
                webNode.evaldCode.push(webNode.code);
                webNode.code = [];
            }
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
    
    },
    scope : function ({target, scope}) {
        let ind = target.indexOf('=');
        if (ind === -1) {
            delete scope[target.trim()];
        } else {
            let vname = target.slice(0,ind).trim();
            let val = target.slice(ind+1);
            scope[vname] = val;
        }
    },
    report : function ({target, scope, webNode}) {
        this.tracker("commonmark immediate directive report", {target, scope,
            webNode}); 
    },
    prefix : function ({target, scope}) {
        if (target.slice(-2) === '::') {
            target = target.slice(0,-2);
        }
        if (target) {
            scope.prefix = target;
        } else {
            scope.prefix = this.originalPrefix;
        }
    },
    escape : function ({webNode}) {
        webNode.code.forEach( (el) => {
            el.code = el.code.replace(/_"/g, '\\_"');
            el.code = el.code.replace(/_'/g, "\\_'");
            el.code = el.code.replace(/_`/g, '\\_`');
        });
    }
};

module.exports = {has, last, convertToMap, makeScanners, immediates};
