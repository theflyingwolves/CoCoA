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

app.get('/oauth2callback', function(request, response) {
    var code = request.query.code;
    gapi.oauth2Client.getToken(code, function(err, tokens){
        gapi.oauth2Client.setCredentials(tokens);
        gapi.googleDrive.files.list({
            'access_token':gapi.oauth2Client.credentials.access_token,
            'q':"title = 'CCA-Admin'"
        }, function(err,res){
            if (err) {
                console.log(err);
                response.send("login error");
            } else {
                if(res.items.length == 1){
                    rootFolderId = res.items[0].id;
                    console.log("root file's id is "+rootFolderId);
                }
                else{
                    response.send("You have more than one CCA-Admin Folder");
                }
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
                    title: res.title+"-Events",
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
            response.send({"cca_title":request.body.cca_title,"cca_id":res.id});

            console.log("create a new folder under CCA-Admin");
    });
});

app.get('/cca', function(request,response){
    var ccaList = [];
    gapi.googleDrive.files.list({
        'access_token':gapi.oauth2Client.credentials.access_token,
        'q':"'"+rootFolderId+"' in parents"
    }, function(err,res){
        async.each(res.items, function(item,callback){
            var cca = {};
            cca.id = item.id;
            cca.title = item.title;
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

app.get('/cca/:cca_id/events', function(request,response){
    var events = {};
    gapi.googleDrive.files.get({
        "fileId": request.params.cca_id
    },
    function(err,res){
        async.series([
            function(serialCallback){
                gapi.googleDrive.files.list({
                    'access_token':gapi.oauth2Client.credentials.access_token,
                    'q':"'"+request.params.cca_id+"' in parents and title = '"+res.title+"-List of Events'"
                },  
                function(err,res){
                    googleSpreadsheet.load({
                        debug:true,
                        spreadsheetId:res.items[0].id,
                        worksheetId:'od6',
                        accessToken:{
                            type:'Bearer',
                            token:gapi.oauth2Client.credentials.access_token
                        }
                    },
                    function sheetReady(err, spreadsheet) {
                        if(err) throw err;
                        spreadsheet.receive(function(err,rows,info){
                            if (err) throw err;
                            events.list_of_events = rows;
                        });
                    });
                });
                serialCallback(null,'get list of events');
            },
            function(serialCallback){
                gapi.googleDrive.files.list({
                    'access_token':gapi.oauth2Client.credentials.access_token,
                    'q':"'"+request.params.cca_id+"' in parents and title = '"+res.title+"-Events'"
                },
                function(err,res){
                    gapi.googleDrive.files.list({
                        'access_token':gapi.oauth2Client.credentials.access_token,
                        'q':"'"+res.items[0].id+"' in parents"
                    },
                    function(err,res){
                        var eventSpreadsheets = [];
                        async.each(res.items, function(item,eachCallback){
                            var evt = {};
                            evt.id = item.id;
                            evt.title = item.title;
                            eventSpreadsheets.push(evt);
                            eachCallback(null,'get each event spreadsheet ID');
                        },
                        function(err){
                            if(err) throw err;
                            events.spreadsheets = eventSpreadsheets;
                            response.send(events);
                        });
                    });
                });
                serialCallback(null,'get event spreadsheet IDs');
            }
        ],
        function(err,result){
            if(err) throw err;
        });
    });
});

app.post('/cca/:cca_id/events', function(request,response){
    var events = {};
    gapi.googleDrive.files.get({
        "fileId": request.params.cca_id
    },
    function(err,res){
        //insert a new line into List of Events spreadsheet
        gapi.googleDrive.files.list({
            'access_token':gapi.oauth2Client.credentials.access_token,
            'q':"'"+request.params.cca_id+"' in parents and title = '"+res.title+"-List of Events'"
        },
        function(err,res){
            googleSpreadsheet.load({
                debug:true,
                spreadsheetId:res.items[0].id,
                worksheetId:'od6',
                accessToken:{
                    type:'Bearer',
                    token:gapi.oauth2Client.credentials.access_token
                }
            },
            function sheetReady(err, spreadsheet) {
                if(err) throw err;
                spreadsheet.receive(function(err,rows,info){
                    if(err) throw err;
                    var data = {};
                    data[info.nextRow] = [[request.body.event_title,request.body.students_needed,'',request.body.starting_date,
                    request.body.end_date,request.body.event_time,request.body.event_Venue,request.body.student_reporting_time,
                    request.body.bus_time,request.body.other_comments,request.body.to_taking_them]];
                    JSON.stringify(data);
                    spreadsheet.add(data);
                    spreadsheet.send(function(err) {
                        if(err) throw err;
                         console.log("append successfully");
                    });
                });
            });
        });
        //end of insert a new line into List of Events spreadsheet

        //insert a new spreadsheet in Events folder
        gapi.googleDrive.files.list({
            'access_token':gapi.oauth2Client.credentials.access_token,
            'q':"'"+request.params.cca_id+"' in parents and title = '"+res.title+"-Events'"
        },
        function(err,res){
            gapi.googleDrive.files.insert({
                resource: {
                    title: request.body.event_title,
                    mimeType: 'application/vnd.google-apps.spreadsheet',
                    parents: [{
                    "kind":"drive#fileLink",
                    "id":res.items[0].id
                    }]
                }
            },
            function(err,res){
                googleSpreadsheet.load({
                    debug:true,
                    spreadsheetId:res.id,
                    worksheetId:'od6',
                    accessToken:{
                        type:'Bearer',
                        token:gapi.oauth2Client.credentials.access_token
                    }
                },
                function sheetReady(err, spreadsheet) {
                        if(err) throw err;
                        spreadsheet.add([['Name of Student','ID','Level','Class']]);
                        spreadsheet.send(function(err) {
                        if(err) throw err;
                        console.log("event spreadsheet created successfully");
                    });
                });
                response.send({"event_title":request.body.event_title,"event_spreadsheet_id":res.id});
            });
        });
        //end of insert a new spreadsheet in Events folder  
    });
});

app.get('/allStudents/:CCAName', helperFunction.getAllStudents);
app.get('/allStudents', helperFunction.getAllStudents);


app.get('/MembersOfCCA', helperFunction.getMembersOfCCA);
app.put('/MembersOfCCA', helperFunction.updateMembersOfCCA);
// app.post('/MembersOfCCA', helperFunction.addMembersToCCA);
// app.delete('/MembersOfCCA', helperFunction.deleteMembersFromCCA);

app.get('/participants', helperFunction.getParticipants);
app.post('/participants', helperFunction.addParticipants);
// app.delete('/participants', helperFunction.deleteParticipants);

// app.get('/test/:filename', helperFunction.test);



var server = app.listen(3000);

console.log('Express server started on port %s', server.address().port);
