var gapi = require('./gapi');
var googleSpreadsheet = require('edit-google-spreadsheet');
var googleSpreadsheetNew = require('google-spreadsheet');
var async = require('async');

var studentDetailsFilename = "Student Details";
var memberDetailsFilename = "Student Details";

exports.getAllStudents = function(req, res) {
    var resToClient = res;

    async.waterfall([
        function(callback){
             db.collection('users').find({google_id:req.params.user_id}).toArray(function(err, user) {
                if (err) {
                    callback(err, []);
                } else {
                    callback(null,user);
                } 
            });
        },
        function(user, callback){ //read the target CCAMembers if CCAName exists
            
            if (req.params.CCAName) {
                console.log("has CCAName");
                var CCAName = req.params.CCAName;
                var selectedStudents = [];

                var fileName = CCAName+"-Student Details";
                var q = "title = '" + fileName+"'";


                gapi.oauth2Client.setCredentials(user[0].credentials);
                gapi.googleDrive.files.list({
                    'q':q,
                    'access_token':user[0].credentials.access_token
                }, function(err, res){
                    if (err) {
                        callback("error while finding the file by its name", []);
                    }else {

                        var items = res.items;

                        // if item is trashed or parent is not right 
                        // filter out the item
                        async.filter(items, 
                            function(item, callback){

                                if (!item.labels.trashed) {
                                    var id = item.parents[0].id;
                                    gapi.googleDrive.files.get({'fileId': id, 'access_token':user[0].credentials.access_token}, function(err,res){
                                        if (err) {
                                            callback(false);
                                        } else {
                                            if (res.title == CCAName) {
                                                callback(true);
                                            } else {
                                                callback(false);
                                            }
                                        }
                                    });
                                }else {
                                    callback(false);
                                }
                            }, 
                            function(results){
                                var items = results;
                                // console.log("finish filtering duplicate files");
                                // console.log(items.length);

                                if (items.length == 0) {
                                    var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                                    callback(message, []);
                                } else if (items.length > 1) {
                                    var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                                    // console.log(items);
                                    callback(message, []);
                                } else {
                                    var item = items[0];

                                    readFromASpreadSheetWithFileDetail(item, [], callback, user);
                                }

                            }
                        );
                    }
                }); 
            }else {
                callback(null, [], [], user);
            }
        },
        function(dummy, studentSelected, user, callback){
            var fileName = "Student Details";
            var q = "title = '" + fileName+"'";

            gapi.oauth2Client.setCredentials(user[0].credentials);
            gapi.googleDrive.files.list(
                {'q':q, 
                 'access_token':user[0].credentials.access_token
                }, function(err, res){
                if (err) {
                    var message = "error while finding the file by its name";
                    callback(message, []);
                }else {
                    var items = res.items;


                    // if item is trashed or parent is not right 
                    // filter out the item
                    async.filter(items, 
                        function(item, callback){

                            if (!item.labels.trashed) {
                                var id = item.parents[0].id;
                                gapi.oauth2Client.setCredentials(user[0].credentials);
                                gapi.googleDrive.files.get(
                                    {'fileId': id,
                                    'access_token':user[0].credentials.access_token
                                }, function(err,res){
                                    if (err) {
                                        callback(false);
                                    } else {
                                        if (res.title == "CCA-Admin") {
                                            callback(true);
                                        } else {
                                            callback(false);
                                        }
                                    }
                                });
                            }else {
                                callback(false);
                            }
                        }, 
                        function(results){
                            var items = results;
                            console.log("finish filtering duplicate files");
                            console.log(items.length);

                            if (items.length == 0) {
                                var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                                callback(message, []);
                            } else if (items.length > 1) {
                                var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                                // console.log(items);
                                callback(message, []);
                            } else {
                                var item = items[0];

                                readFromASpreadSheetWithFileDetail(item, studentSelected, callback, user);
                            }

                        }
                    );
                        
                }
            });
        },
        function(studentSelected, allStudents, user, callback){
            console.log("enter final process of students info");
            for (var i = 0; i < allStudents.length; i++) {
                var selected = false;
                for (var j = 0; j < studentSelected.length; j++) {
                    if (studentSelected[j].id == allStudents[i].id) {
                        selected = true;
                        break;
                    };
                };
                if (selected) {
                    allStudents[i].selected = true;
                } else {
                    allStudents[i].selected = false;
                }
            };

            console.log("finish final process of students info");
            callback(null, allStudents);
        }
    ], function (err, result) {
       if (err) {
            resToClient.json({message:err});
       } else {
            resToClient.json({message:"success", students:result})
       }
    });  
};

// temporary no use
exports.getAllStudentsV2 = function(req, res) {
	var resToClient = res;
    var CCADirectoryID = rootFolderId;
    var studentDetailsFilename = "Student Details";
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
                                
                                var auth = {
                                      type: 'Bearer',
                                      value: gapi.oauth2Client.credentials.access_token
                                };
                                var my_sheet = new googleSpreadsheetNew(targetFileId, auth);

								my_sheet.getInfo( function( err, sheet_info ){
							        if (err) {
							        	console.log(err);
							        } else {
							        	console.log(sheet_info);
							        }

							        console.log( sheet_info.title + ' is loaded' );
							        
							        sheet_info.worksheets[0].getRows( function( err, rows ){
							            console.log(rows);
							            // rows[0].colname = 'new val';
							            // rows[0].save();
							            // rows[0].del();
							        });
							    })

							    resToClient.json({message:"dummy"});
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
    
};



/******************************************************************************************

url: /MembersOfCCA/

*******************************************************************************************/


