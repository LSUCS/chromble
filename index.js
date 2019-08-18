const {app, 
       BrowserView,
	   BrowserWindow, 
	   dialog,
       globalShortcut,
	   net} = require('electron');
const electron = require('electron');
const fs = require('fs');

// Globally referencing the main browser window + subwindows
var env, pres_win, tourn_win, twitch_win = null;
var is_streaming = false;
var mode = 0;
var apiKeyFileName = "api_key";

// Twitch API
function checkTwitch(env) {
	console.log('Querying Twitch API');
	
	var request = net.request({
				method: 'GET',
				protocol: 'https:',
				hostname: 'api.twitch.tv',
				port: 443,
				path: '/helix/streams/?user_login=' + env.twitch_user});
	request.setHeader('Client-ID', env.twitch_client_id);
	
	request.on('response', (res) => {
	
		console.log('Got status: ' + res.statusCode);
		
		res.setEncoding('utf8');
		
		res.on('error', (err) => {
			console.log('Got error: ' + JSON.stringify(err));
			console.log('Could not query Twitch API!');
			return;
		});
		
		res.on('data', (stream) => {
			try {
				var twitch_json = JSON.parse(stream);
				if (twitch_json.data.length > 0) {
					console.log(env.twitch_user + ' is live!');
					if (!is_streaming) {
						is_streaming = true;
						switchToTwitch(env);
					} 
				} else {
					console.log(env.twitch_user + ' is offline.');
					if (is_streaming) {
						is_streaming = false;
						switchToPres(env);
					}
				}
			} catch (ex) {
				console.log('Could not query Twitch API!');
			}
		});
	});
	request.end();
}


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

function setup() {
    console.log('Loading api_key...');
    var apiKey = fs.readFileSync(apiKeyFileName, 'utf8');
    if (!apiKey) {
        dialog.showErrorBox('Key Error', 'Could not load API key!');
        app.quit();
    }
	console.log('Attempting to load configuration from LAN website...');

	var request = net.request('https://lan.lsucs.org.uk/api/presentationdata?api_key=' + apiKey);
	request.on('response', (res) => {
		console.log('Got status: ' + res.statusCode);
		res.setEncoding('utf8');

		res.on('error', (err) => {
			console.log('Got error: ' + JSON.stringify(err));
			console.log('Could not query LAN API!');
			app.quit();
		});
		
		res.on('data', (stream) => {
			try {
				var lanEnv = JSON.parse(stream);
                parseConfig(lanEnv);
			} catch (ex) {
				console.log('Could not query LAN API: ' + ex);
                app.quit();
			}
		});

	});
	request.end();
}

function parseConfig(lanEnv) {
	console.log('Parsing webconfig...');
	try {
        // make global environment
        env = lanEnv;
        // Add screen size to the env
        const {width, height} = electron.screen.getPrimaryDisplay().size;
        // Add width and height to the environment
		env.scrWidth = width; env.scrHeight = height;
		// Evoke the kiosk now.
        createWindow(env);
	} catch (ex) {
		console.log('Could not parse webconfig: ' + ex);
		app.quit();
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
	setInterval(refreshPres, env.pres_refresh * 60000, 0);
    setInterval(refreshPres, env.twitch_check * 60000, 1);
    
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
	pres_win.loadURL(env.main_pres_url);
    tourn_win.loadURL(env.tourn_pres_url);
}

// Open setup menu when electron has loaded.
app.on('ready', setup);
console.log('Chromble 3.0.0 running');
