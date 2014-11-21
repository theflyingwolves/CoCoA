var express = require('express'),

app = express(),

http = require('http'),

path = require('path'),

errorhandler = require('errorhandler'),

morgan = require('morgan'),

bodyParser = require('body-parser'),

cookieParser = require('cookie-parser'),

methodOverride = require('method-override'),

async = require('async'),

domain = require('domain'),

mongoskin = require('mongoskin'),

db = mongoskin.db('mongodb://localhost:27017/cocoa?auto_reconnect', {safe:true});

var gapi = require('./lib/gapi');

gapis = {};

var gapiArray = [];
var authentication = require('./lib/authentication');
var cca = require('./lib/cca');
var events = require('./lib/events');
var googleSpreadsheet = require('edit-google-spreadsheet');
var helperFunction = require('./lib/helperFunction');

var createDomain = require('domain').create;

app.use(function(req, res, next) {
  var domain = createDomain();

  domain.on('error', function(err) {
    // alternative: next(err)
    res.statusCode = 500;
    res.end(err.message + '\n');

    domain.dispose();
  });
  domain.enter();
  next();
});
rootFolderId = "";
// Add headers
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.use(function(request, response, next) {
  request.db = {};
  request.db.users = db.collection('users');
  request.userinfo ={};
  next();
});


app.use(bodyParser.json());
app.use(cookieParser());

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(morgan('dev'));
app.use(cookieParser());
app.use(methodOverride());

app.get('/', function(req, res) {
    res.redirect(gapi.authUrl);
});

app.get('/oauth2callback', authentication.login);

app.get('/:user_id/cca',cca.getCCA);
app.post('/:user_id/cca',cca.postCCA);
app.get('/:user_id/cca/:cca_id/events',events.getEvents);
app.post('/:user_id/cca/:cca_id/events',events.postEvents);

app.put('/:user_id/cca/:cca_id/events',events.putEvents);

app.get('/:user_id/cca/:cca_id/events/:event_id',events.getEventDetail);

app.get('/:user_id/allStudents/:CCAName', helperFunction.getAllStudents);
app.get('/:user_id/allStudents', helperFunction.getAllStudents);


app.get('/:user_id/membersOfCCA/:CCAName', helperFunction.getMembersOfCCA);
app.get('/:user_id/membersOfCCA/:CCAName/:eventName', helperFunction.getMembersOfCCA);
app.put('/:user_id/membersOfCCA', helperFunction.updateMembersOfCCA);


app.get('/:user_id/participants/:CCAName/:eventName', helperFunction.getParticipants); //API changed,remember to update
app.get('/:user_id/participants/:CCAName/:eventName/:taskName', helperFunction.getParticipants); //API changed,remember to update
app.put('/:user_id/participants', helperFunction.updateParticipants);

app.post('/:user_id/tasks', helperFunction.createTask);

app.put('/:user_id/taskStatus', helperFunction.changeTaskStatus);

if ('development' == app.get('env')) {

app.use(errorhandler());

}
var server = app.listen(3000);

console.log('Express server started on port %s', server.address().port);
