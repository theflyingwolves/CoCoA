var gapi = require('./gapi');
var googleSpreadsheet = require('edit-google-spreadsheet');

var studentDetailsFilename = "Student Details";
var memberDetailsFilename = "Student Details";

exports.getAllStudents = function(req, res) {
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

exports.addMembersToCCA = function(req, res) {
    var resToClient = res;
    var CCADirectoryID = "";
    if (rootFolderId) {
        CCADirectoryID = rootFolderId;
    };

    var CCAName = req.body.CCAName;
    var students = req.body.students;    

    if (!gapi.oauth2Client.credentials.access_token) {
        resToClient.json({message: "please log in first"});
    }

    if (CCADirectoryID !== "") {
        gapi.googleDrive.children.list({'folderId': CCADirectoryID}, function(err,res){
            if (res) {
                var studentDetailsFound = false;
                var numOfChildrenChecked = 0;
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
                                                appendStudentDetailsToOneCCA(CCADirectoryID, CCAName, targetStudentDetails, resToClient);
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

                        numOfChildrenChecked++;
                        if ((!studentDetailsFound) && (numOfChildrenChecked == numOfChildren)) {
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