exports.getMembersOfCCA = function(req, res){
    var resToClient = res;

    async.waterfall([
        function(callback){
             db.collection('users').find({google_id:req.params.user_id}).toArray(function(err, user) {
                if (err) {
                    callback(err, []);
                } else {
                    callback(null,user);
                } 
            });
        },
        function(user, callback){ 

            if (req.params.eventName) {
                console.log("has eventName");
                var CCAName = req.params.CCAName;
                var eventName = req.params.eventName;
                var selectedStudents = [];

                var fileName = CCAName+"-events-"+eventName;
                var q = "title = '" + fileName+"'";

                gapi.oauth2Client.setCredentials(user[0].credentials);
                gapi.googleDrive.files.list(
                    {'q':q,
                    'access_token':user[0].credentials.access_token
                }, function(err, res){
                    if (err) {
                        callback("error while finding the file by its name", []);
                    }else {
                        var items = res.items;

                        // if item is trashed or parent is not right 
                        // filter out the item
                        async.filter(items, 
                            function(item, callback){

                                if (!item.labels.trashed) {
                                    var id = item.parents[0].id;
                                    gapi.oauth2Client.setCredentials(user[0].credentials);
                                    gapi.googleDrive.files.get(
                                        {'fileId': id,
                                        'access_token':user[0].credentials.access_token
                                    }, function(err,res){
                                        if (err) {
                                            callback(false);
                                        } else {
                                            var folderName = CCAName+"-Events";
                                            if (res.title == folderName) {
                                                callback(true);
                                            } else {
                                                callback(false);
                                            }
                                        }
                                    });
                                }else {
                                    callback(false);
                                }
                            }, 
                            function(results){
                                var items = results;
                                // console.log("finish filtering duplicate files");
                                // console.log(items.length);

                                if (items.length == 0) {
                                    var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                                    callback(message, []);
                                } else if (items.length > 1) {
                                    var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                                    // console.log(items);
                                    callback(message, []);
                                } else {
                                    var item = items[0];

                                    readFromASpreadSheetWithFileDetail(item, [], callback, user);
                                }

                            }
                        );
                    }
                }); 
            }else {
                callback(null, [], [], user);
            }
        },
        function(dummy, studentSelected, user, callback){
            var CCAName = req.params.CCAName;
            var fileName = CCAName+"-Student Details";
            var q = "title = '" + fileName+"'";

            gapi.oauth2Client.setCredentials(user[0].credentials);
            gapi.googleDrive.files.list(
                {'q':q,
                'access_token':user[0].credentials.access_token
            }, function(err, res){
                if (err) {
                    var message = "error while finding the file by its name";
                    callback(message, []);
                }else {
                    var items = res.items;

                    // if item is trashed or parent is not right 
                    // filter out the item
                    async.filter(items, 
                        function(item, callback){

                            if (!item.labels.trashed) {
                                var id = item.parents[0].id;
                                gapi.oauth2Client.setCredentials(user[0].credentials);
                                gapi.googleDrive.files.get(
                                    {'fileId': id,
                                    'access_token':user[0].credentials.access_token
                                }, function(err,res){
                                    if (err) {
                                        callback(false);
                                    } else {
                                        if (res.title == CCAName) {
                                            callback(true);
                                        } else {
                                            callback(false);
                                        }
                                    }
                                });
                            }else {
                                callback(false);
                            }
                        }, 
                        function(results){
                            var items = results;
                            console.log("finish filtering duplicate files");
                            console.log(items.length);

                            if (items.length == 0) {
                                var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                                callback(message, []);
                            } else if (items.length > 1) {
                                var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                                // console.log(items);
                                callback(message, []);
                            } else {
                                var item = items[0];

                                readFromASpreadSheetWithFileDetail(item, studentSelected, callback, user);
                            }

                        }
                    );
                        
                }
            });
        },
        function(studentSelected, allStudents, user, callback){
            console.log("enter final process of students info");
            for (var i = 0; i < allStudents.length; i++) {
                var selected = false;
                for (var j = 0; j < studentSelected.length; j++) {
                    if (studentSelected[j].id == allStudents[i].id) {
                        selected = true;
                        break;
                    };
                };
                if (selected) {
                    allStudents[i].selected = true;
                } else {
                    allStudents[i].selected = false;
                }
            };

            console.log("finish final process of students info");
            callback(null, allStudents);
        }
    ], function (err, result) {
       if (err) {
            resToClient.json({message:err});
       } else {
            resToClient.json({message:"success", students:result})
       }
    });
}


exports.addMembersToCCA = function(req, res) {
	var resToClient = res;
    var CCAName = req.body.CCAName;
    var students = req.body.students;

    if (!gapi.oauth2Client.credentials.access_token) {
        res.json({message: "please log in first"});
    } else {
        var fileName = "Student Details";
        var q = "title = '" + fileName+"'";

        gapi.googleDrive.files.list({'q':q}, function(err, res){
            if (err) {
                resToClient.json({message: "error while finding the file by its name", err:err});
            }else {
                var items = res.items;
                
                if (items.length == 0) {
                    var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                    resToClient.json({message: message});
                } else if (items.length > 1) {
                    var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                    resToClient.json({message: message});
                } else {
                    var studentSheetFile = items[0];

                    var fileName = CCAName+"-Student Details";
                    var q = "title = '" + fileName+"'";

                    gapi.googleDrive.files.list({'q':q}, function(err, res){
                        if (err) {
                            resToClient.json({message: "error while finding the file by its name", err:err});
                        }else {
                            var items = res.items;
                            
                            if (items.length == 0) {
                                var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                                resToClient.json({message: message});
                            } else if (items.length > 1) {
                                var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                                resToClient.json({message: message});
                            } else {
                                var memberSheetFile = items[0];
                            
                                copySelectedInfoBetweensheetsWithFileDetail(studentSheetFile, memberSheetFile, students, resToClient);
                            }
                        }
                    });
                }
            }
        });  
    }
};


