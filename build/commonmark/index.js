let cmparse;

{    
    const has = function (obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    };
    let commonmark = require('commonmark');
    cmparse = async function cmparse (text, options = {})  {
        let scope = Object.assign({ 
            prefix : '', 
            tracker : () => {},
            immediateDirectives : {}
        }, options); 
    
        scope.immediateDirectives = Object.assign(
            {
                eval : async function (data) {
                    let webNode = data.webNode;
                    let start, end;
                    let localContext = this; //eslint-disable-line no-unused-vars
                        let code = webNode.code;
                        if (!webNode.evaldCode) { webNode.evaldCode = [];}
                        if (code.some( (obj) => obj.lang === 'eval') ) {
                            let [evblocks, origev, other] = code.reduce( (acc, next) => {
                                if (next.lang === 'eval') {
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
                            code = webNode.code.reduce( (acc, next) => {
                                if (!start) { start = next.start;}
                                end = next.end;
                                return acc.push(next.code);
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
                            code:ret,
                            lang:'generated',
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
            },
            scope.immediateDirectves 
        );
    
        
        const {tracker, immediateDirectives} = scope;
        delete scope.tracker;
        delete scope.immediateDirectives;
    
        tracker('commonmark parsing about to begin', {scope, text});
    
        let lineNumbering = ( function (text) {
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
        let web = {};
        let directives = [];
        let htext = false;
        let ltext = false;
        let webNode;
    
        let event;
    
        const originalPrefix = scope.prefix;
        let localContext = {originalPrefix, tracker, lineNumbering, web, immediateDirectives, event, directives};
    
    
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
    
            let ty = node.type;
            if (ty === 'text') {
                if (htext) {
                    htext.push(node.literal);
                }
                if (ltext) {
                    ltext.push(node.literal);
                }
            } else if (ty === 'link') {
                if (entering) {
                    ltext = [];
                } else {
                    let title, href, ind; // links
                
                    href = node.destination;
                    if (href === "#%5E") {
                        href = "#^";
                    }
                    title = node.title;
                    ltext = ltext.join('').trim();
                    
                    if (title) {
                        title = title.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
                    }   
                    if ((!href) && (!title)) { //pipeless switch
                        let sourcepos = scope.sourcepos;
                        {
                            let end = sourcepos[0];//start of the link
                            let cur = webNode.raw[webNode.raw.length-1];
                            let begin = cur[0][2];
                            cur[1] = text.slice(begin, end[2]);
                            cur[2] = end;
                        }
                        
                        let name = ltext.
                            trim().
                            toLowerCase().
                            replace(/\s+/g, ' ');
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
                    } else if (title[0] === ":") { 
                        if  ( (ltext[0] === '|') || ( ltext.length === 0) ) { //transform
                            webNode.rawTransform.push([scope.sourcepos[0], ltext + '|' + title.slice(1)]); 
                        } else if (ltext[0] === "=") { //store directive
                            let data = {
                                directive : 'store',
                                args : title.slice(1),
                                src:href,
                                target : ltext.slice(1),
                                scope : Object.assign({}, scope)
                            };
                            
                            tracker("directive call found", data);
                            directives.push(data);
                        } else { // switch
                            let sourcepos = scope.sourcepos;
                            {
                                let end = sourcepos[0];//start of the link
                                let cur = webNode.raw[webNode.raw.length-1];
                                let begin = cur[0][2];
                                cur[1] = text.slice(begin, end[2]);
                                cur[2] = end;
                            }
                            
                            let name = ltext.
                                trim().
                                toLowerCase().
                                replace(/\s+/g, ' ');
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
                        }
                    } else if ( (ind = title.indexOf(":")) !== -1) { //compile directive
                        let data = {
                            directive : title.slice(0, ind).
                                trim().
                                toLowerCase().
                                replace(/\s+/g, ' '),
                            args : title.slice(ind+1),
                            src:href,
                            target : ltext,
                        };
                        if (data.directive[0] === '!') {
                            let dir = data.directive.slice(1); //strip !
                            data.scope = scope; //live scope
                            data.webNode = webNode;
                            tracker("calling local directive", {dir, data});
                            await immediateDirectives[dir].call(localContext, data);
                            tracker("done with local directive", {directive:dir, scope, webNode});
                        } else {
                            data.scope = Object.assign({}, scope)
                            tracker("directive call found", data);
                            directives.push(data);
                        }
                    }
                    ltext = false;
                }
            } else if (ty === 'code_block') {
                let lang = node.info || '';
                let code = node.literal || '';
                if (code[code.length -1] === "\n") {
                    code = code.slice(0,-1);
                }
                let sourcepos = scope.sourcepos;
                if (sourcepos[0][1] == 1) {
                    let start = sourcepos[0];
                    let end = sourcepos[1];
                    start = [start[0]+1, start[1]];
                    end = [end[0], 1];
                    sourcepos = [lineNumbering(start), lineNumbering(end)];
                }
                
                webNode.code.push( {code, lang, start:sourcepos[0], end:sourcepos[1]});
            } else if (ty === 'heading') {
                if (entering) {
                    htext = [];
                } else {
                    let sourcepos = scope.sourcepos;
                    {
                        let end = sourcepos[0];//start of this heading
                        let cur = webNode.raw[webNode.raw.length-1];
                        let begin = cur[0][2];
                        cur[1] = text.slice(begin, end[2]);
                        cur[2] = end;
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
            } else if (ty === 'document' && entering) {
                scope.lv1 = scope.prefix + '::^';
                scope.fullname = scope.majorname = scope.lv1; 
                scope.lv1only = '^';
                webNode = web[scope.fullname] = {
                    name : '^', 
                    heading:'^', 
                    raw : [ [scope.sourcepos[0]] ],
                    code : [],
                    scope : Object.assign({}, scope)
                };
            }
        }
    
        {//scope 
            let end = scope.sourcepos[1];
            let cur = webNode.raw[webNode.raw.length-1];
            let begin = cur[0][2];
            cur[1] = text.slice(begin, end[2]);
            cur[2] = end;
        }
    
        tracker('commonmark parsing done', {origin: scope.origin || originalPrefix, web, directives, text});
    
        return {web, directives};
    
    };
}

module.exports = cmparse;
