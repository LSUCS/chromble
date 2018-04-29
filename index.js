const {app, 
	   BrowserWindow, 
	   dialog,
	   net} = require('electron');
const fs = require('fs');
const ini = require('ini');

// Globally referencing the main browser window.
let win;
var is_streaming = false;

// Twitch API
function checkTwitch(env) {
	console.log('Querying Twitch API');
	const twitch_stream_api_url='https://api.twitch.tv/helix/streams';
	
	var request = net.request({
				method: 'GET',
				protocol: 'https:',
				hostname: 'api.twitch.tv',
				port: 443,
				path: '/helix/streams/?user_login=' + env.twitchUser});
	request.setHeader('Client-ID', env.twitchClid);
	
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
					console.log(env.twitchUser + ' is live!');
					if (is_streaming == false) {
						is_streaming = true;
						switchToTwitch(env);
					} 
				} else {
					console.log(env.twitchUser + ' is offline.');
					if (is_streaming == true) {
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

function welcomeDialog() {
	console.log('Showing welcome dialog');
	dlgWelcome = dialog.showMessageBox({buttons: ['Open Config', 'Exit'],
						   title: 'Chromble',
						   message: 'Welcome to Chromble, ' +
						            'the bigscreen management program ' + 
						            'for LSUCS LANs.\n\n' +
						            'To start, please load a chromble-compatible ' +
						            'config file below.'});
	if (dlgWelcome == 0) {
		console.log('Open Config selected');
		chooseConfig();
	} else {
		console.log('Exit selected');
		console.log('Quitting program');
		app.quit();
	}
}

function confirmDialog(env) {
	console.log('Showing confirmation dialog');
	dlgConfirm = dialog.showMessageBox({buttons: ['Yes', 'No'],
						   type: 'info',
						   title: 'Confirm',
						   message: 'Your configuration settings are: \n\n' +
						            'Event Name: ' + env.lanName + '\n' +
						            'Presentation URL: Set\n' +
						            'Twitch username: ' + env.twitchUser + '\n' +
						            'Twitch Client ID: Set\n' +
						            'Twitch API Refresh Interval: ' + env.apiRefresh + ' min(s)\n\n' +
						            'Is this arrangement OK?'});
	if (dlgConfirm == 0) {
		console.log('Yes selected');
		kioskDialog(env);
	} else {
		console.log('No selected');
		console.log('Returning to welcome screen');
		welcomeDialog();
	}
}

function kioskDialog(env) {
	console.log('Showing help/warning dialog');
	dlgKiosk = dialog.showMessageBox({buttons: ['Yes', 'No'],
						   type: 'warning',
						   title: 'Warning!',
						   message: 'You are about to enter into kiosk/presentation ' +
						            'mode. To leave, just press escape.\n' +
						            'Is this OK?'});
	if (dlgKiosk == 0) {
		console.log('Yes selected, no going back now!');
		createWindow(env);
	} else {
		console.log('No selected');
		console.log('Returning to welcome screen');
		welcomeDialog();
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
		var env = { lanName: config.chromble.lan_name,
				presUrl: config.chromble.pres_url,
				twitchUser: config.chromble.twitch_user,
				twitchClid: config.chromble.twitch_clid,
				apiRefresh: config.chromble.api_refresh_interval
			  };
		// Pass to confirmation dialog
		confirmDialog(env);
	} catch (ex) {
		console.log('Could not parse config!');
		dialog.showErrorBox('Invalid File', 'Could not parse the config file.\nEnsure you have the [chromble] tag in your config and that your entries are spelt correctly.');
		console.log('Returning to welcome screen');
		welcomeDialog();
	}
	
}

function createWindow(env) {
	console.log('Opening kiosk browser window...');
	// Create full screen browser window
	win = new BrowserWindow({fullscreen: true});
	
	// By default, load up the presentation URL + set up twitch API checking.
	switchToPres(env);
	checkTwitch(env);
	setInterval(checkTwitch, env.apiRefresh * 60000, env);

	// Add on closed listener to free window pointer on app exit.
	win.on('closed', () => {
		win = null;
	});
}

function switchToTwitch(env) {
	console.log('Switching to twitch player...');
	win.loadURL('https://player.twitch.tv/?channel=' + env.twitchUser + '&autoplay=true');
}

function switchToPres(env) {
	console.log('Switching to presentation player...');
	win.loadURL(env.presUrl);
}

// Open setup menu when electron has loaded.
app.on('ready', welcomeDialog);
console.log('Chromble 1.0.0 running');