exports.updateMembersOfCCA = function(req, res) {
    var resToClient = res;
    var CCAName = req.body.CCAName;
    var students = req.body.students;

    async.waterfall([
            function(callback){
                 db.collection('users').find({google_id:req.params.user_id}).toArray(function(err, user) {
                    if (err) {
                        callback(err, []);
                    } else {
                        callback(null,user);
                    } 
                });
            },
            function(user, callback){ //read the target CCAMembers if CCAName exists
                var studentsToAdd = [];
                var studentsToDelete = [];
                for (var i = 0; i < students.length; i++) {
                    if (students[i].selected) {
                        studentsToAdd.push(students[i]);
                    } else {
                        studentsToDelete.push(students[i]);
                    }
                };

                callback(null, studentsToAdd, studentsToDelete, students, user);

            },
            function(studentsToAdd, studentsToDelete, students, user,  callback){
                var fileName = CCAName+"-Student Details";
                var q = "title = '" + fileName+"'";

                gapi.googleDrive.files.list({'q':q}, function(err, res){
                    if (err) {
                        var message = "error while finding the file by its name";
                        callback(message, []);
                    }else {
                        var items = res.items;

                        // if item is trashed or parent is not right 
                        // filter out the item
                        async.filter(items, 
                            function(item, callback){

                                if (!item.labels.trashed) {
                                    var id = item.parents[0].id;
                                    gapi.oauth2Client.setCredentials(user[0].credentials);
                                    gapi.googleDrive.files.list(
                                        {'q':q,
                                        'access_token':user[0].credentials.access_token
                                    },function(err,res){
                                        if (err) {
                                            callback(false);
                                        } else {
                                            if (res.title == CCAName) {
                                                callback(true);
                                            } else {
                                                callback(false);
                                            }
                                        }
                                    });
                                }else {
                                    callback(false);
                                }
                            }, 
                            function(results){
                                var items = results;
                                console.log("finish filtering duplicate files");
                                console.log(items.length);

                                if (items.length == 0) {
                                    var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                                    callback(message, []);
                                } else if (items.length > 1) {
                                    var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                                    // console.log(items);
                                    callback(message, []);
                                } else {
                                    var item = items[0];

                                    callback(null, item, studentsToAdd, studentsToDelete, students, user);
                                }

                            }
                        );
                            
                    }
                });
            },
            function(item, studentsToAdd, studentsToDelete, students, user, callback){
                console.log("enter final process of students info");

                var id = item.id;

                if (item.mimeType == "application/vnd.google-apps.spreadsheet") {
                    var memberDetailsFileId = id;

                    var auth = {
                          type: 'Bearer',
                          value: user[0].credentials.access_token
                    };
                    var my_sheet = new googleSpreadsheetNew(memberDetailsFileId, auth);

                    my_sheet.getInfo( function( err, sheet_info ){
                        if (err) {
                            var message = "error while loading spreadsheet '"+fileName+"'";
                            callback(err, []);
                        } else {
                            console.log( sheet_info.title + ' is loaded' );

                            sheet_info.worksheets[0].getRows( function( err, rows ){
                                if (err) {
                                    callback(err);
                                } else {
                                    for (var i = 0; i < rows.length; i++) {
                                        var curId = rows[i].id;
                                        var indexToDelete = -1;
                                        
                                        for (var j = 0; j < studentsToAdd.length; j++) {
                                            if (studentsToAdd[j].id == curId) {
                                                indexToDelete = j;
                                                break;
                                            };
                                        };
                                        if (indexToDelete != -1) {
                                            studentsToAdd.splice(indexToDelete, 1);
                                        };
                                    };

                                    async.eachSeries(studentsToDelete, function(student, callback) {

                                        sheet_info.worksheets[0].getRows( function( err, rows ){
                                                if (err) {
                                                    callback(err);
                                                } else {
                                                    var deleted = false;
                                                    for (var i = 0; i < rows.length; i++) {
                                                        var curId = rows[i].id;
                                                        if (curId == student.id) {
                                                            deleted = true;
                                                            rows[i].del(callback);
                                                            break;
                                                        }                                                       
                                                    };
                                                    if (!deleted) {
                                                        callback();
                                                    };
                                                    
                                                }
                                            });

                                        }, function(err){
                                            // if any of the file processing produced an error, err would equal that error
                                            if( err ) {
                                                callback(err, []);
                                            } else {
                                                console.log("finish final process of students info");
                                                callback(null, item, studentsToAdd, students, user);
                                            }
                                    }); 
                                }
                            });             
                        }
                    });

                } else {
                    var message = "the file '"+fileName+"'in your google drive is not a spreadsheet";
                    callback(message, []);
                }

            }, 
            function (item, studentsToAdd, students, user, callback){

                if (item.mimeType == "application/vnd.google-apps.spreadsheet") {
                    var memberDetailsFileId = item.id;
                  

                    googleSpreadsheet.load({
                        debug: true,
                        spreadsheetId: memberDetailsFileId,
                        worksheetName: 'Sheet1',
                        accessToken : {
                          type: 'Bearer',
                          token: user[0].credentials.access_token
                        }
                        }, function sheetReady(err, spreadsheet) {
                            if(err) {
                                callback(err, []);
                            } else {
                                spreadsheet.receive(function(err, rows, info) {
                                  if(err){
                                    throw err;
                                  }else {
                                    var numOfRows = info.totalRows;
                                    var nextRow = info.nextRow;
                                    


                                    if (numOfRows > 0 ) {
                                        var fieldNames = [];

                                        for (key in rows['1']) {
                                            var fieldName = rows['1'][key].replace(" ", "");
                                            fieldName = fieldName.toLowerCase();
                                            fieldNames.push(fieldName);
                                        };

                                        var targetStudentDetails = [];
                                        for (var i = 0; i < studentsToAdd.length; i++) {
                                            var curDetail = [studentsToAdd[i].name, studentsToAdd[i].id];


                                            for (key in studentsToAdd[i].data){
                                                curDetail.push((studentsToAdd[i].data)[key]);
                                            }


                                            // for (var j = 0; j < fieldNames.length; j++) {
                                            //     var curValue = "";
                                            //     if (fieldNames[j] == "id") {
                                            //         curValue = studentsToAdd[i].id;
                                            //     } else if (fieldNames[j] == "name") {
                                            //         curValue = studentsToAdd[i].name;
                                            //     } else {
                                            //         if ((studentsToAdd[i].data)[fieldNames[j]]) {
                                            //             curValue = (studentsToAdd[i].data)[fieldNames[j]];
                                            //         } 
                                            //     }
                                            //     curDetail.push(curValue);
                                            // };

                                            targetStudentDetails.push(curDetail);
                                        }; 

                                        contents = {};
                                        contents[nextRow] = targetStudentDetails;

                                        spreadsheet.add(contents);
                                        spreadsheet.send(function(err) {
                                          if(err) {
                                            callback(err, students);
                                            // console.log("edit spreadsheet error");
                                            // console.log(err);
                                          } else {
                                            callback(null, students);
                                          }
                                          
                                        });

                                    } else {
                                        var message = "the first row of spreadsheet " + item.title + " is not initialised";
                                        callback(message, []);
                                    }                
                                  } 
                                });
                            }
                        }
                    );
                }                
            }
        ], function (err, result) {
           if (err) {
                resToClient.json({message:err});
           } else {
                resToClient.json({message:"success", students:result})
           }
        });

};

// temporary no use
// currently this method assume the spreadsheet doesnt contain duplicate students (which is reasonable)
// it is slow since it has to delete the students one by one
exports.deleteMembersFromCCA = function(req, res) {
    var resToClient = res;

    var CCAName = req.body.CCAName;
    var fileName = CCAName + "-Student Details";
    var students = req.body.students;    

    if (!gapi.oauth2Client.credentials.access_token) {
        resToClient.json({message: "please log in first"});
    }

    var q = "title = '" + fileName+"'";

    gapi.googleDrive.files.list({'q':q}, function(err, res){
        if (err) {
            resToClient.json({message: "error while finding the file by its name", err:err});
        }else {
            var items = res.items[i];
            
            if (items.length == 0) {
                var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                resToClient.json({message: message});
            } else if (items.length > 1) {
                var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                resToClient.json({message: message});
            } else {
                var item = items[0];
                var id = item.id;

                if (item.mimeType == "application/vnd.google-apps.spreadsheet") {
                    var memberDetailsFileId = id;

                    var auth = {
                          type: 'Bearer',
                          value: gapi.oauth2Client.credentials.access_token
                    };
                    var my_sheet = new googleSpreadsheetNew(memberDetailsFileId, auth);

                    my_sheet.getInfo( function( err, sheet_info ){
                        if (err) {
                            var message = "error while loading spreadsheet '"+fileName+"'";
                            resToClient.json({message: message, err:err});   
                        } else {
                            
                            console.log( sheet_info.title + ' is loaded' );

                            async.eachSeries(students, function(studentID, callback) {

                                sheet_info.worksheets[0].getRows( function( err, rows ){
                                    if (err) {
                                        callback(err);
                                    } else {
                                        var deleted = false;
                                        for (var i = 0; i < rows.length; i++) {
                                            var curId = rows[i].id;
                                            if (curId == studentID) {
                                                deleted = true;
                                                rows[i].del(callback);
                                                break;
                                            }                                                       
                                        };
                                        if (!deleted) {
                                            callback();
                                        };
                                        
                                    }
                                });

                            }, function(err){
                                // if any of the file processing produced an error, err would equal that error
                                if( err ) {
                                    resToClient.json({message:"error during deleting students", err:err});
                                } else {
                                    resToClient.json({message:"success"});
                                }
                            });
                        }
                    });

                } else {
                    var message = "the file '"+fileName+"'in your google drive is not a spreadsheet";
                    resToClient.json({message:message});
                }
            }

        }
        
    });  
}



/******************************************************************************************

url: /participants/

*******************************************************************************************/

