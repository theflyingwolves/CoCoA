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

gapi = require('./lib/gapi');
var googleSpreadsheet = require('edit-google-spreadsheet');

if ('development' == app.get('env')) {

app.use(errorhandler());

}

app.use(bodyParser.json());
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

app.get('/oauth2callback', function(request, response) {
    var code = request.query.code;
    gapi.oauth2Client.getToken(code, function(err, tokens){
        gapi.oauth2Client.setCredentials(tokens);
        gapi.googleDrive.files.list({
            'access_token':gapi.oauth2Client.credentials.access_token,
            'q':"title = 'CCA-Admin'"
        }, function(err,res){
            if(res.items.length == 1){
                rootFolderId = res.items[0].id;
                console.log("root file's id is "+rootFolderId);
            }
            else{
                response.send("You have more than one CCA-Admin Folder");
            }
        });
    });
    var locals = {
        title: 'What are you doing?',
        url: gapi.authUrl
    };
    response.render('index.jade', locals);
});

app.post('/cca', function(request,response){
    console.log("fetch root folder id in create-cca: "+rootFolderId);
    gapi.googleDrive.files.insert({
        resource: {
            title: request.body.cca_title,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [{
            "kind":"drive#fileLink",
            "id":rootFolderId
            }]
        }
    },
        function(err,res){
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
                    title: res.title+"-CCA Record",
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
                    title: res.title+"-List of Events",
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
                    title: res.title+"-Student Details",
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
    response.send("successful create cca");
});

app.get('/cca', function(request,response){
    var ccaList = [];
    gapi.googleDrive.files.list({
        'access_token':gapi.oauth2Client.credentials.access_token,
        'q':"'"+rootFolderId+"' in parents"
    }, function(err,res){
        async.each(res.items, function(item,callback){
            var cca = {};
            cca.title = item.title;
            cca.id = item.id;
            ccaList.push(cca);
            callback();
        }, function(err){
            if(err){
                console.log(err);
            } else{
                response.send(JSON.stringify(ccaList,null,4));
            }
        });
    });
});

app.post('/cca/:id/events', function(request,response){
    gapi.googleDrive.files.insert({
        resource: {
            title: request.body.event_title,
            mimeType: 'application/vnd.google-apps.spreadsheet',
            parents: [{
            "kind":"drive#fileLink",
            "id":request.body.event_folder_id
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
                    spreadsheet.add([['Name of Student','ID','Level','Class']]);
                    spreadsheet.send(function(err) {
                    if(err) throw err;
                    console.log("created successfully");
                });
            });
        response.send({"event_title":request.body.event_title,"event_spreadsheet_id":res.id});
    });
});

var server = app.listen(3000);

console.log('Express server started on port %s', server.address().port);
