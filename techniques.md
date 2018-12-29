# Techniques

This is an informative piece discussing some of our less commonly used techniques in detail. 

## Promise of a promise

One of the big pieces of a piece is that it can call other pieces. It may call
pieces that have not yet been computed, possibly not even defined. So our
technique is that we create a promise that will get fulfilled when a piece has
its value created. We do this as follows. 

A new Promise takes in a callback that has a resolve and a reject parameter.
These are functions that are to be called depending on if it is resolved or
rejected. By creating callback functions, we can finish the promises and then
the waiting pieces can continue on with their lives. 

Some simple code

    function get (name) {
        if (names.hasOwnProperty(name) ) {
            return names[name].prom; // promise
        }
        let res, rej;
        const prom = new Promise(resolve, reject) {
            res = resolve;
            rej = reject;
        }
        names[name] = {res, rej, prom};
        return prom;
    }

Essentially, this allows us to resolve or reject this whenever we need to. We
always return the promise after registering so it does not matter if it
exists, does not, or is resolved or rejected. 

Then the receiving code could be like, inside of an async function, probably
in a loop or something

    try {
        let sub = await get(name);
        return sub.value;
    } catch (e) {
        rej({msg: "Error in retrieving " + name + " for " + myname, 
            error: e}
    }

Need some collecting code for promises here. 