// still implemeting, haven't tested
exports.getParticipants = function(req, res) {
    var resToClient = res;

    var CCAName = req.params.CCAName;
    var eventName = req.params.eventName;
    var taskName = req.params.taskName;

    async.waterfall([
        function(callback){
             db.collection('users').find({google_id:req.params.user_id}).toArray(function(err, user) {
                if (err) {
                    callback(err, []);
                } else {
                    callback(null,user);
                } 
            });
        },
        function(user, callback){ 

            var fileName = CCAName+"-events-"+eventName;
            var q = "title = '" + fileName+"'";

            gapi.oauth2Client.setCredentials(user[0].credentials);
            gapi.googleDrive.files.list(
                {'q':q,
                'access_token':user[0].credentials.access_token
            },function(err, res){
                if (err) {
                    callback("error while finding the file by its name", []);
                }else {
                    var items = res.items;

                    // if item is trashed or parent is not right 
                    // filter out the item
                    async.filter(items, 
                        function(item, callback){

                            if (!item.labels.trashed) {
                                var id = item.parents[0].id;

                                gapi.oauth2Client.setCredentials(user[0].credentials);
                                gapi.googleDrive.files.get(
                                    {'fileId': id,
                                    'access_token':user[0].credentials.access_token
                                }, function(err,res){
                                    if (err) {
                                        callback(false);
                                    } else {
                                        var folderName = CCAName+"-Events";
                                        if (res.title == folderName) {
                                            callback(true);
                                        } else {
                                            callback(false);
                                        }
                                    }
                                });
                            }else {
                                callback(false);
                            }
                        }, 
                        function(results){
                            var items = results;
                            // console.log("finish filtering duplicate files");
                            // console.log(items.length);

                            if (items.length == 0) {
                                var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                                callback(message, []);
                            } else if (items.length > 1) {
                                var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                                // console.log(items);
                                callback(message, []);
                            } else {
                                var item = items[0];

                                callback(null, item, user);
                            }

                        }
                    );
                }
            }); 
        },
        function(item, user, callback){
            var studentSelected = [];

            if (taskName) {

                if (item.mimeType == "application/vnd.google-apps.spreadsheet") {
                    var memberDetailsFileId = item.id;
                  
                    googleSpreadsheet.load({
                        debug: true,
                        spreadsheetId: memberDetailsFileId,
                        worksheetName: 'Sheet1',
                        accessToken : {
                          type: 'Bearer',
                          token: user[0].credentials.access_token
                        }
                        }, function sheetReady(err, spreadsheet) {
                            if(err) {
                                callback(err, []);
                            } else {
                                spreadsheet.receive(function(err, rows, info) {
                                  if(err){
                                    throw err;
                                  }else {
                                    var numOfRows = info.totalRows;
                                    
                                    if (numOfRows > 0 ) {
                                        var columnCount = 1;
                                        var hasFound = false;

                                        for (key in rows['1']) {
                                            var fieldName = rows['1'][key];
                                            if (fieldName == taskName) {
                                                hasFound = true;
                                                break;
                                            }
                                            columnCount++;
                                        };
                                        var property = ""+columnCount;


                                        if (hasFound) {
                                            for (key in rows){
                                                if (key != '1') {
                                                    console.log(rows[key]);
                                                    //hardcode
                                                    if (rows[key].hasOwnProperty(property) && rows[key][property] == "yes") {
                                                        studentSelected.push(rows[key]['2']);
                                                    };
                                                };
                                            }
                                        };

                                        readFromASpreadSheetWithFileDetail(item, studentSelected, callback, user);

                                    } else {
                                        var message = "the first row of spreadsheet " + item.title + " is not initialised";
                                        callback(message, []);
                                    }                
                                  } 
                                });
                            }
                        }
                    );
                } 


            } else {
                readFromASpreadSheetWithFileDetail(item, studentSelected, callback, user);
            }


        },
        function(studentSelected, studentInfo, user, callback){

            for (var i = 0; i < studentInfo.length; i++) {

                if (studentSelected.indexOf(studentInfo[i].id) != -1) {
                    studentInfo[i].status = true;
                } else {
                    studentInfo[i].status = false;
                }
            };

            callback(null, studentInfo);
        }
    ], function (err, result) {
       if (err) {
            resToClient.json({message:err});
       } else {
            resToClient.json({message:"success", students:result})
       }
    });


}

// temporary no use
exports.addParticipants = function(req, res) {
	var resToClient = res;
    var CCAName = req.body.CCAName;
    var eventName = req.body.eventName;
    var students = req.body.students;

    if (!gapi.oauth2Client.credentials.access_token) {
        res.json({message: "please log in first"});
    } else {
        var fileName = CCAName+"-Student Details";
        var q = "title = '" + fileName+"'";

        gapi.googleDrive.files.list({'q':q}, function(err, res){
            if (err) {
                resToClient.json({message: "error while finding the file by its name", err:err});
            }else {
                var items = res.items;
                
                if (items.length == 0) {
                    var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                    resToClient.json({message: message});
                } else if (items.length > 1) {
                    var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                    resToClient.json({message: message});
                } else {
                    var memberSheetFile = items[0];

                    var fileName = CCAName+"-events-"+eventName;
                    var q = "title = '" + fileName+"'";

                    gapi.googleDrive.files.list({'q':q}, function(err, res){
                        if (err) {
                            resToClient.json({message: "error while finding the file by its name", err:err});
                        }else {
                            var items = res.items;
                            
                            if (items.length == 0) {
                                var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                                resToClient.json({message: message});
                            } else if (items.length > 1) {
                                var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                                resToClient.json({message: message});
                            } else {
                                var participantSheetFile = items[0];
                            
                                copySelectedInfoBetweensheetsWithFileDetail(memberSheetFile, participantSheetFile, students, resToClient);
                            }
                        }
                    });
                }
            }
        });  
    }
}


