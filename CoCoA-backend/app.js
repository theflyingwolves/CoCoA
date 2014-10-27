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
        console.log();
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
                        console.log("created successfully");
                    });
                });
                response.send({"event_title":request.body.event_title,"event_spreadsheet_id":res.id});
            });
        });
    });
});


// get all student infomation
app.get('/allStudents', function(req, res) {
    var resToClient = res;
    var CCADirectoryID = rootFolderId;
    var fileName = "Student Details";
    // var fileName = "testSheet";
    // console.log("test access_token");
    if (!gapi.oauth2Client.credentials.access_token) {
        resToClient.json({message: "please log in first"});
    }

    if (CCADirectoryID !== "") {
        gapi.googleDrive.children.list({'folderId': CCADirectoryID}, function(err,res){
            if (res) {
                var studentDetailsFound = false;
                var numOfChildren = res.items.length;

                for (var i = 0; i < numOfChildren; i++) {
                    var id = res.items[i].id;
                    gapi.googleDrive.files.get({'fileId': id}, function(err,res){
                        if (err) {
                            resToClient.json({message:"error when checking a file", err:err});
                        }

                        if (res.title === studentDetailsFilename) {
                            studentDetailsFound = true;

                            if (res.mimeType == "application/vnd.google-apps.spreadsheet") {
                                var targetFileId = res.id;

                                googleSpreadsheet.load({
                                    debug: true,
                                    spreadsheetId: targetFileId,
                                    worksheetName: 'Sheet1',
                                    accessToken : {
                                      type: 'Bearer',
                                      token: gapi.oauth2Client.credentials.access_token
                                    }
                                    }, function sheetReady(err, spreadsheet) {
                                        if(err) {
                                            resToClient.json({message:"error when loading the spreadsheet", err:err});
                                        } else {
                                            googleSpreadsheet.receive(function(err, rows, info) {
                                              if(err){
                                                throw err;
                                              }else {
                                                var numOfRows = info.totalRows;
                                                var studentInfo = [];

                                                for (var i = 2; i < numOfRows+1; i++) {
                                                    var index = '' + i;
                                                    var curStudent = rows[index];
                                                    var curInfo = {name:curStudent['1'] , id:curStudent['2'] }
                                                    studentInfo.push(curInfo);
                                                };

                                                // console.log(studentInfo);
                                                resToClient.json({message:"success", students: studentInfo});
                                                // console.log("Found rows:", rows['1']);  
                                              } 
                                            });
                                        }

                                    }
                                );

                            } else {
                                var message = "unknown type error of student detail file: " + res.mimeType;
                                resToClient.json({message:message});
                            }
                        };

                        if ((!studentDetailsFound) && (i == (numOfChildren - 1))) {
                            resToClient.json({message:"Student Details spreadsheet is not found under CCA-admin folder"});
                        }   
                    });
                }   
            } else{
                resToClient.json({message:"error when accessing CCA Admin folder", err:err});
            }
        });
    } else {
        resToClient.json({message:"cannot find CCA Admin folder in user google drive"});
    }
});



