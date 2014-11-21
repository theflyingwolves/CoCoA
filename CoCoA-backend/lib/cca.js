var gapi = require('./gapi');
var googleSpreadsheet = require('edit-google-spreadsheet');
var googleSpreadsheetNew = require('google-spreadsheet');
var async = require('async');
var mongoskin = require('mongoskin'),
db = mongoskin.db('mongodb://localhost:27017/cocoa?auto_reconnect', {safe:true});

exports.getCCA = function (request,response){
    async.waterfall([
        function(waterfallCallback){
             db.collection('users').find({google_id:request.params.user_id}).toArray(function(err, user) {
                if (err) throw err;
                waterfallCallback(null,user);
            });
        },

        function(user,waterfallCallback){
            var ccaList = [];
            //update access token when user logins
            gapi.oauth2Client.setCredentials(user[0].credentials);

            gapi.googleDrive.files.list({
                //'access_token':user[0].credentials.access_token,
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
                        response.send(ccaList);
                    }
                });
            });
            waterfallCallback(null);
        }
    ],
    function(err,result){
        
        if (err) throw err;
    });
};

exports.postCCA = function(request,response){
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
};