exports.updateParticipants = function(req, res) {
    var resToClient = res;
    var CCAName = req.body.CCAName;
    var eventName = req.body.eventName;
    var students = req.body.students;

    async.waterfall([
            function(callback){
                 db.collection('users').find({google_id:req.params.user_id}).toArray(function(err, user) {
                    if (err) {
                        callback(err, []);
                    } else {
                        callback(null,user);
                    } 
                });
            },
            function(user, callback){ 
                var studentsToAdd = [];
                var studentsToDelete = [];
                for (var i = 0; i < students.length; i++) {
                    if (students[i].selected) {
                        studentsToAdd.push(students[i]);
                    } else {
                        studentsToDelete.push(students[i]);
                    }
                };

                callback(null, studentsToAdd, studentsToDelete, students, user);

            },
            function(studentsToAdd, studentsToDelete, students, callback){
                var fileName = CCAName+"-events-"+eventName;
                var q = "title = '" + fileName+"'";

                gapi.oauth2Client.setCredentials(user[0].credentials);
                gapi.googleDrive.files.list(
                    {'q':q,
                    'access_token':user[0].credentials.access_token
                },function(err, res){
                    if (err) {
                        var message = "error while finding the file by its name";
                        callback(message, []);
                    }else {
                        var items = res.items;

                        // if item is trashed or parent is not right 
                        // filter out the item
                        async.filter(items, 
                            function(item, callback){

                                if (!item.labels.trashed) {
                                    var id = item.parents[0].id;
                                    gapi.oauth2Client.setCredentials(user[0].credentials);
                                    gapi.googleDrive.files.get(
                                        {'fileId': id,
                                        'access_token':user[0].credentials.access_token
                                    }, function(err,res){
                                        if (err) {
                                            callback(false);
                                        } else {
                                            var folderName = CCAName+"-Events";
                                            if (res.title == folderName) {
                                                callback(true);
                                            } else {
                                                callback(false);
                                            }
                                        }
                                    });
                                }else {
                                    callback(false);
                                }
                            }, 
                            function(results){
                                var items = results;
                                console.log("finish filtering duplicate files");
                                console.log(items.length);

                                if (items.length == 0) {
                                    var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                                    callback(message, []);
                                } else if (items.length > 1) {
                                    var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                                    // console.log(items);
                                    callback(message, []);
                                } else {
                                    var item = items[0];

                                    callback(null, item, studentsToAdd, studentsToDelete, students, user);
                                }

                            }
                        );
                            
                    }
                });
            },
            function(item, studentsToAdd, studentsToDelete, students, user, callback){
                console.log("enter final process of students info");

                var id = item.id;

                if (item.mimeType == "application/vnd.google-apps.spreadsheet") {
                    var memberDetailsFileId = id;

                    var auth = {
                          type: 'Bearer',
                          value: user[0].credentials.access_token
                    };
                    var my_sheet = new googleSpreadsheetNew(memberDetailsFileId, auth);

                    my_sheet.getInfo( function( err, sheet_info ){
                        if (err) {
                            var message = "error while loading spreadsheet '"+fileName+"'";
                            callback(err, []);
                        } else {
                            console.log( sheet_info.title + ' is loaded' );

                            sheet_info.worksheets[0].getRows( function( err, rows ){
                                if (err) {
                                    callback(err);
                                } else {
                                    for (var i = 0; i < rows.length; i++) {
                                        var curId = rows[i].id;
                                        var indexToDelete = -1;
                                        
                                        for (var j = 0; j < studentsToAdd.length; j++) {
                                            if (studentsToAdd[j].id == curId) {
                                                indexToDelete = j;
                                                break;
                                            };
                                        };
                                        if (indexToDelete != -1) {
                                            studentsToAdd.splice(indexToDelete, 1);
                                        };
                                    };

                                    async.eachSeries(studentsToDelete, function(student, callback) {

                                        sheet_info.worksheets[0].getRows( function( err, rows ){
                                                if (err) {
                                                    callback(err);
                                                } else {
                                                    var deleted = false;
                                                    for (var i = 0; i < rows.length; i++) {
                                                        var curId = rows[i].id;
                                                        if (curId == student.id) {
                                                            deleted = true;
                                                            rows[i].del(callback);
                                                            break;
                                                        }                                                       
                                                    };
                                                    if (!deleted) {
                                                        callback();
                                                    };
                                                    
                                                }
                                            });

                                        }, function(err){
                                            // if any of the file processing produced an error, err would equal that error
                                            if( err ) {
                                                callback(err, []);
                                            } else {
                                                console.log("finish final process of students info");
                                                callback(null, item, studentsToAdd, students, user);
                                            }
                                    }); 
                                }
                            });             
                        }
                    });

                } else {
                    var message = "the file '"+fileName+"'in your google drive is not a spreadsheet";
                    callback(message, []);
                }

            }, 
            function (item, studentsToAdd, students, user, callback){

                if (item.mimeType == "application/vnd.google-apps.spreadsheet") {
                    
                    var memberDetailsFileId = item.id;
                  
                    googleSpreadsheet.load({
                        debug: true,
                        spreadsheetId: memberDetailsFileId,
                        worksheetName: 'Sheet1',
                        accessToken : {
                          type: 'Bearer',
                          token: user[0].credentials.access_token
                        }
                        }, function sheetReady(err, spreadsheet) {
                            if(err) {
                                callback(err, []);
                            } else {
                                spreadsheet.receive(function(err, rows, info) {
                                  if(err){
                                    throw err;
                                  }else {
                                    var numOfRows = info.totalRows;
                                    var nextRow = info.nextRow;
                                    


                                    if (numOfRows > 0 ) {
                                        var fieldNames = [];

                                        for (key in rows['1']) {
                                            var fieldName = rows['1'][key].replace(" ", "");
                                            fieldName = fieldName.toLowerCase();
                                            fieldNames.push(fieldName);
                                        };

                                        var targetStudentDetails = [];
                                        for (var i = 0; i < studentsToAdd.length; i++) {
                                            var curDetail = [studentsToAdd[i].name, studentsToAdd[i].id];

                                            for (key in studentsToAdd[i].data){
                                                curDetail.push((studentsToAdd[i].data)[key]);
                                            }

                                            // for (var j = 0; j < fieldNames.length; j++) {
                                            //     var curValue = "";
                                            //     if (fieldNames[j] == "id") {
                                            //         curValue = studentsToAdd[i].id;
                                            //     } else if (fieldNames[j] == "name") {
                                            //         curValue = studentsToAdd[i].name;
                                            //     } else {
                                            //         if ((studentsToAdd[i].data)[fieldNames[j]]) {
                                            //             curValue = (studentsToAdd[i].data)[fieldNames[j]];
                                            //         } 
                                            //     }
                                            //     curDetail.push(curValue);
                                            // };

                                            targetStudentDetails.push(curDetail);
                                        }; 

                                        contents = {};
                                        contents[nextRow] = targetStudentDetails;

                                        spreadsheet.add(contents);
                                        spreadsheet.send(function(err) {
                                          if(err) {
                                            callback(err, students);
                                            // console.log("edit spreadsheet error");
                                            // console.log(err);
                                          } else {
                                            callback(null, students);
                                          }
                                          
                                        });

                                    } else {
                                        var message = "the first row of spreadsheet " + item.title + " is not initialised";
                                        callback(message, []);
                                    }                
                                  } 
                                });
                            }
                        }
                    );

                }                
            }
        ], function (err, result) {
           if (err) {
                resToClient.json({message:err});
           } else {
                resToClient.json({message:"success", students:result})
           }
        });

};


/******************************************************************************************

url: /tasks/

*******************************************************************************************/