app.post('/addMembersToCCA', function(req, res) {
    var resToClient = res;
    var CCADirectoryID = "";
    if (rootFolderId) {
        CCADirectoryID = rootFolderId;
    };
    
    var studentDetailsFilename = "Student Details";
    var memberDetailsFilename = "Student Details";

    // console.log(req.body);
    var CCAName = req.body.CCAName;
    // var students = req.body.students;    
    var students = ['T0299165Z', 'T0219245I'];

    if (!gapi.oauth2Client.credentials.access_token) {
        resToClient.json({message: "please log in first"});
    }

    if (CCADirectoryID !== "") {
        gapi.googleDrive.children.list({'folderId': CCADirectoryID}, function(err,res){
            if (res) {
                var studentDetailsFound = false;
                var targetStudentDetails = [];
                var numOfChildren = res.items.length;

                for (var i = 0; i < numOfChildren; i++) {
                    var id = res.items[i].id;
                    gapi.googleDrive.files.get({'fileId': id}, function(err,res){
                        if (err) {
                            resToClient.json({message:"error when checking a file", err:err});
                        }

                        if (res.title === studentDetailsFilename) {
                            studentDetailsFound = true;

                            if (res.mimeType == "application/vnd.google-apps.spreadsheet") {
                                var targetFileId = res.id;

                                googleSpreadsheet.load({
                                    debug: true,
                                    spreadsheetId: targetFileId,
                                    worksheetName: 'Sheet1',
                                    accessToken : {
                                      type: 'Bearer',
                                      token: gapi.oauth2Client.credentials.access_token
                                    }
                                    }, function sheetReady(err, spreadsheet) {
                                        if(err) {
                                            resToClient.json({message:"error when loading the spreadsheet", err:err});
                                        } else {
                                            googleSpreadsheet.receive(function(err, rows, info) {
                                              if(err){
                                                throw err;
                                              }else {
                                                var numOfRows = info.totalRows;

                                                var curRow = []
                                                for (index in rows['1']) {
                                                    curRow.push(rows['1'][index]);
                                                };
                                                targetStudentDetails.push(curRow);
                                                // targetStudentDetails.push(rows['1']);

                                                for (var i = 2; i < numOfRows+1; i++) {
                                                    var index = '' + i;
                                                    var curStudent = rows[index];
                                                    var curId = curStudent['2'];
                                                    if ((students.indexOf(curId)) !== -1) {
                                                        var curRow = []
                                                        for (index in curStudent) {
                                                            curRow.push(curStudent[index]);
                                                        };
                                                        targetStudentDetails.push(curRow);
                                                    }
                                                };
                                              } 
                                            });
                                        }

                                    }
                                );

                            } else {
                                var message = "unknown type error of student detail file: " + res.mimeType;
                                resToClient.json({message:message});
                            }
                        } else if (res.title == CCAName){
                            // find or create the CCA member list and insert data
                            // console.log(res);
                            // console.log("yes name is correct");

                            if (res.mimeType == 'application/vnd.google-apps.folder') {
                                var targetCCAFolderId = res.id;
                                gapi.googleDrive.children.list({'folderId': targetCCAFolderId}, function(err,res){
                                    if (res) {
                                        var numOfChildren = res.items.length;

                                        for (var i = 0; i < numOfChildren; i++) {
                                            var id = res.items[i].id;
                                            gapi.googleDrive.files.get({'fileId': id}, function(err,res){
                                                if (err) {
                                                    resToClient.json({message:"error when checking a file", err:err});
                                                }

                                                if (res.title === memberDetailsFilename && res.mimeType == "application/vnd.google-apps.spreadsheet") {
                                                    var memberDetailsFileId = id;

                                                    googleSpreadsheet.load({
                                                        debug: true,
                                                        spreadsheetId: memberDetailsFileId,
                                                        worksheetName: 'Sheet1',
                                                        accessToken : {
                                                          type: 'Bearer',
                                                          token: gapi.oauth2Client.credentials.access_token
                                                        }
                                                        }, function sheetReady(err, spreadsheet) {
                                                            if(err) {
                                                                resToClient.json({message:"error when loading the spreadsheet", err:err});
                                                            } else {
                                                                googleSpreadsheet.receive(function(err, rows, info) {
                                                                  if(err){
                                                                    throw err;
                                                                  }else {
                                                                    var numOfRows = info.totalRows;
                                                                    var nextRow = info.nextRow;
                                                                    console.log(targetStudentDetails);
                                                                    if (numOfRows > 1 && targetStudentDetails.length > 0) {
                                                                        targetStudentDetails.splice(0, 1);
                                                                    }
                                                                    console.log(numOfRows);

                                                                    contents = {};
                                                                    contents[nextRow] = targetStudentDetails;

                                                                    googleSpreadsheet.add(contents);

                                                                    // spreadsheet.add([[1,2,3],
                                                                    //                  [4,5,6]]);   

                                                                    // spreadsheet.add({
                                                                    //   10: targetStudentDetails
                                                                    // });

                                                                    googleSpreadsheet.send(function(err) {
                                                                      if(err) {
                                                                        console.log("edit spreadsheet error");
                                                                        console.log(err);
                                                                      }
                                                                      
                                                                    });
                                                                  } 
                                                                });
                                                            }

                                                        }
                                                    );

                                                }
                                            });
                                        };

                                    } else {
                                        resToClient.json({message:"error when accessing CCA Admin folder", err:err});
                                    }
                                });
                               
                            }

                            

                        } 

                        if ((!studentDetailsFound) && (i == (numOfChildren - 1))) {
                            resToClient.json({message:"Student Details spreadsheet is not found under CCA-admin folder"});
                        }   
                    });
                } 
            } else{
                resToClient.json({message:"error when accessing CCA Admin folder", err:err});
            }
        });
    } else {
        resToClient.json({message:"cannot find CCA Admin folder in user google drive"});
    }
});

var server = app.listen(3000);

console.log('Express server started on port %s', server.address().port);
