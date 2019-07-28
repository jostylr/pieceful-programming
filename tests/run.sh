#!/bin/bash

cd ~/programming/pieceful-programming && literate-programming src/runners.md && cd build/sample/pfp && eslint cli.js && sync-pfp && cd ~/programming/pieceful-programming/tests && pfp --out S./codeblocks.md

