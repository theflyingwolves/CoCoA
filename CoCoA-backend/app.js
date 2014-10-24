var express = require('express'),

app = express(),

http = require('http'),

path = require('path'),

errorhandler = require('errorhandler'),

morgan = require('morgan'),

bodyParser = require('body-parser'),

cookieParser = require('cookie-parser'),

methodOverride = require('method-override'),

gapi = require('./lib/gapi'),

spreadsheet = require('edit-google-spreadsheet');

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


var server = app.listen(3000);


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
                };
            };
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
            title: req.body.title,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [{
            "kind":"drive#fileLink",
            "id":rootFolderId
            }]
        }
    },
        function(req,res){
            console.log("create a new folder under CCA-AdminUltra", res);
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

                                spreadsheet.load({
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
                                            spreadsheet.receive(function(err, rows, info) {
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
    var memberDetailsFilename = "Member Details";

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

                                spreadsheet.load({
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
                                            spreadsheet.receive(function(err, rows, info) {
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

                                                    spreadsheet.load({
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
                                                                spreadsheet.receive(function(err, rows, info) {
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

                                                                    spreadsheet.add(contents);

                                                                    // spreadsheet.add([[1,2,3],
                                                                    //                  [4,5,6]]);   

                                                                    // spreadsheet.add({
                                                                    //   10: targetStudentDetails
                                                                    // });

                                                                    spreadsheet.send(function(err) {
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


console.log('Express server started on port %s', server.address().port);
