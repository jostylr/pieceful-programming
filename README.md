# Pieceful Programming

Pieceful programming is a distillation of the core mechanism that I like
aboute literate-programming, namely, viewing pieces of code, that have their
own explanations, their own processes, and their own placements. Literate
programming was the idea of writing a narrative with code embedded in it and
that code would get transpiled into a code file that a computer could use. The
narrative was what humans could use. 

I wrote a tool that does with markdown. But it occurred to me that it can be
generalized to lots of different formats, parsers, graphical environments,
whatever, and that the core of it was having these chunks. 

This repository will contain the core processing element, upgrading the
previous work flow to allow full asynchronous working, and it will include, in
the fashion of a mono-repo, many of the processing dependencies. 

Not clear yet to what extent a default parser and syntax will be included.
Probably need it in order to have some sane testing, at least a parser for the
commands embedded in the code. Not sure how to avoid that. And it may not be
that big a deal to hook in the markdown parser, probably as a command called
md-parser though ideally that would be separated out within the monorepo. The
core pieceful programming module should be very minimal, followed by a module
with the extra commands as well as a separate module with the md parsing, etc. 




