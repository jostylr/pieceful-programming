# Runners

This is where we define the (top) modules that run all the operations. 

The hope is that these are relatively light weight so that it is easy to write
similar versions as needed. 

## Versions

We have a minimalist version and a full version with all batteries included. 

Sample version:
* [sample/pfp/cli.js](#cli-min "save:") This runs the command line client
* [sample/pfp/test.md](#test-md "save:") This is a very basic test file


Minimalist version 

* [pfp/](# "cd:save")  Changing save directory to pieceful
* [index.js](#min-index "ave:") This is for being included by require
* [cli.js](#cli-min "save:") This runs the command line client
* [browser.js](#min-browser "ave:") This has the browser version
* [browser.min.js](#min-browser "ave:|minify") Minified version

Batteries included version


* [pieceful/](# "cd:save")  Changing save directory for full
  batteries: literate-programming
* [index.js](#max-index "ave:") This is for being included by require
* [cli.js](#max-cli "ave:") This runs the command line client
* [browser.js](#max-browser "ave:") This has the browser version
* [browser.min.js](#max-browser "ave:|minify") Minified version
* [](# "cd:save")


## Loaders

We are directly loading this code instead of requires. So we reach into the
literate program files.

* [core](core.md "load:") This is where the core weaver and running
  functionality exists. 
* [commands](commands.md "load:")
* [directives](directives.md "load:") 
* [sw](scriptedwriting.md "load:") This is the yamlish style for writing
  something that has stuff that gets replaced. Think the python notebook kind
  of experience though in static file. 
* [up](underpipes.md "load:") This is where the underscore parsing occurs
  in code pieces. 
* [cm](commonmark.md "load:") This is the main markdown format for
  literate-programming
* [vfs](virtual-file-system.md "load:") This is where we implement a virtual
  interface for managing files and terminal access, commands, etc. This helps
  abstract it for the browser as well as allowing us easy flow control as to
  when stuff gets saved (immediately or when all is ready or interactively or
  after diffing or ...).


## Beginning

This is the core part of what we need. 

We need defined weaver, commands, directives, parsers. We load these directly.
This is the first part. There
should be a middle where extras are loaded and the io is defined. 

    const has = function (obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    };

    const Weaver = _"core::pieceful core";
    let organs = {
        commands : _"commands::core",
        directives : _"directives::core",
        parsers : {},
        externals : {},
        env
    };

    { 
        let cmparse;
        _"cm::core";
        organs.parsers.md = cmparse;
    }

    {
        let sw;
        _"sw::core"
        organs.parsers.pfp = sw;
    }

    {
        let cta;
        _"up::core"
        organs.parsers.up = cta;
    }

    
## Ending

This is where we run through the loader actions, sequentially. Then we are
done. 

In between steps, we can take care of logs, compare old and new, deal with
unresolved stuff, etc. 

    let weaver = new Weaver(organs, tracker);
    weaver.full = full;

    let main = async function main (loaders) {
        let n = loaders.length;
        for (let i = 0; i < n; i += 1) {
            let loader = loaders[i];
            let unresolved = await weaver.run(loader);
            if (Object.keys(unresolved).length !== 0) {
                env.log(`Unresolved issues in loader ${loader}:\n` + 
                JSON.stringify(unresolved), 'loader', 5,);
                break; 
            }
        }
        //full(weaver.v, weaver.p);
        env.log('All done. Have a great day!');
    };
               
    env.printPriority = 1;
    main(loaders);


## Load batteries

For the full version, we want to have a full experience. This is where we
load that up, things such as linting, minifying, postcss, yaml, etc. It could be
massive set of requires. 


    organs.commands = Object.assign(organs.command, _"commands::full"_;
    organs.directives = Oject.assign(organs.directives, _"directives::full");

This might also be a place to put extra parsers in some future time. The
externals are designed to be called in as needed, generally by the dash
command. 
 

 

## Cli Min

The command line client comes in two flavors, a minimal version and full
version. The lite version uses the command `pfp` while the full one uses
`pieceful`.  


    _"vfs::cli"
    _"beginning"
    _"cli common"
    _"ending"


### Cli Common

These are the common parts of the command line client

We need: 

* Command line options (minimist)

TODO

---

    //let options = {};
    const util = require('util');
    let full = (...args) => {console.log(util.inspect(args, {depth:11,
        colors: true}))};
    let tracker = full;
    tracker = () => {};
    let loaders = [
        {directive:'load', src: 'R./test.md', target:'test', args:[],
            scope:{fullname:'test file'},
            middle : function (text) {
                console.log(text);
                return text;
            }
        }, 
        {directive:'load', src: 'R./guess.pfp', target:'guess', args:[], 
            scope: {fullname:'guess scriptedwriting'}
        }
    ];

    loaders.shift(); // get rid of the first one for now. 

## Cli Max

    _"vfs::cli"
    _"beginning"
    _"load batteries"
    _"cli common"
    (_"full options")(options);
    (_"full io")(options);
    _"ending"


### Full Options

Not sure what might be needed here, but inserting it now. 


https://www.npmjs.com/package/shelljs
https://www.npmjs.com/package/inquirer
https://www.npmjs.com/package/chalk

### Full IO

?

## Browser Min

These are the common parts of the browser. 



## Test md

This is a quick and simple test file for pfp to run on, using markdown. 

    # Testing

    Hey, this is just a test. In writing this, we escape underscores.

        \_"first | sub(dot, cool)"

    [test-save.txt](# "save:")

    ## first

    Just some simple text. 

        dot this, dot that

        
