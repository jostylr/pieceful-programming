# Runners

This is where we define the (top) modules that run all the operations. 

The hope is that these are relatively light weight so that it is easy to write
similar versions as needed. 

## Versions

We have a minimalist version and a full version with all batteries included. 

Minimalist version 

* [pieceful/](# "cd:save")  Changing save directory to pieceful
* [index.js](#min-index "save:") This is for being included by require
* [cli.js](#min-cli "save:") This runs the command line client
* [browser.js](#min-browser "save:") This has the browser version
* [browser.min.js](#min-browser "save:|minify") Minified version

Batteries included version


* [literate-programming/](# "cd:save")  Changing save directory for full
  batteries: literate-programming
* [index.js](#max-index "save:") This is for being included by require
* [cli.js](#max-cli "save:") This runs the command line client
* [browser.js](#max-browser "save:") This has the browser version
* [browser.min.js](#max-browser "save:|minify") Minified version
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
* [vfs](virtual-file-sytem.md "load:") This is where we implement a virtual
  interface for managing files and terminal access, commands, etc. This helps
  abstract it for the browser as well as allowing us easy flow control as to
  when stuff gets saved (immediately or when all is ready or interactively or
  after diffing or ...).


## Common Part Beginning

This is the core part of what we need. 

We need defined weaver, commands, directives, parsers. We load these directly.
This is the first part. There
should be a middle where extras are loaded and the io is defined. 

    const vfs = (_"vfs::core")();
    const Weaver = _"core::pieceful core";
    let custom = {
        commands : {},
        directives : {},
        parsers : {},
        externals : {},
        io : vfs.io
    };
    (_"commands::core")(custom);
    (_"directives::core")(custom);

    { 
    let commonparse;
    _"cm::core";
    custom.parsers.md = commonparse;
    }

    {
    let sw;
    _"sw::core"
    custom.parsers.sw = sw;
    }

    

## Load batteries

For the full version, we want to have a full experience. This is where we
load that up, things such as linting, minifying, postcss, yaml, etc. It could be
massive set of requires. 


    (_"commands::full")(custom);
    (_"directives::full")(custom);

This might also be a place to put extra parsers in some future time. The
externals are designed to be called in as needed, generally by the dash
command. 
 

 

## Cli 

The command line client comes in two flavors, a minimal version and full
version. The lite version uses the command `pfp` while the full one uses
`pieceful`.  


### Common intro

These are the common parts of the command line client

We need: 

* Command line options (minimist)
* io setup

---

    let options = {};
    (_"basic options")(options);
    (_"basic io")(custom.io);




### Full additions

Not sure what might be needed here, but inserting it now. 

    (_"full options")(options);
    (_"full io")(options);

https://www.npmjs.com/package/shelljs
https://www.npmjs.com/package/inquirer
https://www.npmjs.com/package/chalk


## Browser

These are the common parts of the browser. 

