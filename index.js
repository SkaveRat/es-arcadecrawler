var jsdom = require("jsdom");
var request = require('request');
var fs = require("fs");
var jquery = fs.readFileSync("./lib/jquery.js", "utf-8");

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('mame.db');

var args = process.argv.slice(2);

var romDir = args[0];
var gameList = [];
var doneCounter = 0;

var starttime;


if(!romDir)
	throw Error("No path secified. Use path to roms as argument");


db.serialize(function() {
	db.run("CREATE TABLE IF NOT EXISTS arcadegames (id INTEGER PRIMARY KEY NOT NULL, master_id INTEGER, shortname TEXT, name TEXT, ignore BOOLEAN DEFAULT false)");

	if(args[1] == "truncate") {
		db.run("DELETE FROM arcadegames");
		console.log("Truncated table");
	}

	console.log("Database set up");

	readDirectory();
});

function readDirectory() {
	fs.readdir(romDir, function(err, files) {

		console.log("Found %d files", files.length);

		files.map(handleFile);

		console.log("Found %d possible games", gameList.length);
		console.log("Starting crawl");
		starttime = Date.now();
		gameList.map(fetchGameData);
	});
}

function handleFile(filename) {
	var fileParts = filename.match(new RegExp(/(.*)\.zip$/i));
	if(!fileParts) return;

	gameList.push(fileParts[1]);
}


function fetchGameData(gamename) {
	request('http://www.mamedb.com/game/' + gamename, function (err, response, body) {
		if (!err && response.statusCode == 200) {
			jsdom.env(
				{
					html: body,
					src: [jquery],
					done: function(err, window) {parseMamedb(err, window, gamename)}
				}
			);
		}else{
			console.log("%s NOT FOUND: %s", logLine(), gamename);
		}

		doneCounter++;
	});
}

function logLine() {
	var timelapsed = (Date.now() - starttime) / 1000;
	var crawlTime = timelapsed / doneCounter;
	var remainingSeconds = Math.round((gameList.length - doneCounter) * crawlTime);

	var remaining = remainingSeconds + 's';
	if(remainingSeconds > 300)
		remaining = Math.round(remainingSeconds / 60) + 'min';

	if(remainingSeconds > 3600){
		var hours = Math.floor(remainingSeconds / 3600);
		var minutes = Math.round(remainingSeconds % (hours * 3600) / 60);

		remaining = hours + 'h ' + minutes + 'min';
	}

	return '[' + (doneCounter) + '/' + gameList.length + '] [' + remaining + '] -';
}

function parseMamedb(err, window, gamename) {
	if(err) {
		console.log("%s Error parsing page on game: %s",logLine(), gamename);
		return;
	}


	var $ = window.$;
	var nameRegex = new RegExp(/<h1>([\w\s\(\)\-',\/\.:\?]+) \(MAME version \d\.\d+\)/);

	var game_id = $('input[name="game_id"]').val();
	var master_game_id = $('input[name="master_game_id"]').val();
	var formattedName = $('body').html().match(nameRegex);

	if(!formattedName){
		console.log("ERROR name not parsed: %s", gamename);
		return;
	}


	db.run("INSERT INTO arcadegames (id, master_id, shortname, name) VALUES (?,?,?,?)", game_id, master_game_id, gamename, formattedName[1]);

	console.log('%s %s: %s/%s - %s', logLine(), gamename, game_id, master_game_id, formattedName[1]);
}