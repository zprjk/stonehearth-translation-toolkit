'use strict';

var express = require('express'),
	bodyParser = require('body-parser'),
	path = require('path');

//Needed to verify process.cwd because if you run from 'stranslation.exe' or comand line './app node server.js', 
//the working directory will not be the same. I need the working dir in './app' dir
console.log('Starting directory: ' + process.cwd()); 
try {
  process.chdir( path.resolve(process.cwd(), 'app'));
  console.log('New directory: ' + process.cwd());
}
catch (err) {
  console.log('Expected correct path: ' + process.cwd() );
}

var app = module.exports = express();
app.use(bodyParser.urlencoded({ extended: false })) // parse application/x-www-form-urlencoded
app.use(bodyParser.json()) // parse application/json

var routes = require('./routes');
var api = require('./routes/api');

app.set('port', process.env.PORT || 80);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', routes.index);
app.get('/partials/:name', routes.partials);

// API
app.post('/api/checkgitappversion', api.CheckGitAppVersion);
app.post('/api/loadapppackage', api.LoadAppPackage);
app.post('/api/savegamepath', api.SaveGamePath);
app.post('/api/loadgamepath', api.LoadGamePath);
app.post('/api/generatecsv', api.Generate);
app.post('/api/updatecsv', api.UpdateCSV);
app.post('/api/exportstojson', api.ExportsToJson);

//HTML5 History
app.use('/*', routes.index);

app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
