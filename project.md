# Pieceful Programming

This is the primary entry point into compiling pieceful programming. This is a
monorepo that generates various npm packages that assemble together to make
a literate-programming environment, all based on the notion of a piece of code
as primary. 

The versioning will work as follows. Each module directory will be hashed for
changes. If anything in the directory changes, then it will be tagged for an
update to the version. There is a global version counter that only goes up.
This is the new version for any code that changes. This includes dependency
changes. So the command client depending on the core will automatically get
bumped anytime the core changes. But if only the client changes, then the core
does not get bumped. Plugins may or may not change. But they will bump global
version as well if they need a new version. Basically, this ensures that any
current code will be okay with any version of the code from the listed version
on. So if the plugin is at 1.4 and the core is at 1.6, then the plug works for
1.4, 1.5, 1.6. But if the plugin updates to 1.6.1, then only core 1.6 is
guaranteed to work with 1.6.1 plugin. The contract is that nothing gets pushed
until everything in the current state passes all tests. If they fail, then
a change is needed, whether in the tests or the code itself, depending. 


## [Core](core.md "load:")

This is the core of the process, that which handles the fundamental
asynchronous, unordered compiling of a web of pieces. 

To use this, the require returns a constructor. The constructor takes in an io
object that is the interface between directives and the outside world. The
second argument is a tracking function for monitoring various chosen events,
such as executing a command or directive. 

The constructor returns an object that has the following explicit api methods: 

* `.addCommands( {commandName: commandFunction})` This expects an object of
  commands. Each command should be unique across all callings and definitions.
  Command functions can by asynchronous and, if used in a pipe, should expect
  both an input into the first argument. Almost all commands should have
  returns. They cannot easily impact the state beyond the sequence of calls
  that they are a part of. 
* `.addDirectives( {directiveName: directiveFunction})` Very similar to
  commands, except that are the actors that modify the state, such as loading
  or saving files or producing new pieces. 
* `.runDirective( directive name, data)` The run directives command executes a
  directive, the one whose name is first. It need not exist at the time of
  calling. The data object consists of: target, src, and an  args array which
  should be an array of objects that will be passed in as is (non-arrays) or
  executed as commands (arrays of the form name, arg1, arg2, ...). The
  directive function is called with the processed args as part of an object,
  along with the target and src properties.  The tracking is an optional
  string that is informative. Note that the run directive is asynchronous,
  meaning that it automatically returns a promise which can be awaited for or
  chained.  The actual directive call has access to the command scope of all
  its arguments as well as the entire weaver object, meaning it can see the
  current web of pieces, add pieces, add directives, add commands, etc. 
* `.addPieces`. This is the primary entry. Add a web of nodes with this
  command. The names should be unique across all web additions. This is
  asynchronous and returns an object with the same keys but that point to the
  computed values. 


## [Commonmark](commonmark.md "load:")

This takes in a markdown document and returns a web of of nodes, where each
code block under a heading is added to a code array. This requires further
processing into a pieces array which will constitute the text bits and the
command arrays.

It also returns an array of directives found. Each directive consists of an
object with the directive name, under directive, a string under args to be
further processed into commands, a src value and a target value, both of which
are untouched. There is also the scope which contains information to find the
block where the directive was found. 



## [Underpipes](underpipes.md "load:")

This does the underscore and pipe parsing needed both in code blocks and
directives. 

## Director

This should direct all the different parts of the processing. It would be the
one to ideally fork and insert more functionality into it, potentially
replacing a parser or whatever. This is where commands and directives get
loaded. This would still not quite be the cli client, but it would be close.
This is the middle. 


## Notes

Some notes to incorporate. 

So using the `*` by itself as a shortcut for compose. If the star appears as
the last character in a command name, then it becomes a sequncer command. The
arguments can be written as usual, but the command function will not receive
them as processed. Instead, it will receive a function that, given an index,
will provide back the value of the argument. Not entirely clear on the use
case, but simple code. 


## Packages

This generates the file that directs what packages to monitor and process. 

Each package is full to the left. Tabbed in are sublines. Those lines have
"command: arg1,arg2,..."

Commands:  pf is the list of other pieceful packages to depend on. They need
to be tested and then rsynced over into node_modules for the package that
needs it. 

    0.1.0
    -commonmark
    desc: Commonmark processor component for pieceful programming
    dp: commonmark 0.29.1 


[packages.txt](# "save:")

[later]()


    -minimal
    pf: core, commonmark, underpipes


## TODO

COMPILE: Make a command that can take in a piece of text and will run it through the
underpipes process and run through commands. This is basically the compile
command from before. Maybe call it that. Allow for setting node info 

DIRECTIVES:  Get basic directives working

RUN: Get it fully running with minimal commands and directives

SEQUENCE: Allow for segmented sequence of loading files. Each file is done in
order, waiting for the previous to finish. The next has full access to what
was before. No filenames lead to setup.md, project.md and cleanup.md as the
default sequence, if those files are present. 




