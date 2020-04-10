# Pieceful Commonmark

This a component of [pieceful programming](https://github.com/jostylr/pieceful-programming).

It takes in a markdown document (commonmark dialect) and outputs a
javascript object suitable for further processing by the rest of the
pieceful programming setups. 

Headings in markdown convert to names of the pieces. 

Code blocks become pieces of code. Code blocks within the same heading
get added to an array of code blocks for that heading group. They
eventually get concatenated together, in general. Code fences with a
language after the fences have code blocks with that language tag. Any
language tag that leads with `eval` will be evaluated in line as a chunk.
See the eval immediate directive below. 

Most of the other markdown syntax is ignored. The only other bit is that
of links. 

## Links

A link of the form `[target](src "directive: args")` becomes a directive.
That colon is crucial in the title to recognize as a directive. The names
in that link form are the headings of the directive object produced. There
is also a scope object. If `src = #`, then the current section is used for
the src. 

To produce a minor block (a kind of subheading), we use `[name]()` as the
main way. Also possible is `[name](whatever ":pipes")`. In both cases, this
creates a new piece whose name is the name of the piece it appears in plus
`:name` where name is the link text. 

We also have `[=varname](whatever ": pipes")` to store the current
section, after piping, into a new piece name. There is also a way to
transform the current section by having `[](whatever ":pipes")` or
`[|](whatever ":pipes")`.  

### Immediate directives

The final form of the link is that of an immediate directive. Most directives
are executed later without regard to order of appearance (though the piece
they appeared in is recorded in a scope variable). Local directives get
executed immediately and are triggered by `[target](src "!directive:
args")`  Basically, directives with a leading exclamation point. 

There are several built-in: 

* `eval`. This evaluates some code in the current block and does something
  with it. The target, if a leading ., gives the output language. The src,
  with a leading ., leads to those blocks in that heading to be
  concatenated and then evaluated.
  
    This is a an eval-like execution; it is asynchronous. It grabs the code from the current
    node and that's it. It then removes the code from the node from the web being generated. 

    localContext, the webNode, and the data object are there simply to be referenced by the
    evaling code if it wants. 

    The behavior is a little more complicated. If there is a code fence
    block with language `eval` then we take those code blocks, concatenate
    and use them, removing them from the webnode. If there is just one
    block remaining, then we eval the code with the code variable
    referencing that text and then that text being stored in replacement
    of the original code in the webnode. If there are no other blocks
    (eval code fence or not), then we return the code that gets generated
    and stash it in the web Node. To short circuit, that, return from the
    code. If there are multiple webNode.code blocks, then we make no
    guesses as to what the desired outcome is. One can empty that array
    and return text to get the behavior of the other scenarios. 
* `scope`. This affects the scope variables. Whatever it does will persist
  until changed by another scope command. `[cwd=core](# '!scope:')` sets
  the cwd (say change working directory) to core. To later delete this, do
  `[cwd](# '!scope:')`. To the left of the equal sign gets trimmed, but
  not to the right. 
* `prefix`. This changes the prefix (`prefix::...`) of how stuff gets
  referred to. `[name](# "!prefix:")` If name is not present, this reverts
  to original prefix. 
* `report`. This calls the tracker to record the target, scope, and
  webNode. Note these are live. 
* `escape`. This escapes (inserts slash) all underscore-quotes. This is
  for being able to write about pieceful programming without having to
  slash everything. Of course, this only works if one does not want to put
  in any substitutions at all. 


## Require

If using this module separately, the `require` exports a function, (I call
it `cmparse`), and that function takes in `text` which gets parsed, a
prefix string for referring to the pieces,  and an
`options` argument that can contain whatever scope variables one wants,
but it can also contain two special pieces: `tracker`, if present, should
be a function that expects to take in arguments for some kind of reporting
to be done, and `immediateDirectives` which should be an object whose keys
are the immediate directive names and values are functions that get
called; their argument is a data object that contains the target, src,
args, scope, directive, webNode. The `this` is the localContext which
contains access to all directives, webNodes (under web), and some other
stuff. To disable the ability to do eval in these blocks, pass in a
key-value pair of eval-function that does not evaluate. 