// more things to do 
// also add task to the total event detail
// treat "Attendance separately"
// remember to return a list of student (done by haven't checked)
exports.createTask = function(req, res){

    // res.json({message:"not implemented yet"});

    var resToClient = res;
    var CCAName = req.body.CCAName;
    var eventName = req.body.eventName;
    var taskName = req.body.newTaskName;


    async.parallel({
        updateEventList: function(callback){
            // find the file
            // find the row
            // find the cell
            // update the cell

            async.waterfall([
                    function(callback){
                        var fileName = CCAName+"-List of Events";
                        var q = "title = '" + fileName+"'";

                        gapi.googleDrive.files.list({'q':q}, function(err, res){
                            if (err) {
                                var message = "error while finding the file by its name";
                                callback(message, []);
                            }else {
                                var items = res.items;

                                // if item is trashed or parent is not right 
                                // filter out the item
                                async.filter(items, 
                                    function(item, callback){

                                        if (!item.labels.trashed) {
                                            var id = item.parents[0].id;
                                            gapi.googleDrive.files.get({'fileId': id}, function(err,res){
                                                if (err) {
                                                    callback(false);
                                                } else {
                                                    var folderName = CCAName;
                                                    if (res.title == folderName) {
                                                        callback(true);
                                                    } else {
                                                        callback(false);
                                                    }
                                                }
                                            });
                                        }else {
                                            callback(false);
                                        }
                                    }, 
                                    function(results){
                                        var items = results;
                                        console.log("finish filtering duplicate files");
                                        console.log(items.length);

                                        if (items.length == 0) {
                                            var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                                            callback(message, []);
                                        } else if (items.length > 1) {
                                            var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                                            // console.log(items);
                                            callback(message, []);
                                        } else {
                                            var item = items[0];

                                            callback(null, item);
                                        }

                                    }
                                );
                                    
                            }
                        });
                    },
                    function(item, callback){ //find the row for this event and update the task cell

                        var id = item.id;

                        if (item.mimeType == "application/vnd.google-apps.spreadsheet") {
                            
                            var targetFileId = id;
                                
                            var auth = {
                                  type: 'Bearer',
                                  value: gapi.oauth2Client.credentials.access_token
                            };
                            var my_sheet = new googleSpreadsheetNew(targetFileId, auth);

                            my_sheet.getInfo( function( err, sheet_info ){
                                if (err) {
                                    callback(err, []);
                                } else {
                                    // console.log(sheet_info);
                                    // console.log( sheet_info.title + ' is loaded' );
                                    sheet_info.worksheets[0].getRows( function( err, rows ){
                                        if (err) {
                                            callback(err, []);
                                        }else {
                                            // console.log(rows[0]);
                                            for (var i = 0; i < rows.length; i++) {
                                                // hardcoded
                                                if (rows[i].nameofevent == eventName) {
                                                    if (rows[i].studenttasks != "") {
                                                        rows[i].studenttasks+= ", ";
                                                    };
                                                    rows[i].studenttasks += taskName;
                                                    rows[i].save();
                                                }
                                            };
                                            callback(null, []);
                                        }
                                    });
                                }
                            })
                        } else {
                            var message = "the file '"+fileName+"'in your google drive is not a spreadsheet";
                            callback(message, []);
                        }

                    }], function (err, result) {
                       if (err) {
                            callback(err, result);
                       } else {
                            callback(null, result);
                       }
                    }
            );
        },
        UpdateParticipantList: function(callback){
            async.waterfall([
                    function(callback){
                        var fileName = CCAName+"-events-"+eventName;
                        var q = "title = '" + fileName+"'";

                        gapi.googleDrive.files.list({'q':q}, function(err, res){
                            if (err) {
                                var message = "error while finding the file by its name";
                                callback(message, []);
                            }else {
                                var items = res.items;

                                // if item is trashed or parent is not right 
                                // filter out the item
                                async.filter(items, 
                                    function(item, callback){

                                        if (!item.labels.trashed) {
                                            var id = item.parents[0].id;
                                            gapi.googleDrive.files.get({'fileId': id}, function(err,res){
                                                if (err) {
                                                    callback(false);
                                                } else {
                                                    var folderName = CCAName+"-Events";
                                                    if (res.title == folderName) {
                                                        callback(true);
                                                    } else {
                                                        callback(false);
                                                    }
                                                }
                                            });
                                        }else {
                                            callback(false);
                                        }
                                    }, 
                                    function(results){
                                        var items = results;
                                        console.log("finish filtering duplicate files");
                                        console.log(items.length);

                                        if (items.length == 0) {
                                            var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                                            callback(message, []);
                                        } else if (items.length > 1) {
                                            var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                                            // console.log(items);
                                            callback(message, []);
                                        } else {
                                            var item = items[0];

                                            callback(null, item);
                                        }

                                    }
                                );
                                    
                            }
                        });
                    },
                    function(item, callback){
                        console.log("enter final process of students info");

                        var id = item.id;

                        if (item.mimeType == "application/vnd.google-apps.spreadsheet") {
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
                                        spreadsheet.receive(function(err, rows, info) {
                                          if(err){
                                            throw err;
                                          }else {
                                            console.log(info);
                                            // console.log(rows);

                                            if (rows['1']) {
                                                // var fields = [];
                                                var columnCount = 0;
                                                for (key in rows['1']) {
                                                    // fields.push(rows['1'].key);
                                                    columnCount++;
                                                };
                                                columnCount++;
                                                // columnContent+="";

                                                var columnContent = {};
                                                columnContent[columnCount] = taskName;
                                                var rowContents = {};
                                                rowContents['1'] = columnContent;

                                                spreadsheet.add(rowContents);

                                                var students = [];
                                                for (key in rows) {
                                                    if (key != '1') {
                                                        var student = {};
                                                        student.name = rows[key]['1'];
                                                        student.id = rows[key]['2'];
                                                        student.status = false;
                                                        students.push(student);

                                                        var columnContent = {};
                                                        columnContent[columnCount] = "no";
                                                        var rowContents = {};
                                                        rowContents[key] = columnContent;

                                                        spreadsheet.add(rowContents);
                                                    };
                                                };

                                                spreadsheet.send(function(err) {
                                                  if(err) {
                                                    console.log(err);
                                                    callback(err, []);
                                                  } else {
                                                    console.log("finish editing");
                                                    callback(null, students);
                                                  }
                                                  
                                                });

                                            } else {
                                                callback("spreadsheet has no first row defining the fields", []);
                                            }
                                          } 
                                        });
                                    }
                                }
                            );

                        } else {
                            var message = "the file '"+fileName+"'in your google drive is not a spreadsheet";
                            callback(message, []);
                        }

                    }], function (err, result) {
                       if (err) {
                            callback(err, result);
                            // resToClient.json({message:err});
                       } else {
                            var task = {taskName:taskName, status:result};
                            // resToClient.json({message:"success", task:task})
                            callback(null, task);
                       }
                    }
            );


        }
    },
    function(err, results) {
        if (err) {
            resToClient.json({message:err})
        } else {
            var task = results.UpdateParticipantList;
            resToClient.json({message:"success", task:task});
        }
    });

}






/******************************************************************************************

url: //taskStatus//

*******************************************************************************************/

