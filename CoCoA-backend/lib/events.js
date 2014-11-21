var gapi = require('./gapi');
var googleSpreadsheet = require('edit-google-spreadsheet');
var googleSpreadsheetNew = require('google-spreadsheet');
var async = require('async');
var mongoskin = require('mongoskin'),
db = mongoskin.db('mongodb://localhost:27017/cocoa?auto_reconnect', {safe:true});

exports.getEvents = function(request,response){
    async.waterfall([
        function(waterfallCallback){
             db.collection('users').find({google_id:request.params.user_id}).toArray(function(err, user) {
                if (err) throw err;
                waterfallCallback(null,user);
            });
        },
        function(user,waterfallCallback){
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
                var cca_title_ontop = res.title;
                async.series([
                    function(callback){
                        //start of retriving event details
                        gapi.googleDrive.files.list({
                            //'access_token':user[0].credentials.access_token,
                            'q':"'"+request.params.cca_id+"' in parents and title = '"+res.title+"-List of Events'"
                        },
                        function(err,res){
                            console.log(err);
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
                            //'access_token':user[0].credentials.access_token,
                            'q':"'"+request.params.cca_id+"' in parents and title = '"+res.title+"-Events'"
                        },
                        function(err,res){
                            var eventsFolderId = res.items[0].id;
                            gapi.googleDrive.files.list({
                                //'access_token':user[0].credentials.access_token,
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
                                        var curResult = {returnJSON:returnJSON, eventsFolderId:eventsFolderId, cca_title_ontop:cca_title_ontop};
                                        console.log(curResult);
                                        callback(null, curResult);
                                        // response.send(returnJSON);
                                    }
                                });
                            });

                        });
                    }
                ],
                function(err,result){
                    var data = result[1];
                    if (err) {
                        waterfallCallback(err, data.returnJSON);
                    }else {
                        waterfallCallback(null, data.returnJSON, data.eventsFolderId, data.cca_title_ontop);
                    }
                });
            });
            // waterfallCallback(null);
        },
        function(returnJSON, eventsFolderId, cca_title_ontop, waterfallCallback){
            console.log(eventsFolderId);
            console.log(cca_title_ontop);
            var indexToAddSpreadsheet = [];
            for (var i = 0; i < returnJSON.list_of_events.length; i++) {
                var event = returnJSON.list_of_events[i];
                if (!event['id']) {
                    indexToAddSpreadsheet.push(i);
                };
            };
            

            async.each(indexToAddSpreadsheet, function(index, callback) {
                
                var event_title = returnJSON.list_of_events[index].title;
                var cca_title = cca_title_ontop;

                gapi.googleDrive.files.insert({
                    resource: {
                        title: cca_title+"-events-"+event_title,
                        mimeType: 'application/vnd.google-apps.spreadsheet',
                        parents: [{
                        "kind":"drive#fileLink",
                        "id":eventsFolderId
                        }]
                    }
                },
                function(err,res){
                    returnJSON.list_of_events[index]['id'] = res.id;
                    callback();
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
                            console.log("event spreadsheet created successfully");
                        });
                    });
                    
                });

                            
            }, function(err){
                if( err ) {
                  waterfallCallback(err, returnJSON);
                } else {
                  waterfallCallback(null, returnJSON);
                }
            });

        }
    ],
    function(err,result){
        if (err) {
            throw err;
        }else {
            response.send(result);    
        }
    });
};

exports.postEvents = function(request,response){
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
                    //'access_token':user[0].credentials.access_token,
                    'q':"'"+request.params.cca_id+"' in parents and title = '"+cca_title+"-List of Events' and trashed = false"
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
                    //'access_token':user[0].credentials.access_token,
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
                                token:gapi.oauth2Client.credentials.access_token
                            }
                        },
                        function sheetReady(err, spreadsheet) {
                                if(err) throw err;
                                spreadsheet.add([['Name','ID','Level','Class','Race','Nationality','Guardian Contact Phone',
                        'Guardian Contact Home','Guardian Contact Other','Medical Concern']]);
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
};

exports.putEvents = function(request,response){
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
                    //'access_token':user[0].credentials.access_token,
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
};

exports.getEventDetail = function(request,response){
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
                var n = spreadsheet_title.search("-");
                cca_title = spreadsheet_title.substr(0,n);
                var sub_spreadsheet_title = spreadsheet_title.substr(n+1);
                var m = sub_spreadsheet_title.search("-");
                event_title = sub_spreadsheet_title.substr(m+1);

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
                        spreadsheet.receive(function(err,rows,info){
                            if (err) throw err;
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
            gapi.googleDrive.files.list({
                //'access_token':user[0].credentials.access_token,
                'q':"'"+request.params.cca_id+"' in parents and title = '"+cca_title+"-List of Events'"
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
                        //refactor rows
                        var i = 1;
                        var taskString = "";
                        for(var key in rows){
                            var obj = rows[key];
                            for(var prop in obj){
                                
                                if(i != 1 && obj.hasOwnProperty(prop) && obj["1"] == event_title){
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
                        console.log(tasks);
                        //end of rafactor rows
                        waterfallCallback(null,user,event_title,event_members,cca_title,event_details, tasks);
                    });
                });
            });
        },
        // get task status
        function(user,event_title,event_members,cca_title,event_details,tasks,waterfallCallback){
            //gapi.oauth2Client.setCredentials(user[0].credentials);
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
                            token:gapi.oauth2Client.credentials.access_token
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
                //'access_token':user[0].credentials.access_token,
                'q':"'"+request.params.cca_id+"' in parents and title = '"+cca_title+"-Student Details'"
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
};