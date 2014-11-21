var gapi = require('./gapi');
var googleSpreadsheet = require('edit-google-spreadsheet');
var googleSpreadsheetNew = require('google-spreadsheet');
var async = require('async');
var mongoskin = require('mongoskin'),
db = mongoskin.db('mongodb://localhost:27017/cocoa?auto_reconnect', {safe:true});

exports.login = function(request,response){
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
                db.collection('users').find({google_id:googleId}).toArray(function(err, user) {
                    if (err) throw err;
                    //new user
                    if(user.length == 0){
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
                        //update refresh token if it's changed
                        // if(credentials.refresh_token != null){
                        //     db.collection('users').update(
                        //     {google_id:googleId},
                        //     {
                        //     $set:{
                        //         credentials:credentials,
                        //         }
                        //     },
                        //     function(err,res){
                        //         if (err) throw err;
                        //     });
                        // }
                        //reset access token
                        
                        gapi.oauth2Client.setCredentials(user[0].credentials);

                        //check validation of rootFolderId
                        gapi.googleDrive.files.get({
                        'fileId':user[0].root_folder_id
                        },function(err,res){
                            if(res!=null && res.length == 1){
                                console.log("root folder is valid");
                                rootFolderId = user[0].root_folder_id;
                            }
                            else{
                                console.log("root folder cannot found: ");
                                rootFolderId = "";
                            }
                            callback(null,googleId,user,rootFolderId);
                        });
                    }
                });
            },
            //
            function(googleId,user,rootFolderId,callback){
                console.log("current rootFolderId: "+rootFolderId);
                if(rootFolderId != null && rootFolderId !=""){
                    //do nothing
                } else{
                    console.log("find my root folder id");
                    gapi.oauth2Client.setCredentials(user[0].credentials);
                    gapi.googleDrive.files.list({
                        //'access_token':credentials.access_token,
                        'q':"title = 'CCA-Admin' and trashed = false"
                    }, function(err,res){
                        if(res.items.length == 0){
                            console.log("I dont have a root folder");
                            //create CCA_Admin if not found
                             gapi.googleDrive.files.insert({
                                resource: {
                                    title: "CCA-Admin",
                                    mimeType: 'application/vnd.google-apps.folder'
                                }
                            }, function(err,res){
                                if (err) throw err;
                                //insert template of Student Details
                                gapi.googleDrive.files.insert({
                                    resource: {
                                        title: "Student Details",
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
                                        spreadsheet.add([
                                            ['Name','ID','Level','Class','Race','Nationality','Guardian Contact 1',
                                            'Guardian Contact 2','Guardian Contact 3','Medical Concern'],
                                            ['Leonardo','A12345678','A','1','Italian','Italian'],
                                            ['Michelangelo','B12345678','B','2','Italian','Italian'],
                                            ['Raffaello','C12345678','C','3','Italian','Italian'],
                                            ['Donatello','D12345678','D','4','Italian','Italian']
                                            ]);
                                        spreadsheet.send(function(err) {
                                            if(err) throw err;
                                            console.log("Updated successfully");
                                        });
                                    });
                                console.log("create students details spreadsheet successfully");
                                });
                                //end of insert template of Student Details

                                //update root folder id in database
                                db.collection('users').update(
                                    {
                                        google_id:googleId
                                    },
                                    {
                                    $set:{
                                        //credentials:credentials,
                                        root_folder_id:res.id
                                        }
                                    },function(err,res){});

                            });
                        }
                        else if(res.items.length == 1){
                            console.log("I have a root folder");
                            rootFolderId = res.items[0].id;
                            db.collection('users').update(
                                {google_id:googleId},
                                {
                                    $set:{
                                        root_folder_id:rootFolderId
                                    }
                                },function(err,res){});
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
                 response.redirect('http://ec2-54-169-115-238.ap-southeast-1.compute.amazonaws.com/www/index.html#/app/eventlist/'+googleId);
                //response.redirect('http://localhost:8100/#/app/eventlist/'+googleId);
            });
    });

};