// finish but haven't tested...
exports.changeTaskStatus = function(req, res){
    var resToClient = res;

    var CCAName = req.body.CCAName;
    var eventName = req.body.eventName;
    var taskName = req.body.task.taskName;
    var students = req.body.task.status;

    // console.log("status");
    // console.log(req.body.task.status);

    async.waterfall([
            function(callback){
                var fileName = CCAName+"-events-"+eventName;
                var q = "title = '" + fileName+"'";

                gapi.googleDrive.files.list({'q':q}, function(err, res){
                    if (err) {
                        var message = "error while finding the file by its name";
                        callback(message, []);
                    }else {
                        var items = res.items;

                        // if item is trashed or parent is not right 
                        // filter out the item
                        async.filter(items, 
                            function(item, callback){

                                if (!item.labels.trashed) {
                                    var id = item.parents[0].id;
                                    gapi.googleDrive.files.get({'fileId': id}, function(err,res){
                                        if (err) {
                                            callback(false);
                                        } else {
                                            var folderName = CCAName+"-Events";
                                            if (res.title == folderName) {
                                                callback(true);
                                            } else {
                                                callback(false);
                                            }
                                        }
                                    });
                                }else {
                                    callback(false);
                                }
                            }, 
                            function(results){
                                var items = results;
                                console.log("finish filtering duplicate files");
                                console.log(items.length);

                                if (items.length == 0) {
                                    var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                                    callback(message, []);
                                } else if (items.length > 1) {
                                    var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                                    // console.log(items);
                                    callback(message, []);
                                } else {
                                    var item = items[0];

                                    callback(null, item);
                                }

                            }
                        );
                            
                    }
                });
            },
            function(item, callback){

                var id = item.id;

                if (item.mimeType == "application/vnd.google-apps.spreadsheet") {
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
                                spreadsheet.receive(function(err, rows, info) {
                                  if(err){
                                    throw err;
                                  }else {
                                    console.log(info);
                                    // console.log(rows);

                                    if (rows['1']) {
                                        var columnCount = 1;
                                        var isTaskColumnFound = false;
                                        for (key in rows['1']) {
                                            if (rows['1'][key] == taskName) {
                                                isTaskColumnFound = true;
                                                break;
                                            }
                                            columnCount++;
                                        };
                                        
                                        if (isTaskColumnFound) {
                                            for (key in rows) {
                                                if (key != '1') {
                                                    var curId = rows[key]['2'];
                                                    var hasDone = false;
                                                    if (rows[key][columnCount] == "yes") {
                                                        hasDone = true;
                                                    }

                                                    for (var i = 0; i < students.length; i++) {
                                                        if (students[i].id == curId) {
                                                            if (students[i].status && !hasDone) {
                                                                var columnContent = {};
                                                                columnContent[columnCount] = "yes";
                                                                var rowContents = {};
                                                                rowContents[key] = columnContent;
                                                                spreadsheet.add(rowContents);
                                                            } else if (!students[i].status && hasDone){
                                                                var columnContent = {};
                                                                columnContent[columnCount] = "no";
                                                                var rowContents = {};
                                                                rowContents[key] = columnContent;
                                                                spreadsheet.add(rowContents);
                                                            }
                                                        }   
                                                    };
                                                };
                                            };

                                            spreadsheet.send(function(err) {
                                              if(err) {
                                                console.log(err);
                                                callback(err, []);
                                              } else {
                                                console.log("finish editing");
                                                callback(null, students);
                                              }
                                              
                                            });
                                        } else {
                                            callback("cannot find the corresponding task", []);
                                        }


                                    } else {
                                        callback("spreadsheet has no first row defining the fields", []);
                                    }
                                  } 
                                });
                            }
                        }
                    );

                } else {
                    var message = "the file '"+fileName+"'in your google drive is not a spreadsheet";
                    callback(message, []);
                }

            }], function (err, result) {
               if (err) {
                    resToClient.json({message:err});
               } else {
                    resToClient.json({message:"success"});
               }
            }
    );

}


/******************************************************************************************

helper methods

*******************************************************************************************/

// this is not really a function, because the async nature makes it not suitable
// as a function
// to use it just copy paste the code over
function findFileIdByName(fileName, resToClient){
    if (!gapi.oauth2Client.credentials.access_token) {
        resToClient.json({message: "please log in first"});
    }

    var q = "title = '" + fileName+"'";

    gapi.googleDrive.files.list({'q':q}, function(err, res){
        if (err) {
            resToClient.json({message: "error while finding the file by its name", err:err});
        }else {
            var items = res.items;
            
            if (items.length == 0) {
                var message = "cannot find the target spreadsheet '"+fileName+"'under the target CCA folder";
                resToClient.json({message: message});
            } else if (items.length > 1) {
                var message = "duplicate spreadsheets '"+fileName+"'in your google drive";
                resToClient.json({message: message});
            } else {

            }

        }
        
    });    
}

function copySelectedInfoBetweensheetsWithFileDetail(item1, item2, selected, resToClient){   
    if (!gapi.oauth2Client.credentials.access_token) {
        resToClient.json({message: "please log in first"});
    }

    if (item1.mimeType == "application/vnd.google-apps.spreadsheet") {
        var targetFileId = item1.id;

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
                        console.log("finish reading data from spreadsheet");
                        appendRowsToSheetWithDetails(item2, targetStudentDetails, resToClient);
                      } 
                    });
                }

            }
        );

    } else {
        var message = "unknown type error of student detail file: " + res.mimeType;
        resToClient.json({message:message});
    }
}

function copySelectedInfoBetweensheets(sheet1Id, sheet2Id, selected, resToClient){   
    if (!gapi.oauth2Client.credentials.access_token) {
        resToClient.json({message: "please log in first"});
    }

    gapi.googleDrive.files.get({'fileId': sheet1Id}, function(err,res){
        if (err) {
            resToClient.json({message:"error when checking a file", err:err});
        }

        if (res.mimeType == "application/vnd.google-apps.spreadsheet") {
            var targetFileId = sheet1Id;

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
                            console.log("finish reading data from spreadsheet");
                            appendRowsToSheet(sheet2Id, targetStudentDetails, resToClient);
                          } 
                        });
                    }

                }
            );

        } else {
            var message = "unknown type error of student detail file: " + res.mimeType;
            resToClient.json({message:message});
        }
    });
}

function appendRowsToSheetWithDetails(item, targetStudentDetails, resToClient){
    if (!gapi.oauth2Client.credentials.access_token) {
        resToClient.json({message: "please log in first"});
    }

    if (item.mimeType == "application/vnd.google-apps.spreadsheet") {
        var memberDetailsFileId = item.id;

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
                        spreadsheet.send(function(err) {
                          if(err) {
                            resToClient.json({message:"edit spreadsheet error", err:err});
                            // console.log("edit spreadsheet error");
                            // console.log(err);
                          } else {
                            resToClient.json({message:"success"});
                          }
                          
                        });
                      } 
                    });
                }
            }
        );
    }
}

function appendRowsToSheet(sheet2Id, targetStudentDetails, resToClient){
	if (!gapi.oauth2Client.credentials.access_token) {
        resToClient.json({message: "please log in first"});
    }

	gapi.googleDrive.files.get({'fileId': sheet2Id}, function(err,res){
	    if (err) {
	        resToClient.json({message:"error when checking a file", err:err});
	    }

	    if (res.mimeType == "application/vnd.google-apps.spreadsheet") {
	        var memberDetailsFileId = sheet2Id;

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
	                        spreadsheet.send(function(err) {
	                          if(err) {
	                          	resToClient.json({message:"edit spreadsheet error", err:err});
	                            // console.log("edit spreadsheet error");
	                            // console.log(err);
	                          } else {
	                          	resToClient.json({message:"success"});
	                          }
	                          
	                        });
	                      } 
	                    });
	                }
	            }
	        );
		}
	});
}

