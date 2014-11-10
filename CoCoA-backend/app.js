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

app.get('/oauth2callback', function(request, response) {
    var code = request.query.code;
    console.log("code: "+code);
    gapi.oauth2Client.getToken(code, function(err, tokens){
    gapi.oauth2Client.setCredentials(tokens);
        async.waterfall([
            //user login, pass googleId and credentials to follow functions
            function(callback){
                gapi.googlePlus.people.get({ userId: 'me', auth: gapi.oauth2Client }, function(err, res) {
                    if (err) console.log(JSON.stringify(err));
                    var googleId = res.id;
                    //var accessToken = gapi.oauth2Client.credentials.access_token;
                    var credentials = gapi.oauth2Client.credentials;
                   callback(null,googleId,credentials);
                });
            },
            //get user root_folder_id by googleId
            function(googleId,credentials,callback){
                var rootFolderId;
                db.collection('users').find({google_id:googleId}).toArray(function(err, result) {
                    if (err) throw err;
                    //new user
                    if(result.length == 0){
                        db.collection('users').insert({
                            google_id:googleId,
                            credentials:credentials,
                            root_folder_id:""
                        },
                        function(err,res){
                            if (err) throw err;
                            rootFolderId = "";
                            callback(null,googleId,credentials,rootFolderId);
                        });
                    }
                    //return user
                    else{
                        console.log("I'm return user");
                        //check validation of rootFolderId
                        gapi.googleDrive.files.get({
                        'fileId':result[0].root_folder_id
                        },function(err,res){
                            if(res!=null && res.length == 1){
                                rootFolderId = result[0].root_folder_id;
                            }
                            else{
                                console.log("root folder cannot found: ");
                                rootFolderId = "";
                            }
                            callback(null,googleId,credentials,rootFolderId);
                        });
                    }
                });
            },
            //
            function(googleId,credentials,rootFolderId,callback){
                console.log("current rootFolderId: "+rootFolderId);
                if(rootFolderId != null && rootFolderId !=""){
                    db.collection('users').update(
                        {google_id:googleId},
                        {
                        $set:{
                            credentials:credentials
                            }
                        },function(err,res){});
                } else{
                    console.log("find my root folder id");
                    gapi.googleDrive.files.list({
                        'access_token':credentials.access_token,
                        'q':"title = 'CCA-Admin' and trashed = false"
                    }, function(err,res){
                        if(res.items.length == 0){
                            console.log("I dont have");
                            //create CCA_Admin if not found
                             gapi.googleDrive.files.insert({
                                resource: {
                                    title: "CCA-Admin",
                                    mimeType: 'application/vnd.google-apps.folder'
                                }
                            }, function(err,res){
                                if (err) throw err;
                                //update root folder id in database
                                db.collection('users').update(
                                    {
                                        google_id:googleId
                                    },
                                    {
                                    $set:{
                                        credentials:credentials,
                                        root_folder_id:res.id
                                        }
                                    },function(err,res){});

                            });
                            //response.send({"googleId":googleId,"message":"CCA-Admin created"});
                        }
                        else if(res.items.length == 1){
                            console.log("I have a rootFolder");
                            rootFolderId = res.items[0].id;
                            db.collection('users').update(
                                {google_id:googleId},
                                {
                                    $set:{
                                        credentials:credentials,
                                        root_folder_id:rootFolderId
                                    }
                                },function(err,res){});
                                //response.send({"googleId":googleId});
                        }
                        else{
                            console.log("You have more than one CCA-Admin Folder");
                        }
                    });
                }
                callback(null,googleId);
            }],
            function(err, googleId){
                if(err) throw err;
                console.log("auth callback googleId: "+googleId);
                response.redirect('http://ec2-54-169-115-238.ap-southeast-1.compute.amazonaws.com/www/index.html#/app/eventlist/'+googleId);
            });
    });
});

