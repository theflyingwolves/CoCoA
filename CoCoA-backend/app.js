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

// students
app.get('/allStudents', function(req, res) {
    var resToClient = res;
    var CCADirectoryID = "0B-ZozyuGnVX3cW0yem5jaV94eTQ";
    var fileName = "Student Details";
    // var fileName = "testSheet";
    // console.log("test access_token");
    if (!gapi.oauth2Client.credentials.access_token) {
        resToClient.json({message: "please log in first"});
    }

    if (CCADirectoryID !== "") {
        gapi.googleDrive.children.list({'folderId': CCADirectoryID}, function(err,res){
            if (res) {
                for (var i = 0; i < res.items.length; i++) {
                    var id = res.items[i].id;
                    gapi.googleDrive.files.get({'fileId': id}, function(err,res){
                        if (err) {
                            resToClient.json({message:"error when checking a file", err:err});
                        }

                        if (res.title === fileName) {
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
                    });
                }      
            } else{
                if (err) {
                    resToClient.json({message:"error when loading the spreadsheet", err:err});
                }
            }
        });
    }
});




var server = app.listen(3000);

console.log('Express server started on port %s', server.address().port);
