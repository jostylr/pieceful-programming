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

These pieces are created with stamps, allowing for easy swapping in and out of
functionality. In particular, we can have a debug feature that will can track
all the commands' intermediate values, etc. The intermediate values for
debugging can be a `debugPieces` which has the value at each intermediate
stage. Each command should always return a distinct object, that is, they are
functional in nature. 

## Using Core

The core loading process gives a stamp (factory) that produces an object that
will hold the data, under `names`. Each entry in names is a promise that, when
fulfilled, leads to an immutable piece (the value property should be created
by `defineProperty` to ensure it is not writeable). There is also an `errors` object which
contains the names of any pieces that errored out in its construction. We also
have a `wait`ing object with the names of pieces that have neither resolved nor
rejected. Each time a name is added to names, there is a task attached to the
promise to remove the name after it is done (finally). 

In addition to the data we have a collection of stamps that live under a scope
arrangement. Each name is matched against the scopes and the first (longest)
match is used to provide the stamp. We start with a base stamp under the `''`
key, and then create new ones based on any needs. These are generally dealt
with in directives and with parsing. 


