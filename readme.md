Chromble
----------

A bespoke web browser for [LSUVGS](https://lsuvgs.org.uk) LAN events, implemented
using Electron.

**Features**

- Use of configuration files to setup program once every LAN.
- Attended switching between the presentation and twitch.tv stream.
- Split screen functionality, allowing tournament results to be displayed
with the main presentation.
- kareem

**Why?**

- We need a web browser to even show these pages in the first place.
- Electron seems logical since we're already using chrome.
- Could use AutoHotKey but needed a bit more direction in how things worked.

**Setup**

Electron is based on node.js, so all that is needed to run the program on 
clone is:

```
npm install - To install dependencies (once only)
npm start
```

To compile a binary, use electron-builder. Commands for this are setup in the
package.json already. ~~If you're too lazy to do this, go to the releases tab
to find some prebuilt packages.~~ or not lol

**Usage**

You will need a config file to run Chromble. Look in the 'config' folder
for an example.

Other than that, just follow the prompts after running the application.

To switch between twitch and the presentation modes, do Ctrl-Alt-S.

To refresh the page, do Ctrl-Alt-R (the program does this automatically
after a specified amount of time.)

To exit, press escape on the keyboard.

**Licence**

This program is under Apache2, which you have probably recieved a billion
copies of by now.

If for some reason you don't have it, a copy is included in this repository, 
or at https://apache.org/licences.