// this function read the student details from a spreadsheet
// then pass back selected and the newly found student details back to the callback function
function readFromASpreadSheetWithFileDetail(item, selected, callback, user){
    if (!gapi.oauth2Client.credentials.access_token) {
        var message = "please log in first";
        callback(message, []);
    } else {
        if (item) {

            if (item.mimeType == "application/vnd.google-apps.spreadsheet") {
                
                var targetFileId = item.id;
                    
                var auth = {
                      type: 'Bearer',
                      value: gapi.oauth2Client.credentials.access_token
                };
                var my_sheet = new googleSpreadsheetNew(targetFileId, auth);

                my_sheet.getInfo( function( err, sheet_info ){
                    if (err) {
                        callback(err, []);
                    } else {
                        // console.log(sheet_info);
                        // console.log( sheet_info.title + ' is loaded' );
                        sheet_info.worksheets[0].getRows( function( err, rows ){
                            if (err) {
                                callback(err, []);
                            }else {
                                var studentInfo = [];
                                var excludedFileds = ["_xml", "name", "id", "title", "content", "_links", "save", "del"];

                                for (var i = 0; i < rows.length; i++) {
                                    // hardcoded
                                    var row = rows[i];
                                    var student = {};
                                    student.id = row.id;
                                    student.name = row.name;
                                    var data = {};
                                    for (key in row){
                                        if (excludedFileds.indexOf(key) == -1) {
                                            data[key] = row[key];
                                        };
                                    }
                                    student.data = data;
                                    studentInfo.push(student);
                                };
                                callback(null, selected, studentInfo, user);
                            }
                        });
                    }
                });






                // var targetFileId = item.id;

                // console.log("trying to reading spreadsheet " + item.title);

                // googleSpreadsheet.load({
                //     debug: true,
                //     spreadsheetId: targetFileId,
                //     worksheetName: 'Sheet1',
                //     accessToken : {
                //       type: 'Bearer',
                //       token: gapi.oauth2Client.credentials.access_token
                //     }
                //     }, function sheetReady(err, spreadsheet) {
                //         if(err) {
                //             var message = "error when loading the spreadsheet";
                //             callback(message, []);
                //         } else {
                //             spreadsheet.receive(function(err, rows, info) {
                //                 // console.log(JSON.stringify(spreadsheet));
                //               if(err){
                //                 var message = "error while reading spreadsheet";
                //                 callback(message, []);
                //               }else {
                //                 var numOfRows = info.totalRows;
                //                 var studentInfo = [];

                //                 if (numOfRows <= 0) {
                //                     var message = "first row of spreadsheet " +  item.title + " is not initialised";
                //                     callback(message, []);


                //                 } else {
                //                     var fieldNames = [];
                //                     for (key in rows['1']){
                //                         fieldNames.push(rows['1'][key]);
                //                     }


                //                     for (var i = 2; i < numOfRows+1; i++) {
                //                         var index = '' + i;
                //                         var curStudent = rows[index];
                //                         console.log(curStudent);

                //                         var curRow = {};
                //                         // var curRow = [];
                //                         var fieldCount = 0;
                //                         for (index2 in curStudent) {
                //                             curRow[fieldNames[fieldCount]] = curStudent[index2];
                //                             fieldCount++;
                //                             // curRow.push(curStudent[index2]);
                //                         };

                //                         var curInfo = {name:curStudent['1'] , id:curStudent['2'], data:curRow }
                //                         studentInfo.push(curInfo);
                //                     };

                //                     console.log("finish reading spreadsheet " + item.title);
                //                     callback(null, selected, studentInfo);
                //                 }
                //               } 
                //             });
                //         }

                //     }
                // );

            } else {
                var message = "unknown type error of student detail file: " + res.mimeType;
                callback(message, []);
            }
        }else {
            var message = "no target spreadsheet id is received";
            callback(message, []);
        }
    }
}

function readStudentInfoFromASpreadSheetWithFileDetail(item, resToClient){
    if (!gapi.oauth2Client.credentials.access_token) {
        resToClient.json({message: "please log in first"});
    } else {
        if (item) {

            if (item.mimeType == "application/vnd.google-apps.spreadsheet") {
                var targetFileId = item.id;

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
                            spreadsheet.receive(function(err, rows, info) {
                                console.log(JSON.stringify(spreadsheet));
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

                                resToClient.json({message:"success", students: studentInfo});
                              } 
                            });
                        }

                    }
                );

            } else {
                var message = "unknown type error of student detail file: " + res.mimeType;
                resToClient.json({message:message});
            }
        }else {
            resToClient.json({message:"no target spreadsheet id is received"});
        }
    }
}


// this function read the target spreadsheet from row 2 and return all name and id
function readStudentInfoFromASpreadSheet(sheetId, resToClient){
	if (!gapi.oauth2Client.credentials.access_token) {
        resToClient.json({message: "please log in first"});
    } else {
        if (sheetId) {
            gapi.googleDrive.files.get({'fileId': sheetId}, function(err,res){
                if (err) {
                    resToClient.json({message:"error when loading the target spreadsheet file", err:err});
                }

                if (res.mimeType == "application/vnd.google-apps.spreadsheet") {
                    var targetFileId = sheetId;

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
                                spreadsheet.receive(function(err, rows, info) {
                                    console.log(JSON.stringify(spreadsheet));
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

                                    resToClient.json({message:"success", students: studentInfo});
                                  } 
                                });
                            }

                        }
                    );

                } else {
                    var message = "unknown type error of student detail file: " + res.mimeType;
                    resToClient.json({message:message});
                }
            });

        }else {
            resToClient.json({message:"no target spreadsheet id is received"});
        }
    }

    

}



// assuming that CCADirectoryID is not null
function appendStudentDetailsToOneCCA(CCADirectoryID, CCAName, targetStudentDetails, resToClient){

	gapi.googleDrive.children.list({'folderId': CCADirectoryID}, function(err,res){
		if (res) {
			var numOfChildrenInRoot = res.items.length;
			var numOfChildrenInRootChecked = 0;
			var isTargetCCAFolderFound = false;

			for (var i = 0; i < numOfChildrenInRoot; i++) {
				var id = res.items[i].id;
				
				gapi.googleDrive.files.get({'fileId': id}, function(err,res){
					if (err) {
						resToClient.json({message:"error when checking a file", err:err});
                    }

                    if (res.title == CCAName && res.mimeType == 'application/vnd.google-apps.folder'){
                    	isTargetCCAFolderFound = true;


                    	var targetCCAFolderId = res.id;
                        gapi.googleDrive.children.list({'folderId': targetCCAFolderId}, function(err,res){
                            if (res) {
                                var numOfChildrenInTargetFolder = res.items.length;
                                var numOfChildrenInTargetFolderChecked = 0;
                                var isMemberDetailsSpreadsheetFound = false;

                                for (var i = 0; i < numOfChildrenInTargetFolder; i++) {
                                    var id = res.items[i].id;
                                    gapi.googleDrive.files.get({'fileId': id}, function(err,res){
                                        if (err) {
                                            resToClient.json({message:"error when checking a file", err:err});
                                        }

                                        if (res.title === memberDetailsFilename && res.mimeType == "application/vnd.google-apps.spreadsheet") {
                                            var memberDetailsFileId = id;
                                            isMemberDetailsSpreadsheetFound = true;

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
                                                            spreadsheet.send(function(err) {
                                                              if(err) {
                                                              	resToClient.json({message:"edit spreadsheet error", err:err});
                                                                // console.log("edit spreadsheet error");
                                                                // console.log(err);
                                                              } else {
                                                              	resToClient.json({message:"success"});
                                                              }
                                                              
                                                            });
                                                          } 
                                                        });
                                                    }

                                                }
                                            );
										}

										numOfChildrenInTargetFolderChecked++;
										if (numOfChildrenInTargetFolderChecked == numOfChildrenInTargetFolder && !isMemberDetailsSpreadsheetFound) {
											resToClient.json({message:"Student Details Spreadsheet is not found under the target CCA folder"});
                                        }
                                    });
                                };

                            } else {
                                resToClient.json({message:"error when accessing CCA Admin folder", err:err});
                            }
                        });
					}

					numOfChildrenInRootChecked++;
					if (numOfChildrenInRoot == numOfChildrenInRootChecked && !isTargetCCAFolderFound) {
						resToClient.json({message:"target CCA folder is not found under CCA-Admin folder"});
                    }
				});
			}

		} else {
			resToClient.json({message:"error when accessing CCA Admin folder", err:err});
		}
	});



}
