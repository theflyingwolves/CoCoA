var gapi = require('./gapi');
var googleSpreadsheet = require('edit-google-spreadsheet');
var googleSpreadsheetNew = require('google-spreadsheet');
var async = require('async');

var studentDetailsFilename = "Student Details";
var memberDetailsFilename = "Student Details";

exports.getAllStudents = function(req, res) {
    var resToClient = res;

    if (!gapi.oauth2Client.credentials.access_token) {
        res.json({message: "please log in first"});
    } else {

        // this waterfall function first read the target CCAMembers
        // then read all student details
        // set the members as selected = true
        async.waterfall([
            function(callback){ //read the target CCAMembers if CCAName exists
                
                if (req.params.CCAName) {
                    console.log("has CCAName");
                    var CCAName = req.params.CCAName;
                    var selectedStudents = [];

                    var fileName = CCAName+"-Student Details";
                    var q = "title = '" + fileName+"'";

                    gapi.googleDrive.files.list({'q':q}, function(err, res){
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
                                        gapi.googleDrive.files.get({'fileId': id}, function(err,res){
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

                                        readFromASpreadSheetWithFileDetail(item, [], callback);
                                    }

                                }
                            );
                        }
                    }); 
                }else {
                    callback(null, [], []);
                }
            },
            function(dummy, studentSelected, callback){
                var fileName = "Student Details";
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

                                    readFromASpreadSheetWithFileDetail(item, studentSelected, callback);
                                }

                            }
                        );
                            
                    }
                });
            },
            function(studentSelected, allStudents, callback){
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
};

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

    if (!gapi.oauth2Client.credentials.access_token) {
        res.json({message: "please log in first"});
    } else {
        // this waterfall function first read the target event participants
        // then read all CCAMembers
        // set the participants as selected = true
        async.waterfall([
            function(callback){ 

                if (req.params.eventName) {
                    console.log("has eventName");
                    var CCAName = req.params.CCAName;
                    var eventName = req.params.eventName;
                    var selectedStudents = [];

                    var fileName = CCAName+"-events-"+eventName;
                    var q = "title = '" + fileName+"'";

                    gapi.googleDrive.files.list({'q':q}, function(err, res){
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

                                        readFromASpreadSheetWithFileDetail(item, [], callback);
                                    }

                                }
                            );
                        }
                    }); 
                }else {
                    callback(null, [], []);
                }
            },
            function(dummy, studentSelected, callback){
                var CCAName = req.params.CCAName;
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
                                    gapi.googleDrive.files.get({'fileId': id}, function(err,res){
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

                                    readFromASpreadSheetWithFileDetail(item, studentSelected, callback);
                                }

                            }
                        );
                            
                    }
                });
            },
            function(studentSelected, allStudents, callback){
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
            function(callback){ //read the target CCAMembers if CCAName exists
                var studentsToAdd = [];
                var studentsToDelete = [];
                for (var i = 0; i < students.length; i++) {
                    if (students[i].selected) {
                        studentsToAdd.push(students[i]);
                    } else {
                        studentsToDelete.push(students[i]);
                    }
                };

                callback(null, studentsToAdd, studentsToDelete, students);

            },
            function(studentsToAdd, studentsToDelete, students, callback){
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
                                    gapi.googleDrive.files.get({'fileId': id}, function(err,res){
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

                                    callback(null, item, studentsToAdd, studentsToDelete, students);
                                }

                            }
                        );
                            
                    }
                });
            },
            function(item, studentsToAdd, studentsToDelete, students, callback){
                console.log("enter final process of students info");

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
                                                callback(null, item, studentsToAdd, students);
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
            function (item, studentsToAdd, students, callback){

                if (item.mimeType == "application/vnd.google-apps.spreadsheet") {
                    var memberDetailsFileId = item.id;

                    var targetStudentDetails = [];
                    for (var i = 0; i < studentsToAdd.length; i++) {
                        targetStudentDetails.push(studentsToAdd[i].data);
                    };

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
                                    // console.log(targetStudentDetails);
                                    // console.log(numOfRows);

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

// this function is no use at this point
// consider removing it later
exports.getParticipants = function(req, res) {
    var resToClient = res;

    var CCAName = req.body.CCAName;
    var eventName = req.body.eventName;
    var fileName = CCAName+"-events-"+eventName;

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
                var item = items[0];

                readStudentInfoFromASpreadSheetWithFileDetail(item, resToClient);
            }
        }     
    }); 
}


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


exports.updateMembersOfCCA = function(req, res) {
    var resToClient = res;
    var CCAName = req.body.CCAName;
    var eventName = req.body.eventName;
    var students = req.body.students;

    async.waterfall([
            function(callback){ 
                var studentsToAdd = [];
                var studentsToDelete = [];
                for (var i = 0; i < students.length; i++) {
                    if (students[i].selected) {
                        studentsToAdd.push(students[i]);
                    } else {
                        studentsToDelete.push(students[i]);
                    }
                };

                callback(null, studentsToAdd, studentsToDelete, students);

            },
            function(studentsToAdd, studentsToDelete, students, callback){
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

                                    callback(null, item, studentsToAdd, studentsToDelete, students);
                                }

                            }
                        );
                            
                    }
                });
            },
            function(item, studentsToAdd, studentsToDelete, students, callback){
                console.log("enter final process of students info");

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
                                                callback(null, item, studentsToAdd, students);
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
            function (item, studentsToAdd, students, callback){

                if (item.mimeType == "application/vnd.google-apps.spreadsheet") {
                    var memberDetailsFileId = item.id;

                    var targetStudentDetails = [];
                    for (var i = 0; i < studentsToAdd.length; i++) {
                        targetStudentDetails.push(studentsToAdd[i].data);
                    };

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
                                    // console.log(targetStudentDetails);
                                    // console.log(numOfRows);

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
function readFromASpreadSheetWithFileDetail(item, selected, callback){
    if (!gapi.oauth2Client.credentials.access_token) {
        var message = "please log in first";
        callback(message, []);
    } else {
        if (item) {

            if (item.mimeType == "application/vnd.google-apps.spreadsheet") {
                var targetFileId = item.id;

                console.log("trying to reading spreadsheet " + item.title);

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
                            var message = "error when loading the spreadsheet";
                            callback(message, []);
                        } else {
                            spreadsheet.receive(function(err, rows, info) {
                                // console.log(JSON.stringify(spreadsheet));
                              if(err){
                                var message = "error while reading spreadsheet";
                                callback(message, []);
                              }else {
                                var numOfRows = info.totalRows;
                                var studentInfo = [];

                                for (var i = 2; i < numOfRows+1; i++) {
                                    var index = '' + i;
                                    var curStudent = rows[index];

                                    var curRow = []
                                    for (index2 in curStudent) {
                                        curRow.push(curStudent[index2]);
                                    };

                                    var curInfo = {name:curStudent['1'] , id:curStudent['2'], data:curRow }
                                    studentInfo.push(curInfo);
                                };

                                console.log("finish reading spreadsheet " + item.title);
                                callback(null, selected, studentInfo);
                              } 
                            });
                        }

                    }
                );

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
