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

gapi = require('./lib/gapi');
var googleSpreadsheet = require('edit-google-spreadsheet');
var helperFunction = require('./lib/helperFunction')

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
    
    // var locals = {
    //     title: 'This is my sample app',
    //     url: gapi.authUrl
    // };
    // res.render('index.jade', locals);
    
    res.redirect(gapi.authUrl);
});

app.get('/oauth2callback', function(request, response) {
    var code = request.query.code;
    gapi.oauth2Client.getToken(code, function(err, tokens){
        gapi.oauth2Client.setCredentials(tokens);
        gapi.googleDrive.files.list({
            'access_token':gapi.oauth2Client.credentials.access_token,
            'q':"title = 'CCA-Admin'"
        }, function(err,res){
            // console.log("here is the token:");
            console.log(gapi.oauth2Client.credentials.access_token);
            // console.log(err);
            // console.log(res);
            if(res.items.length == 1){
                // console.log("root id is found")
                rootFolderId = res.items[0].id;
                console.log("root file's id is "+rootFolderId);
            }
            else{
                // console.log("You have more than one CCA-Admin Folder")
                response.send("You have more than one CCA-Admin Folder");
            }
        });
    });
    
    var locals = {
        title: 'What are you doing?',
        url: gapi.authUrl
    };
    response.render('index.jade', locals);
    
    // response.redirect('http://ec2-54-169-115-238.ap-southeast-1.compute.amazonaws.com/www/index.html');
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
        },
        function(err,res){
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
                spreadsheet.add([['Name of Event','Students Needed','Students Selected','Starting Date',
                    'End Date','Event Time','Event Venue','Student Reporting Time + Venue',
                    'Bus Timing','Other Comments','TO taking them', 'Student Tasks']]);
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
        'q':"'"+rootFolderId+"' in parents and trashed = false"
    },
    function(err,res){
        async.each(res.items, function(item,callback){
            var cca = {};
            cca.id = item.id;
            cca.title = item.title;
            ccaList.push(cca);
            callback();
        },
        function(err){
            if(err){
                console.log(err);
            } else{
                response.send(ccaList);
            }
        });
    });
});
/*
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
*/
app.get('/cca/:cca_id/events', function(request,response){
    var events = {};
    gapi.googleDrive.files.get({
        "fileId": request.params.cca_id
    },
    function(err,res){
        if(err) throw err;
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
                    list_of_events = [];
                    //refactor rows
                    var i = 1;
                    for(var key in rows){
                        var obj = rows[key];
                        var j =1;
                        var evt = {};
                        for(var prop in obj){
                            if(i != 1 && obj.hasOwnProperty(prop)){
                                switch(j){
                                    case 1:evt.title = obj[prop]; break;
                                    case 2:evt.studentsNeeded = obj[prop]; break;
                                    case 3:break;
                                    case 4:evt.startDate = obj[prop]; break;
                                    case 5:evt.endDate = obj[prop]; break;
                                    case 6:evt.time = obj[prop]; break;
                                    case 7:evt.venue = obj[prop]; break;
                                    case 8:evt.reportTime = obj[prop]; break;
                                    case 9:evt.busTime = obj[prop]; break;
                                    case 10:evt.comments = obj[prop]; break;
                                    case 11:evt.title = obj[prop]; break;
                                    case 12:evt.studentTasks = obj[prop]; break;
                                    default: break;
                                }
                                j++;
                            }
                        }
                        list_of_events.push(evt);
                        i++;
                    }
                    //end of rafactor rows
                    list_of_events.shift(); //remove the first empty object
                    events.list_of_events = list_of_events;
                    response.send(events);
                });
            });
        });
    });
});

app.post('/cca/:cca_id/events', function(request,response){
    var events = {};
    console.log("here!");
    gapi.googleDrive.files.get({
        "fileId": request.params.cca_id
    },
    function(err,res){
        //insert a new line into List of Events spreadsheet
        console.log(err);
        var CCAName = res.title;
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
                    data[info.nextRow] = [[request.body.event_title,request.body.students_needed,'',request.body.start_date,
                    request.body.end_date,request.body.event_time,request.body.event_venue,request.body.student_report_time,
                    request.body.bus_time,request.body.notes,request.body.to_in_charge, ""]];
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
            var titleForThisEvent = CCAName+"-events-"+request.body.event_title;
            gapi.googleDrive.files.insert({
                resource: {
                    title: titleForThisEvent,
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
                        // spreadsheet.add([['Name of Student','ID','Level','Class']]);
                        spreadsheet.add([['Name','ID','Level','Class','Race','Nationality','Guardian Contact 1',
                            'Guardian Contact 2','Guardian Contact 3','Medical Concern']]);
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
/*
app.update('/cca/:cca_id/events/:event_id',function(request,response){
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
                    data[info.nextRow] = [[request.body.event_title,request.body.students_needed,'',request.body.start_date,
                    request.body.end_date,request.body.event_time,request.body.event_venue,request.body.student_report_time,
                    request.body.bus_time,request.body.notes,request.body.to_in_charge]];
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
    });
});
*/

app.get('/allStudents/:CCAName', helperFunction.getAllStudents);
app.get('/allStudents', helperFunction.getAllStudents);


app.get('/membersOfCCA/:CCAName', helperFunction.getMembersOfCCA);
app.get('/membersOfCCA/:CCAName/:eventName', helperFunction.getMembersOfCCA);
app.put('/membersOfCCA', helperFunction.updateMembersOfCCA);


// app.get('/participants/:CCAName/:eventName', helperFunction.getParticipants); //API changed,remember to update
// app.get('/participants/:CCAName/:eventName/:taskName', helperFunction.getParticipants); //API changed,remember to update
// app.put('/participants', helperFunction.updateParticipants);

app.post('/tasks', helperFunction.createTask);

// app.put('/taskStatus', helperFunction.changeTaskStatus);

/*
// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    console.log("catch error");
    next(err);
});
*/

// production error handler
// no stacktraces leaked to user
/*
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });

});
*/



var server = app.listen(3000);

console.log('Express server started on port %s', server.address().port);
