const has = function has (obj, key) {
    return (typeof obj === 'object') && 
        Object.prototype.hasOwnProperty.call(obj, key);
};

const scanning = function () {

    const conreg = (/a/).constructor; //for detecting regex.

    let delimiterCatalog;
    {
        const common =  { 
            '"' : {
                end: '"', 
                escape: '\\', 
                delimiters : {}
            },
            '`' : {
                end: '`', 
                escape: '\\', 
                delimiters : {}
            },
            "'" : {
                end: "'", 
                escape: '\\', 
                delimiters : {}
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
                end: '\n, 
                delimiters : {}'
            }, 
            '/* : {
                end: '*/', 
                delimiters : {}
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
    
    
        delimiterCatalog = {common, javascript, litproTop, litpro}
    }

    const indexOf = function (str, searchValue, start = 0, delimiters = null ) {
    
        const tsv = typeof searchValue;
        if ( (tsv !== 'string) && (tsv !== 'function') ) {
            if (searchValue.constructor !== conreg) {
                throw "indexOf requires a matching string, a matching function, explicit null, or a regex as the second argument";
            }
            let regstr = searchValue.toString();
            if (regstr[1] !== '^') {
                throw `regex ${regstr} must check from the beginning of the string`; 
            }
        }
        let svlength = (tsv === 'string') ? searchValue.length : 0;
    
    
    
        delimiters = delimiters || delimiterCatalog.common; 
        let delArr = Object.keys(delimiters).
            sort ( (a,b) => b.length - a.length );
        const n = str.length;
        let descent = []; \\ pop/push of ending delimiters
        for (let i = start; i < n; i += 1) {
            let end, delimited;
            if (t === 'string') {
                if (str.slice(i, svlength) === searchValue ) {
                    return i;
                }
            } else {
                let substr = slice(i); 
                if (t === 'function') {
                    svlength = searchValue(substr);
                    if (svlength !== null) {
                        return i;
                    }
                } else { //definitely a regex
                    let regmatch = searchValue.test(substr);
                    if (regmatch) {
                        return i;
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
    const lastIndexOf = function (...args) {
        let arr = allIndexOf(...args);
        if (arr && arr.length) {
            return arr[arr.length-1];
        } else {
            return -1;
        }
    };
    const match = function (str, ARGS start = 0, delimiters = null ) {
    
        PREP
    
    
    
        delimiters = delimiters || delimiterCatalog.common; 
        let delArr = Object.keys(delimiters).
            sort ( (a,b) => b.length - a.length );
        const n = str.length;
        let descent = []; \\ pop/push of ending delimiters
        for (let i = start; i < n; i += 1) {
            let end, delimited;
            if (t === 'string') {
                let substr = str.slice(i, svlength);  
                if (substr === searchValue ) {
                    let ret = [searchValue];
                    ret.input = subst;
                    ret.index = i; 
                    return ret;
                }
            } else {
                let substr = slice(i); 
                if (t === 'function') {
                    let match = searchValue(substr);
                    if (match) {
                        match.index = i;
                        return match; 
                    }
                } else { //definitely a regex
                    let regmatch = searchValue.exec(substr);
                    if (regmatch) {
                        regmatch.index = i; 
                        return regmatch;
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
                        CHUNK
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
    const replace = ;
    const allIndexOf = function (...args)  {
        arg.splice(2,0,0);
        let ret = [];
        let ind = 0;
        let str = n+1;
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
    const matchAll = ;
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
                acc[1].push(str.slice(0,ind)
                acc[0] = ind + len;
                return acc;
            }, [0, []]);
        } else {
    
        }
    
    
    
    
    };
    const chunk = function (;
    const chunkAll = ;
    const walker = ;


    return {indexOf, lastIndexOf, match, replace, 
        allIndexOf, matchAll, replaceAll,
        split, chunk, chunkAll, walker};
};
const scanners = scanning();

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

module.exports = {has, ...scanners, immediates};
