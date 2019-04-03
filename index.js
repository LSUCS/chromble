const {app, 
       BrowserView,
	   BrowserWindow, 
	   dialog,
       globalShortcut,
	   net} = require('electron');
const electron = require('electron');
const fs = require('fs');
const ini = require('ini');

// Globally referencing the main browser window + subwindows
let env, pres_win, tourn_win, twitch_win = null;
var is_streaming = false;
var mode = 0;

function refreshPres(type) {
	if (!is_streaming) {
        switch (type) {
            case 0:
                pres_win.reload();
                break;
            case 1:
                tourn_win.reload();
                break;
            default:
                console.log('Unknown refresh code!');
                break;
        }
		
	}
}

function welcomeDialog() {
	console.log('Showing welcome dialog');
	dlgWelcome = dialog.showMessageBox({buttons: ['Open', 'Exit'],
						   title: 'Chromble 2.0',
						   message: 'Welcome to Chromble.\n\n' +
						            'To start, please load a compatible ' +
						            'config file.'});
	if (dlgWelcome == 0) {
		console.log('Open Config selected');
		chooseConfig();
	} else {
		console.log('Exit selected');
		console.log('Quitting program');
		app.quit();
	}
}

function chooseConfig() {
	console.log('Showing open dialog');
	dlgOpen = dialog.showOpenDialog({
						   filters: [{name: 'Chromble Configuration Files',
						              extensions: ['ini', 'conf', 'ccf']}],
						   title: 'Open Config File...',
						   properties: ['openFile']});
	if (dlgOpen != null || dlgOpen[0] != '') {
		console.log('Config file found');
		parseConfig(dlgOpen[0]);
	} else {
		console.log('User provided nothing for config file, showing error.');
		dialog.showErrorBox('No config file', 'Invalid file name or no file name specified.');
		console.log('Returning to welcome screen');
		welcomeDialog();
	}
}

function parseConfig(confFile) {
	console.log('Parsing config file...');
	// Use ini lib to parse the file w/ utf8 encoding
	try {
		var config = ini.parse(fs.readFileSync(confFile, 'utf-8'));
        // Add screen size to the env
        const {width, height} = electron.screen.getPrimaryDisplay().size
		var env = { lanName: config.chromble.lan_name,
                    mainPresUrl: config.chromble.pres_url_main,
                    tournPresUrl: config.chromble.pres_url_tourn,
                    twitchUser: config.chromble.twitch_user,
                    mainPresRefresh: config.chromble.pres_main_refresh_interval,
                    tournPresRefresh: config.chromble.pres_tourn_refresh_interval,
                    scrWidth: width,
                    scrHeight: height
        };
		// Evoke the kiosk now.
        createWindow(env);
	} catch (ex) {
		console.log('Could not parse config: ' + ex);
		dialog.showErrorBox('Invalid File', 'Could not parse the config file.\nEnsure you have the [chromble] tag in your config and that your entries are spelt correctly.');
		console.log('Returning to welcome screen');
		welcomeDialog();
	}
	
}

function createWindow(env) {
	console.log('Opening kiosk browser window...');
	// Create two frameless adjacent browser windows.
	pres_win = new BrowserWindow({ x: 0, y: 0, width: env.scrWidth / 2, height: env.scrHeight, 
                                   backgroundColor: '#000000', // Give a black background for refresh.
                                   autoHideMenuBar: true,
                                   fullscreen: false,
                                   resizable: false, frame: false
    });
    
    tourn_win = new BrowserWindow({ x: env.scrWidth / 2, y: 0, width: env.scrWidth / 2, height: env.scrHeight,
                                    backgroundColor: '#000000',
                                    autoHideMenuBar: true,
                                    resizable: false, frame: false
    });
    
    twitch_win = new BrowserWindow({ x: 0, y: 0, width: env.scrWidth, height: env.scrHeight,
                                    backgroundColor: '#000000',
                                    autoHideMenuBar: true,
                                    fullscreen: true, show: false,
                                    resizable: true, frame: false
    });
	
	// By default, load up the presentation URL + set up twitch API checking.
	switchToPres(env);
	setInterval(refreshPres, env.mainPresRefresh * 60000, 0);
    setInterval(refreshPres, env.tournPresRefresh * 60000, 1);
    
    // Register manual view switch shortcut (Ctrl+Alt+S)
    globalShortcut.register('CmdOrCtrl+Alt+S', () => {
        if (mode == 1) {
            switchToPres(env);
        } else {
            switchToTwitch(env);
        }
    });
    
    // Register manual refresh shortcut (Ctrl+Alt+R)
    globalShortcut.register('CmdOrCtrl+Alt+R', () => {
        if (mode == 0) {
            refreshPres(0);
            refreshPres(1);
        }
    });

	// Add on closed listeners to free window pointer on app exit.
	pres_win.on('closed', () => {
        globalShortcut.unregisterAll()
		pres_win = null;
        tourn_win = null;
        twitch_win = null;
		app.quit();
	});
    tourn_win.on('closed', () => {
        globalShortcut.unregisterAll()
		pres_win = null;
        tourn_win = null;
        twitch_win = null;
		app.quit();
	});
    twitch_win.on('closed', () => {
        globalShortcut.unregisterAll()
		pres_win = null;
        tourn_win = null;
        twitch_win = null;
		app.quit();
	});
    
}

function switchToTwitch(env) {
	console.log('Switching to twitch player...');
    mode = 1;
    // Only show the twitch window.
    tourn_win.hide();
    pres_win.hide();
    twitch_win.show();
	twitch_win.loadURL('https://player.twitch.tv/?channel=' + env.twitchUser + '&autoplay=true');
}

function switchToPres(env) {
	console.log('Switching to presentation player...');
    mode = 0;
    // redisplay both windows.
    twitch_win.hide();
    pres_win.show();
    tourn_win.show();
	pres_win.loadURL(env.mainPresUrl);
    tourn_win.loadURL(env.tournPresUrl);
}

// Open setup menu when electron has loaded.
app.on('ready', welcomeDialog);
console.log('Chromble 2.1.0 running');
