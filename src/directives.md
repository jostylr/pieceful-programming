# Directives

These are our IO functions as well as the messing up state stuff. While
commands are basically purish, directives are basically the epitome of impure. 

Enjoy!

So a directive is called with a custom context (this  = `{weaver, scope}` )
and an argument object containing `{src, target, args}` where the args have
already been processed and should be values. The weaver allows full access to
the web of nodes and commands, directives, io objects such as writing and
reading files. The scope has various bits of information including variables
the args processing could have stored. 

TODO: We need to implement a cache system for all this and something to hook
into diffing. 



## Core

These are the core common directives that should be included in all versions. 

    {
        save : _"save",
        load : _"load",
        out : _"out",
        paths : _"paths"
    }

### Save

Here we take the source as an incoming node, process it as needed, and then
save it to a file. 

    async function save ({src, target, args}) {
        const {env, weaver, scope, tracker, sym} = this;
        try{
            let [f, encoding] = args;
            let name = weaver.syntax.getFullNodeName(src, scope.context.scope, sym);
            tracker(sym, 'Save waiting for node', {src, name, target});
            let data = await weaver.getNode(name, sym);
            tracker(sym, 'Node for save received', data);
            if (typeof f === 'function') {
                tracker(sym, 'Transforming save data', f);
                data = (await f.call(scope, data, sym)).value;
                tracker(sym, 'Done transforming save data', data);
            } else {
                encoding = f;
            }
            encoding = (typeof encoding === 'string') ? encoding : 'utf8';
            tracker(sym, 'Saving file', {encoding, target});
            let out = await env.write.call({tracker, sym}, target, data, encoding);
            tracker.done(sym, 'Successfully saved file', out);
            return out;
        } catch (e) {
            tracker.fail(sym, 'Save failed', e);
        }
    }

### Out

This is the same as save, except we are going to log the data. In the future,
this should be done by subbing or something. 

    async function out  ({src, target, args}) {
        const {env, weaver, scope, tracker, sym} = this;
        try{
            let [f, encoding] = args;
            let name = weaver.syntax.getFullNodeName(src, scope.context.scope, sym);
            tracker(sym, 'Out waiting for node', {src, name, target});
            let data = await weaver.getNode(name, sym);
            tracker(sym, 'Node for out received', data);
            if (typeof f === 'function') {
                tracker(sym, 'Transforming out data', f);
                data = (await f.call(scope, data, sym)).value;
                tracker(sym, 'Done transforming out data', data);
            } else {
                encoding = f;
            }
            encoding = (typeof encoding === 'string') ? encoding : 'utf8';
            tracker(sym, 'Outputing file', {encoding, target});
            let out = await env.log(name + `\n--- ${src} :=> ${target}\n` +  data, 'out directive', 5);
            tracker.done(sym, 'Successfully logged out file', out);
            return out;
        } catch (e) {
            tracker.fail(sym, 'Logging out failed', e);
        }
    }



### Load

This loads a file and processes it. The src is the place to read the file, the
target is the global name that all of its nodes will be found under. 

The first argument to the directive should be an options object that could
include an encoding for the file being read and also can include the
"extension" that triggers what compiler to use (md is for markdown, pfp is for
the pieceful programming format of using dashes to separate content). Others
could be added to. 

The options object can also include a middle and/or done option, both being
functions that can operate based on the text coming in, with the middle being
executed on the incoming text before the parsing and the done being executed
after the web processing is done. 


    async function load ({src, target, args}) {
        const {env, weaver, scope, tracker, sym} = this;
        try {

            const options = args[0] || {};
            const encoding = options.encoding || 'utf8';
            let extension = options.extension;
            let underpipes = options.underpipes || 'up';

            tracker(sym, 'About to read file', {src, encoding});
            let text = await env.read(src, encoding);
            if (text === '') { 
                tracker.fail(sym, 'No text to parse from', {stack : src});
                return {};
            }
            tracker(sym, 'Read file', text );
            if (options.middle) {
                tracker(sym, 'Processing middle', options.middle);
                text = await options.middle.call({env, weaver, scope, src,
                    target}, text);
                tracker(sym, 'Middle done', text);
            }
            target = target || src;
            if (!extension) {
                let ind = src.lastIndexOf('.');
                let slash = src.lastIndexOf(env.path.sep);
                if (ind > 0 && ind > slash ) {
                    extension = src.slice(ind+1);
                }
            }
            extension = extension || 'md';
            tracker(sym, 'Extension determined', extension);
            tracker(sym, 'Initiating parsing', target);
            let nodes = await weaver.parse(text, target, extension, underpipes, sym);
            nodes.id = `Web: ${target}`; 
            tracker(sym, 'Parsed. Will execute', nodes);
            let ret = await weaver.addPieces(nodes, sym);
            tracker(sym, 'Pieces Processed', ret);
            if (options.done) {
                tracker(sym, 'Post-processing started', options.done);
                let res = await options.done({env, weaver, scope, src, target, text}, ret);
                tracker(sym, 'Post-processing done', res);
            }
            return ret; // useful for top level loading
        } catch (e) {
            tracker.fail(sym, 'Failed to load', e);
            return {};
        }

    }

### Paths

This sets a path alias up. One alias per run should be all that ever happens. 

The src is new alias, the target is alias: `[D](B./desired "paths:")` 

    async function paths ( {src, target} ) {
        const {env, tracker, sym} = this;
        src = env.paths[src];
        if (has(env.paths, target) ) {
            let pv = env.paths[target]; 
            if (typeof pv === 'string') {
                env.paths[target] = src;
                tracker(sym, `Replacing path alias: ${target} was ${pv} but now is ${src}`);
            } else {
                env.paths[target].res(src);
                tracker(sym, `Assigning path alias: ${target} becomes ${src}`);
            }
        } else {
            env.paths[target] = src;
            tracker(sym, `Creating path alias: ${target} becomes ${src}`);
        }
    }
        

### Read

This reads a file and does no processing of it, just saves the value in the
node. 
    



### Fetch 

This fetches a file from the internet. 


### Files

This takes in as src a directory and returns all the files in it, possibly
subjected to a filter function. This is hard to figure out how much
functionality or not.

It will return an object with the filenames as keys and the properties as the
text files. 

It could have functions that act on each of the files and produces something.
Thinking about the action of loading. It sounds like we need directive
functions that we can compose together and then make a directive umbrella to
handle them. 



## Full

    {

    }