app.get('/:user_id/cca', function(request,response){
    async.waterfall([
        function(waterfallCallback){
             db.collection('users').find({google_id:request.params.user_id}).toArray(function(err, user) {
                if (err) throw err;
                waterfallCallback(null,user);
            });
        },
        function(user,waterfallCallback){
            var ccaList = [];
            gapi.oauth2Client.setCredentials(user[0].credentials);
            gapi.googleDrive.files.list({
                'access_token':user[0].credentials.access_token,
                'q':"'"+user[0].root_folder_id+"' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'"
            },
            function(err,res){
                if(err) throw err;
                async.each(res.items, function(item,eachCallback){
                    var cca = {};
                    cca.id = item.id;
                    cca.title = item.title;
                    ccaList.push(cca);
                    eachCallback();
                },
                function(err){  
                    if(err){
                        console.log(JSON.stringify(err));
                    } else{
                        console.log("ccaList: "+ccaList);
                        response.send(ccaList);
                    }
                });
            });
            //set userinfo cookies
            response.cookie('userinfo',user[0]);
            waterfallCallback(null);
        }
    ],
    function(err,result){
        if (err) throw err;
    });
});

app.post('/:user_id/cca', function(request,response){
    async.waterfall([
        function(waterfallCallback){
             db.collection('users').find({google_id:request.params.user_id}).toArray(function(err, user) {
                if (err) throw err;
                waterfallCallback(null,user);
            });
        },
        function(user,waterfallCallback){
            gapi.oauth2Client.setCredentials(user[0].credentials);
            gapi.googleDrive.files.insert({
                resource: {
                    title: request.body.cca_title,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [{
                    "kind":"drive#fileLink",
                    "id":user[0].root_folder_id
                    }]
                }
            },
            function(err,res){
                if(err) console.log(JSON.stringify(err));
                var cca_id = res.id;
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
                            token:user[0].credentials.access_token
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
                            token:user[0].credentials.access_token
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
                            token:user[0].credentials.access_token
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
                        response.send({"cca_title":request.body.cca_title,"cca_id":cca_id});
                    });
                console.log("create students details spreadsheet successfully");
                });

                console.log("create a new folder under CCA-Admin");
            });
            waterfallCallback(null);
        }
    ],
    function(err,result){
    });
});

