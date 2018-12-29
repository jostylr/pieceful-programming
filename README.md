# Pieceful Programming

Pieceful programming is a distillation of the core mechanism that I like
about literate-programming, namely, viewing pieces of code, that have their
own explanations, their own processes, and their own placements. Literate
programming was the idea of writing a narrative with code embedded in it and
that code would get transpiled into a code file that a computer could use. The
narrative was what humans could use. 

I wrote a tool that does this with markdown. But it occurred to me that it can be
generalized to lots of different formats, parsers, graphical environments,
whatever, and that the core of it was having these chunks. 

This repository will contain the core processing element, upgrading the
previous work flow to allow full asynchronous working, and it will include, in
the fashion of a mono-repo, many of the processing dependencies. 

The pieceful part will have a format that requires no parsing. The parsers are
responsible for creating the pieces as well as for creating the insertion
points and command sequences for the subbed in content. There are some
commonly-defined commands that implement the flow, but it should be quite
minimal. 

## Piece layout

Each piece consists of:

* Full name. It is the parser's responsibility to create unique names for all
  the pieces. There is a single, massive object with the names. Actually, two,
  because we need something that will hold the promises of the pieces.
* Raw. This is the raw text, including the comments, code, directives, header.
  It should include everything to reproduce the text in whatever is being
  stored. 
* Pieces. This is the code, having been broken up into the raw code bits and
  the subbed bits. If it is a string, it is a literal piece of code.
  Otherwise, it should be an array of commands. The first one is typically
  `[get, code block name]`, followed by the sequence of commands to initiate.
  Often, the last one will be `[indent, hanging indent, first indent]`.
* Value. This is the final value of the piece. Once figured out (by running
  the commands in the pieces and then joining them), this value should not be
  changed. Essentially, as soon as it is computed, it can, and probably is
  used. If something later modifies it, the results are unpredictable. The
  proper way is to take that value and then do something else to it in a
  different piece. 

## Using Core

The core object expects a JSON object consisting of pieces and directives.
Pieces get processed in a functionally pure way (at least that is the intent),
being a sequence of input and output functions with no side effects. Each
piece is labeled with its full name and must have a pieces an array, even if
just empty. The value attribute should not be defined but will get defined, in
general. Other information, such as the raw text, position, file, tags,
narrative flows, whatever, can be added, but is generally ignored by most
commands. 

The commands and their arguments should have no side effects and the only
external information available should be from `getting` other value pieces. It
can produce any kind of output, but that is all it should do. Values are
definitely immutable. 

If the pieces consist of just one entry and it is not a string after command
execution, then that thing is what is the value. Otherwise, we convert
everything to strings and join them. 

Arguments are either strings or commands, maybe simple commands that convert a
string into a number, say.  Whatever the argument's command sequence create
will be what is passed in. 

Directives are the stuff that has side effects. They come in as an array and
are computed in order. The parser is responsible for filling in any
file-context needs (shortname references in a file, for example). It should be
the case that their actual placement or ordering is of no consequence.

Everything is presumed to be asynchronous. Directives can create new pieces,
storing information, etc. 


## Parsers

The hope is to disentangle the dependency on the parsers. We should be able
to feed in a large number of different formats and sources and it all swirls
into one harmonious whole. There is a basic parser that ships with this, doing
the markdown parsing that the literate-programming I wrote before did. It is
mostly backwards compatible, but some differences will no doubt be present. In
particular, having headings that allow for piping of the contents into
commands could be nice to have. 






