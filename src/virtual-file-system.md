# Virtual file system

This allows us to abstract out a bit manipulating files. We use proxy handlers
for a lot of this to make the downstream use of this as transparent as
possible. 

To simplify matter (?),  we are implementing a simple virtual filesystem and
shell interface (including stdin, stdout, and stderr)
that can then be connected to. This should allow us to connect
it up in various ways, particularly in the browser, to deal with what we want.
We can also save the metadata in a JSON object so that we can load and compare
with what has changed.  

This is both for loading and saving files. The keys are the full path relative
to the root directory. For a browser, the paths may indicate different url
routes. The key should point to an object containing, modification data,
checksum, and the contents. The first two is what gets saved for the tree.
This information can give us information telling us what files have changed.
Not sure if loading matters for this at all. By having this virtual system, we
can allow for an interactive confirmation mode where the info of what has
changed gets displayed and can be reviewed before saving.


    module.exports = _"core";

[vfs/index.js](# "save:")

Maybe just use https://www.npmjs.com/package/filer  ???  


## Core

So the core of the idea is that we create an object that has various methods
to be used to save, load, etc, files into the system. This is how a consumer
of an instantiated vfs should use. But the instantation process needs to
include methods that the io calls that actually links to what should happen.
This is kept flexible so that we can limit when stuff is saved. In particular,
all the io functions should have an argument inspection option which can then
fork to different behaviors. Those different behaviors should be loaded
depending on contexts and directives. 

For example, loading a file from the source directory should proceed
immediately (and be cached), but loading something from the build directory
should be a promise waiting to be fulfilled from the compilation of other
stuff. This would facilitate, for example, compiling a markdown file that was
itself generated. Or perhaps being able to run a node script externally for
some purpose or other. 

    function VFS (environment, options = {
        actions: {}
    }) {
        let noop = () => {};
        let self = this;
        let actions = {write, read, list, tex, ...options.actions};
        let filter = {};
        
        let collection = function collection (list, filter, action) {
            
            if (typeof filter === 'string') {
                filter = self.filter[filter] || noop;
            } 
            list.filter(filter)
        };

    }


## Sample

Here is how this module might be used. 

    require('vfs');



