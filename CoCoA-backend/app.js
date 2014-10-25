var express = require('express'),

app = express(),

http = require('http'),

path = require('path'),

errorhandler = require('errorhandler'),

morgan = require('morgan'),

bodyParser = require('body-parser'),

cookieParser = require('cookie-parser'),

methodOverride = require('method-override'),

gapi = require('./lib/gapi');
var googleSpreadsheet = require('edit-google-spreadsheet');

var helperFunction = require('./lib/helperFunction');

if ('development' == app.get('env')) {

app.use(errorhandler());

}

app.use(bodyParser.json());
// app.use(bodyParser.json());
app.use(cookieParser());

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(morgan('dev'));
app.use(cookieParser());
app.use(methodOverride());

app.get('/', function(req, res) {
    var locals = {
        title: 'This is my sample app',
        url: gapi.authUrl
    };
    res.render('index.jade', locals);
});

app.get('/oauth2callback', function(req, res) {
    var code = req.query.code;
    gapi.oauth2Client.getToken(code, function(err, tokens){
        gapi.oauth2Client.setCredentials(tokens);
        gapi.googleDrive.files.list({'access_token':gapi.oauth2Client.credentials.access_token}, function(req,res){
            var list = res;
           for(var i = 0;i<list.items.length;i++){
                if(list.items[i].title == 'CCA-Admin' && list.items[i].mimeType == 'application/vnd.google-apps.folder'){
                    console.log("root file's id is "+list.items[i].id);
                    rootFolderId = list.items[i].id;
                }
            }
        });
    });
    
    var locals = {
        title: 'What are you doing?',
        url: gapi.authUrl
    };
    res.render('index.jade', locals);
});

app.post('/create-cca', function(req,res){
    console.log("fetch root folder id in create-cca: "+rootFolderId);
    gapi.googleDrive.files.insert({
        resource: {
            title: req.body.cca_title,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [{
            "kind":"drive#fileLink",
            "id":rootFolderId
            }]
        }
    },
        function(req,res){
            gapi.googleDrive.files.insert({
                resource: {
                    title: res.title+"-events",
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [
                    {
                    "kind":"drive#fileLink",
                    "id":res.id
                    }]
                }
            }, function(err,res){
                console.log("create events folder successfully");
            });

            gapi.googleDrive.files.insert({
                resource: {
                    title: res.title+" - CCA Record",
                    mimeType: 'application/vnd.google-apps.spreadsheet',
                    parents: [
                    {
                    "kind":"drive#fileLink",
                    "id":res.id
                    }]
                }
            },  function(err,res){
                    googleSpreadsheet.load({
                        debug:true,
                        spreadsheetId:res.id,
                        worksheetId:'od6',
                        accessToken:{
                            type:'Bearer',
                            token:gapi.oauth2Client.credentials.access_token
                        }
                    },  function sheetReady(err, spreadsheet) {
                            if(err) throw err;
                            spreadsheet.add([['Name','ID','Level','Class']]);
                            spreadsheet.send(function(err) {
                            if(err) throw err;
                            console.log("Updated successfully");
                        });
                    });
                console.log("create cca-record spreadsheet successfully");
            });

            gapi.googleDrive.files.insert({
                resource: {
                    title: res.title+" - List of Events",
                    mimeType: 'application/vnd.google-apps.spreadsheet',
                    parents: [
                    {
                    "kind":"drive#fileLink",
                    "id":res.id
                    }]
                }
            },  function(err,res){
                    googleSpreadsheet.load({
                        debug:true,
                        spreadsheetId:res.id,
                        worksheetId:'od6',
                        accessToken:{
                            type:'Bearer',
                            token:gapi.oauth2Client.credentials.access_token
                        }
                    },  function sheetReady(err, spreadsheet) {
                            if(err) throw err;
                            spreadsheet.add([['Name of Event','Students Needed','Students Selected','Starting Date',
                            'End Date','Event Time','Event Venue','Student Reporting Time + Venue',
                            'Bus Timing','Other Comments','TO taking them']]);
                            spreadsheet.send(function(err) {
                            if(err) throw err;
                            console.log("Updated successfully");
                        });
                    });
                console.log("create list of events spreadsheet successfully");
            });

            gapi.googleDrive.files.insert({
                resource: {
                    title: res.title+" - Student Details",
                    mimeType: 'application/vnd.google-apps.spreadsheet',
                    parents: [
                    {
                    "kind":"drive#fileLink",
                    "id":res.id
                    }]
                }
            }, function(err,res){
                    googleSpreadsheet.load({
                        debug:true,
                        spreadsheetId:res.id,
                        worksheetId:'od6',
                        accessToken:{
                            type:'Bearer',
                            token:gapi.oauth2Client.credentials.access_token
                        }
                    },  function sheetReady(err, spreadsheet) {
                            if(err) throw err;
                            spreadsheet.add([['Name','ID','Level','Class','Race','Nationality','Guardian Contact 1',
                            'Guardian Contact 2','Guardian Contact 3','Medical Concern']]);
                            spreadsheet.send(function(err) {
                            if(err) throw err;
                            console.log("Updated successfully");
                        });
                    });
                console.log("create students details spreadsheet successfully");
            });
            console.log("create a new folder under CCA-Admin");
    });
    res.send("successful");
});

app.get('/allStudents', helperFunction.getAllStudents);

app.get('/MembersOfCCA', helperFunction.getMembersOfCCA);
app.post('/MembersOfCCA', helperFunction.addMembersToCCA);

app.get('/participants', helperFunction.getParticipants);
app.post('/participants', helperFunction.addParticipants);
// app.delete('/participants', helperFunction.deleteParticipants);

// app.delete('/MembersOfCCA', helperFunction.deleteMembersFromCCA);


var server = app.listen(3000);

console.log('Express server started on port %s', server.address().port);