app.get('/:user_id/cca/:cca_id/events', function(request,response){

    async.waterfall([
        function(waterfallCallback){
             db.collection('users').find({google_id:request.params.user_id}).toArray(function(err, user) {
                if (err) throw err;
                waterfallCallback(null,user);
            });
        },
        function(user,waterfallCallback){

            // console.log(request.cookies);
            var returnJSON = {};
            var list_of_events = [];
            var list_of_event_ids = [];
            var list_of_students = [];
            gapi.oauth2Client.setCredentials(user[0].credentials);
            gapi.googleDrive.files.get({
                "fileId": request.params.cca_id
            },
            function(err,res){
                if(err) throw err;
                // console.log(res);
                async.series([
                    function(callback){
                        //start of retriving event details
                        gapi.googleDrive.files.list({
                            'access_token':user[0].credentials.access_token,
                            'q':"'"+request.params.cca_id+"' in parents and title = '"+res.title+"-List of Events'"
                        },
                        function(err,res){
                            console.log(err);
                            console.log(res);
                            googleSpreadsheet.load({
                                debug:true,
                                spreadsheetId:res.items[0].id,
                                worksheetId:'od6',
                                accessToken:{
                                    type:'Bearer',
                                    token:user[0].credentials.access_token
                                }
                            },
                            function sheetReady(err, spreadsheet) {
                                if(err) throw err;
                                spreadsheet.receive(function(err,rows,info){
                                    if (err) throw err;
                                    //refactor rows
                                    var i = 1;
                                    for(var key in rows){
                                        var obj = rows[key];
                                        var j =1;
                                        var evt = {};
                                        for(var prop in obj){
                                            if(i != 1 && obj.hasOwnProperty(prop)){
                                                var col = parseInt(prop);
                                                switch(col){
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
                                                    case 11:evt.TOIC = obj[prop]; break;
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
                                    //returnJSON.list_of_events = list_of_events;
                                    callback();
                                });
                            });
                        });
                        //end of retriving event details
                    },
                    function(callback){
                        gapi.googleDrive.files.list({
                            'access_token':user[0].credentials.access_token,
                            'q':"'"+request.params.cca_id+"' in parents and title = '"+res.title+"-Events'"
                        },
                        function(err,res){
                            gapi.googleDrive.files.list({
                                'access_token':user[0].credentials.access_token,
                                'q':"'"+res.items[0].id+"' in parents and trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet'"
                            },
                            function(err,res){
                                async.each(res.items, function(item,eachCallback){
                                    var event = {};
                                    event.id = item.id;
                                    var n = item.title.search("-");
                                    cca_title = item.title.substr(0,n);
                                    var sub_spreadsheet_title = item.title.substr(n+1);
                                    var m = sub_spreadsheet_title.search("-");
                                    event.title = sub_spreadsheet_title.substr(m+1);
                                    list_of_event_ids.push(event);
                                    eachCallback();
                                },
                                function(err){
                                    if(err){
                                        console.log(err);
                                    } else{
                                        //add id in list of events
                                        for(var i = 0;i<list_of_events.length;i++){
                                            var event_title = list_of_events[i].title;
                                            for (var j = 0;j<list_of_event_ids.length;j++){
                                                if(event_title == list_of_event_ids[j].title){
                                                    list_of_events[i]["id"] = list_of_event_ids[j].id;
                                                }
                                            }
                                        }
                                        returnJSON.list_of_events = list_of_events;
                                        response.send(returnJSON);
                                    }
                                });
                            });

                        });
                    }
                ],
                function(err,result){
                    if(err) throw err;
                });
            });
            waterfallCallback(null);
        }
    ],
    function(err,result){
    });
});

app.post('/:user_id/cca/:cca_id/events', function(request,response){
    async.waterfall([
        function(waterfallCallback){
             db.collection('users').find({google_id:request.params.user_id}).toArray(function(err, user) {
                if (err) throw err;
                waterfallCallback(null,user);
            });
        },
        function(user,waterfallCallback){
            var events = {};
            gapi.oauth2Client.setCredentials(user[0].credentials);
            gapi.googleDrive.files.get({
                "fileId": request.params.cca_id
            },
            function(err,res){
                var cca_title = res.title;
                var event_title = request.body.event_title;
                //insert a new line into List of Events spreadsheet
                gapi.googleDrive.files.list({
                    'access_token':user[0].credentials.access_token,
                    'q':"'"+request.params.cca_id+"' in parents and title = '"+cca_title+"-List of Events' and trashed = false"
                },
                function(err,res){
                    googleSpreadsheet.load({
                        debug:true,
                        spreadsheetId:res.items[0].id,
                        worksheetId:'od6',
                        accessToken:{
                            type:'Bearer',
                            token:user[0].credentials.access_token
                        }
                    },
                    function sheetReady(err, spreadsheet) {
                        if(err) throw err;
                        spreadsheet.receive(function(err,rows,info){
                            if(err) throw err;
                            var data = {};
                            // data[info.nextRow] = [[request.body.title,request.body.studentsNeeded,'',request.body.startDate,
                            // request.body.endDate,request.body.time,request.body.venue,request.body.reportTime,
                            // request.body.busTime,request.body.comments,request.body.TOIC]];
                            data[info.nextRow] = [[event_title]];
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
                    'access_token':user[0].credentials.access_token,
                    'q':"'"+request.params.cca_id+"' in parents and title = '"+cca_title+"-Events' and trashed = false"
                },
                function(err,res){
                    gapi.googleDrive.files.insert({
                        resource: {
                            title: cca_title+"-events-"+event_title,
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
                                token:user[0].credentials.access_token
                            }
                        },
                        function sheetReady(err, spreadsheet) {
                                if(err) throw err;
                                spreadsheet.add([['Name','ID','Level','Class','Race','Nationality','Guardian Contact 1',
                        'Guardian Contact 2','Guardian Contact 3','Medical Concern']]);
                                spreadsheet.send(function(err) {
                                if(err) throw err;
                                console.log("event spreadsheet created successfully");
                            });
                        });
                        response.send({"title":request.body.event_title,"event_spreadsheet_id":res.id});
                    });
                });
                //end of insert a new spreadsheet in Events folder  
            });
            waterfallCallback(null);
        }
    ],
    function(err,result){

    });
});

app.put('/:user_id/cca/:cca_id/events',function(request,response){
    async.waterfall([
        function(waterfallCallback){
             db.collection('users').find({google_id:request.params.user_id}).toArray(function(err, user) {
                if (err) throw err;
                waterfallCallback(null,user);
            });
        },
        function(user,waterfallCallback){
            var events = {};
            gapi.oauth2Client.setCredentials(user[0].credentials);
            gapi.googleDrive.files.get({
                "fileId": request.params.cca_id
            },
            function(err,res){
                //insert a new line into List of Events spreadsheet
                gapi.googleDrive.files.list({
                    'access_token':user[0].credentials.access_token,
                    'q':"'"+request.params.cca_id+"' in parents and title = '"+res.title+"-List of Events'"
                },
                function(err,res){
                    googleSpreadsheet.load({
                        debug:true,
                        spreadsheetId:res.items[0].id,
                        worksheetId:'od6',
                        accessToken:{
                            type:'Bearer',
                            token:user[0].credentials.access_token
                        }
                    },
                    function sheetReady(err, spreadsheet) {
                        if(err) throw err;
                        spreadsheet.receive(function(err,rows,info){
                            if(err) throw err;
                            var i = 0;
                            for(var key in rows){
                                i++;
                                var obj = rows[key];
                                if(obj[1] != request.body.title){
                                    continue;
                                } else{
                                    var newEvent = {};
                                    newEvent[i] = {
                                        1: request.body.title,
                                        2: request.body.studentsNeeded,
                                        3: request.body.studentsSelected,
                                        4: request.body.startDate,
                                        5: request.body.endDate,
                                        6: request.body.time,
                                        7: request.body.venue,
                                        8: request.body.reportTime,
                                        9: request.body.busTime,
                                        10: request.body.comments,
                                        11: request.body.TOIC
                                    };
                                    spreadsheet.add(newEvent);
                                    spreadsheet.send(function(err) {
                                      if(err) throw err;
                                      response.send("successfully update event");
                                    });
                                }
                            }
                        });
                    });
                });
            });
            waterfallCallback(null);
        }
    ],
    function(err,result){
    });
});

app.get('/:user_id/cca/:cca_id/events/:event_id', function(request,response){
    var event ={};
    var event_details = {};
    var event_members = [];
    var cca_members = [];
    async.waterfall([
        //get user info
        function(waterfallCallback){
            db.collection('users').find({google_id:request.params.user_id}).toArray(function(err, user) {
                if (err) throw err;
                waterfallCallback(null,user);
            });
        },
        //get event title, cca_title and members by event id
        function(user,waterfallCallback){
            var spreadsheet_title;
            var cca_title;
            var event_title;
            gapi.oauth2Client.setCredentials(user[0].credentials);
            gapi.googleDrive.files.get({
                "fileId": request.params.event_id
            },
            function(err,res){
                spreadsheet_title= res.title;
                console.log("spreadsheet title: "+spreadsheet_title);
                var n = spreadsheet_title.search("-");
                cca_title = spreadsheet_title.substr(0,n);
                var sub_spreadsheet_title = spreadsheet_title.substr(n+1);
                var m = sub_spreadsheet_title.search("-");
                event_title = sub_spreadsheet_title.substr(m+1);
                console.log("cca title: "+cca_title);
                console.log("event title: "+event_title);

                googleSpreadsheet.load({
                        debug:true,
                        spreadsheetId:res.id,
                        worksheetId:'od6',
                        accessToken:{
                            type:'Bearer',
                            token:user[0].credentials.access_token
                        }
                    },
                    function sheetReady(err, spreadsheet) {
                        spreadsheet.receive(function(err,rows,info){
                            if (err) throw err;
                            console.log(rows);
                            //refactor rows
                            var i = 1;
                            for(var key in rows){
                                var obj = rows[key];
                                var j =1;
                                var student = {};
                                for(var prop in obj){
                                    if(i != 1 && obj.hasOwnProperty(prop)){
                                        var col = parseInt(prop);
                                        switch(col){
                                            case 1:student.name = obj[prop]; break;
                                            case 2:student.id = obj[prop]; break;
                                            case 3:student.level = obj[prop]; break;
                                            case 4:student.class = obj[prop]; break;
                                            default: break;
                                        }
                                        j++;
                                    }
                                }
                                event_members.push(student);
                                i++;
                            }
                            //end of rafactor rows
                            event_members.shift(); //remove the first empty object
                            //event.cca_members = cca_members;
                            waterfallCallback(null,user,event_title,event_members,cca_title);
                        });
                    }
                );
            });
        },
        //get event details
        function(user,event_title,event_members,cca_title,waterfallCallback){
            console.log("cca title:" + cca_title);
            console.log("event title:" + event_title);
            gapi.googleDrive.files.list({
                'access_token':user[0].credentials.access_token,
                'q':"'"+request.params.cca_id+"' in parents and title = '"+cca_title+"-List of Events'"
            },
            function(err,res){
                googleSpreadsheet.load({
                    debug:true,
                    spreadsheetId:res.items[0].id,
                    worksheetId:'od6',
                    accessToken:{
                        type:'Bearer',
                        token:user[0].credentials.access_token
                    }
                },
                function sheetReady(err, spreadsheet) {
                    if(err) throw err;
                    spreadsheet.receive(function(err,rows,info){
                        if (err) throw err;
                        //refactor rows
                        var i = 1;
                        var taskString = "";
                        for(var key in rows){
                            // console.log("checking a row");
                            var obj = rows[key];
                            for(var prop in obj){
                                
                                if(i != 1 && obj.hasOwnProperty(prop) && obj["1"] == event_title){
                                    // console.log("found the row");
                                    // console.log(obj);
                                    var col = parseInt(prop);
                                    switch(col){
                                        case 1:event_details.title = obj[prop]; break;
                                        case 2:event_details.studentsNeeded = obj[prop]; break;
                                        case 3:break;
                                        case 4:event_details.startDate = obj[prop]; break;
                                        case 5:event_details.endDate = obj[prop]; break;
                                        case 6:event_details.time = obj[prop]; break;
                                        case 7:event_details.venue = obj[prop]; break;
                                        case 8:event_details.reportTime = obj[prop]; break;
                                        case 9:event_details.busTime = obj[prop]; break;
                                        case 10:event_details.comments = obj[prop]; break;
                                        case 11:event_details.TOIC = obj[prop]; break;
                                        case 12:taskString = obj[prop]; console.log(obj[prop]); break;
                                        default: break;
                                    }
                                }
                            }
                            i++;
                        }
                        var tasks = taskString.split(",");
                        for (var i = 0; i < tasks.length; i++) {
                            tasks[i] = tasks[i].trim();
                        };
                        // console.log(taskString);
                        console.log(tasks);
                        //end of rafactor rows
                        waterfallCallback(null,user,event_title,event_members,cca_title,event_details, tasks);
                    });
                });
            });
        },
        // get task status
        function(user,event_title,event_members,cca_title,event_details,tasks,waterfallCallback){
            gapi.oauth2Client.setCredentials(user[0].credentials);
            gapi.googleDrive.files.get({
                "fileId": request.params.event_id
            },
            function(err,res){
                googleSpreadsheet.load({
                        debug:true,
                        spreadsheetId:res.id,
                        worksheetId:'od6',
                        accessToken:{
                            type:'Bearer',
                            token:user[0].credentials.access_token
                        }
                    },
                    function sheetReady(err, spreadsheet) {
                        spreadsheet.receive(function(err,rows,info){
                            if (err) {
                                waterfallCallback(err, []);
                            } else {
                                if (rows['1']) {
                                    var columnCounts = 1;
                                    var taskIndexes = [];
                                    var otherIndexes = [];
                                    for (var i = 0; i < tasks.length; i++) {
                                        taskIndexes.push(-1);
                                    };

                                    for (key in rows['1']) {
                                        var curTaskName = rows['1'][key];
                                        var index = tasks.indexOf(curTaskName);
                                        if (index != -1) {
                                            taskIndexes[index] = columnCounts;
                                        } else {
                                            if (columnCounts > 2) {
                                                otherIndexes.push(columnCounts);
                                            };
                                        }
                                        columnCounts++;
                                    };
                                    console.log(taskIndexes);

                                    var tasksArray = [];
                                    for (var i = 0; i < taskIndexes.length; i++) {
                                        console.log("here!");
                                        var col = taskIndexes[i];
                                        if(col != -1){
                                            var curTask = {taskName: tasks[i]};

                                            var students = [];
                                            for (key in rows) {
                                                if (key != '1') {
                                                    var curRow = rows[key];
                                                    var curName = curRow['1'];
                                                    var curId = curRow['2'];
                                                    var hasDone = false;
                                                    if (rows[key][col] == "yes") {
                                                        hasDone = true;
                                                    }

                                                    data = {};
                                                    for (var j = 0; j < otherIndexes.length; j++) {
                                                        var colToRead = otherIndexes[j]+"";
                                                        var fieldName = rows['1'][colToRead];
                                                        var value = curRow[colToRead];
                                                        data[fieldName] = value;
                                                    };

                                                    var student = {name:curName, id:curId, status:hasDone, data:data};
                                                    students.push(student);
                                                };
                                            };
                                            curTask.status = students;
                                            tasksArray.push(curTask);
                                        }
                                    };

                                    event_details.tasks = tasksArray;
                                    waterfallCallback(null,user,event_title,event_members,cca_title,event_details);
                                }
                            }
                        });
                    }
                );
            });

        },
        //get cca members
        function(user,event_title,event_members,cca_title,event_details,waterfallCallback){
            gapi.googleDrive.files.list({
                'access_token':user[0].credentials.access_token,
                'q':"'"+request.params.cca_id+"' in parents and title = '"+cca_title+"-Student Details'"
            },
            function(err,res){
                googleSpreadsheet.load({
                    debug:true,
                    spreadsheetId:res.items[0].id,
                    worksheetId:'od6',
                    accessToken:{
                        type:'Bearer',
                        token:user[0].credentials.access_token
                    }
                },
                function sheetReady(err, spreadsheet) {
                    if(err) throw err;
                    spreadsheet.receive(function(err,rows,info){
                        if (err) throw err;
                        //refactor rows
                        var i = 1;
                        for(var key in rows){
                            var obj = rows[key];
                            var j =1;
                            var student = {data:{}};
                            for(var prop in obj){
                                if(i != 1 && obj.hasOwnProperty(prop)){
                                    var col = parseInt(prop);
                                    switch(col){
                                        case 1:student.name = obj[prop]; break;
                                        case 2:student.id = obj[prop]; break;
                                        case 3:student.data.level = obj[prop]; break;
                                        case 4:student.data.class = obj[prop]; break;
                                        case 5:student.data.race = obj[prop]; break;
                                        case 6:student.data.nationality = obj[prop]; break;
                                        case 7:student.data.guardian_contact_phone = obj[prop]; break;
                                        case 8:student.data.guardian_contact_mobile = obj[prop]; break;
                                        case 9:student.data.guardian_contact_other = obj[prop]; break;
                                        case 10:student.data.medical_concern = obj[prop]; break;
                                        default: break;
                                    }
                                    j++;
                                }
                            }
                            student.selected = false;
                            cca_members.push(student);
                            i++;
                        }
                        //end of rafactor rows
                        cca_members.shift(); //remove the first empty object
                        //response.send(returnJSON);
                        waterfallCallback(null,event_members,cca_members,event_details);
                    });
                });
            });
        },
        //set isSelected flag for cca members for this event
        function(event_members,cca_members,event_details,waterfallCallback){
            for (var i = 0;i<event_members.length;i++){
                var studentId = event_members[i].id;
                for(var j = 0;j<cca_members.length;j++){
                    if(studentId == cca_members[j].id){
                        cca_members[j].selected = true;
                    }
                }
            }
            event.cca_members = cca_members;
            event.event_details = event_details;
            
            waterfallCallback(null,event);
        }
    ],
    function(err,result){
        if (err) {
            response.send({message:err, event:event});
        }else {
            response.send({message:"success", event:event});
        }
    });
});

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
