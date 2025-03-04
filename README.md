# Snake for Game Boy

A version of Snake programmed for the Game Boy. Binary download and browser-playable version available [on my website](http://donaldhays.com/projects/snake/).

## Building

I built this project on macOS. The instructions should be pretty easy to follow from most UNIX-y operating systems. Windows users may have some troubles with the build scripts.

The build pipeline has a dependency on [node.js](http://nodejs.org). You'll need to install it.

`cd` into `builder/` and run `npm install`.

Also in `builder/`, create a folder called `bin` and copy RGBDS' `asm`, `lib`, `link`, and `rgbfix` executables (with those names) into it.

`cd` back to the project root directory. Run `node build`. The output will be in `build/bin/`. Also note that the build process will generate `asm` files in `img/`. You can look at, but not modify, those files (they're rewritten every time you build).
