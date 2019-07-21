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
        load : _"load"
    }

### Save

Here we take the source as an incoming node, process it as needed, and then
save it to a file. 

    async function save ({src, target, args}, sym) {
        try{
            const {env, weaver, scope} = this;
            let [f, encoding] = args;
            let name = weaver.syntax.getFullNodeName(src, scope.context.scope);
            env.log(`Waiting for ${src} (as ${name}) for save directive targeting ${target}`, 'save', 1);
            let data = await weaver.getNode(name, sym);
            console.log(`${name} has the following data: ${data}`);
            if (typeof f === 'function') {
                data = (await f.call(scope, data, sym)).value;
            } else {
                encoding = f;
            }
            encoding = (typeof encoding === 'string') ? encoding : 'utf8';
            env.log(`Saving ${src} (${name}) to file ${target}`, 'save', 2);
            return await env.write(target, data, encoding);
        } catch (e) {
            env.error(`Failed to save ${src} (as ${name}) into file ${target}. Error message ${e.msg}`, {src, target, args}, e);
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
        try {
            const {env, weaver, scope} = this;
            const options = args[0] || {};
            const encoding = options.encoding || 'utf8';
            let extension = options.extension;
            let underpipes = options.underpipes || 'up';
            env.log(`Reading in ${src} as ${target}`, 'load', 2);
            let text = await env.read(src, encoding);
            if (options.middle) {
                text = await options.middle.call({env, weaver, scope, src,
                    target}, text);
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
            env.log(`Initiating compilation of ${src} as ${target}`, 'load', 2);
            let nodes = await weaver.parse(text, target, extension, underpipes);
            nodes.id = `load:${src}=>${target}`;
            let ret = await weaver.addPieces(nodes);
            if (options.done) {
                await options.done({env, weaver, scope, src, target, text},
                    ret);
            }
            env.log(`Finished loading ${src} under name ${target}`, 'load', 2);
            return ret; // useful for top level loading
        } catch (e) {
            env.error(`Failed to load ${src} as ${target}.`, null, e);
        }

    }


### Read

This reads a file and does no processing of it, just saves the value in the
node. 
    


### Fetch 

This fetches a file from the internet. 


## Full

    {

    }
