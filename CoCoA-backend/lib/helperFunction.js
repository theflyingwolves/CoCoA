var gapi = require('./gapi');
var googleSpreadsheet = require('edit-google-spreadsheet');
var googleSpreadsheetNew = require('google-spreadsheet');
var async = require('async');

var studentDetailsFilename = "Student Details";
var memberDetailsFilename = "Student Details";

exports.getAllStudents = function(req, res) {
	var studentSheetId = req.body.studentSheetId;
    readStudentInfoFromASpreadSheet(studentSheetId, res);
	// var resToClient = res;
 //    var CCADirectoryID = rootFolderId;
 //    var studentDetailsFilename = "Student Details";
 //    // var fileName = "testSheet";
 //    // console.log("test access_token");
 //    if (!gapi.oauth2Client.credentials.access_token) {
 //        resToClient.json({message: "please log in first"});
 //    }

 //    if (CCADirectoryID !== "") {
 //        gapi.googleDrive.children.list({'folderId': CCADirectoryID}, function(err,res){
 //            if (res) {
 //                var studentDetailsFound = false;
 //                var numOfChildren = res.items.length;

 //                for (var i = 0; i < numOfChildren; i++) {
 //                    var id = res.items[i].id;
 //                    gapi.googleDrive.files.get({'fileId': id}, function(err,res){
 //                        if (err) {
 //                            resToClient.json({message:"error when checking a file", err:err});
 //                        }

 //                        if (res.title === studentDetailsFilename) {
 //                            studentDetailsFound = true;

 //                            if (res.mimeType == "application/vnd.google-apps.spreadsheet") {
 //                                var targetFileId = res.id;

 //                                googleSpreadsheet.load({
 //                                    debug: true,
 //                                    spreadsheetId: targetFileId,
 //                                    worksheetName: 'Sheet1',
 //                                    accessToken : {
 //                                      type: 'Bearer',
 //                                      token: gapi.oauth2Client.credentials.access_token
 //                                    }
 //                                    }, function sheetReady(err, spreadsheet) {
 //                                        if(err) {
 //                                            resToClient.json({message:"error when loading the spreadsheet", err:err});
 //                                        } else {
 //                                            spreadsheet.receive(function(err, rows, info) {
 //                                            	console.log(JSON.stringify(spreadsheet));
 //                                              if(err){
 //                                                throw err;
 //                                              }else {
 //                                                var numOfRows = info.totalRows;
 //                                                var studentInfo = [];

 //                                                for (var i = 2; i < numOfRows+1; i++) {
 //                                                    var index = '' + i;
 //                                                    var curStudent = rows[index];
 //                                                    var curInfo = {name:curStudent['1'] , id:curStudent['2'] }
 //                                                    studentInfo.push(curInfo);
 //                                                };

 //                                                resToClient.json({message:"success", students: studentInfo});
 //                                              } 
 //                                            });
 //                                        }

 //                                    }
 //                                );

 //                            } else {
 //                                var message = "unknown type error of student detail file: " + res.mimeType;
 //                                resToClient.json({message:message});
 //                            }
 //                        };

 //                        if ((!studentDetailsFound) && (i == (numOfChildren - 1))) {
 //                            resToClient.json({message:"Student Details spreadsheet is not found under CCA-admin folder"});
 //                        }   
 //                    });
 //                }   
 //            } else{
 //                resToClient.json({message:"error when accessing CCA Admin folder", err:err});
 //            }
 //        });
 //    } else {
 //        resToClient.json({message:"cannot find CCA Admin folder in user google drive"});
 //    }
    
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
	var CCAMemberSheetId = req.body.CCAMemberSheetId
    readStudentInfoFromASpreadSheet(CCAMemberSheetId, res);
}


exports.addMembersToCCA = function(req, res) {
	var studentSheetId = req.body.studentSheetId;
	var memberSheetId = req.body.memberSheetId;
	var students = req.body.students;

	copySelectedInfoBetweensheets(studentSheetId, memberSheetId, students, res);

    // var resToClient = res;

    // var CCAName = req.body.CCAName;
    // var students = req.body.students;    

    // if (!gapi.oauth2Client.credentials.access_token) {
    //     resToClient.json({message: "please log in first"});
    // }

    // if (rootFolderId) {
    //     gapi.googleDrive.children.list({'folderId': rootFolderId}, function(err,res){
    //         if (res) {
    //             var studentDetailsFound = false;
    //             var numOfChildrenChecked = 0;
    //             var targetStudentDetails = [];
    //             var numOfChildren = res.items.length;

    //             for (var i = 0; i < numOfChildren; i++) {
    //                 var id = res.items[i].id;
    //                 gapi.googleDrive.files.get({'fileId': id}, function(err,res){
    //                     if (err) {
    //                         resToClient.json({message:"error when checking a file", err:err});
    //                     }

    //                     if (res.title === studentDetailsFilename) {
    //                         studentDetailsFound = true;

    //                         if (res.mimeType == "application/vnd.google-apps.spreadsheet") {
    //                             var targetFileId = res.id;

    //                             googleSpreadsheet.load({
    //                                 debug: true,
    //                                 spreadsheetId: targetFileId,
    //                                 worksheetName: 'Sheet1',
    //                                 accessToken : {
    //                                   type: 'Bearer',
    //                                   token: gapi.oauth2Client.credentials.access_token
    //                                 }
    //                                 }, function sheetReady(err, spreadsheet) {
    //                                     if(err) {
    //                                         resToClient.json({message:"error when loading the spreadsheet", err:err});
    //                                     } else {

    //                                         spreadsheet.receive(function(err, rows, info) {
    //                                           if(err){
    //                                             throw err;
    //                                           }else {
    //                                           	console.log(spreadsheet.add);
    //                                           	console.log(spreadsheet.del);
    //                                           	console.log(rows['1'].del);


    //                                             var numOfRows = info.totalRows;

    //                                             var curRow = []
    //                                             for (index in rows['1']) {
    //                                                 curRow.push(rows['1'][index]);
    //                                             };
    //                                             targetStudentDetails.push(curRow);
    //                                             // targetStudentDetails.push(rows['1']);

    //                                             for (var i = 2; i < numOfRows+1; i++) {
    //                                                 var index = '' + i;
    //                                                 var curStudent = rows[index];
    //                                                 var curId = curStudent['2'];
    //                                                 if ((students.indexOf(curId)) !== -1) {
    //                                                     var curRow = []
    //                                                     for (index in curStudent) {
    //                                                         curRow.push(curStudent[index]);
    //                                                     };
    //                                                     targetStudentDetails.push(curRow);
    //                                                 }
    //                                             };
    //                                             console.log("finish reading data from spreadsheet");
    //                                             appendStudentDetailsToOneCCA(rootFolderId, CCAName, targetStudentDetails, resToClient);
    //                                           } 
    //                                         });
    //                                     }

    //                                 }
    //                             );

    //                         } else {
    //                             var message = "unknown type error of student detail file: " + res.mimeType;
    //                             resToClient.json({message:message});
    //                         }
    //                     } 

    //                     numOfChildrenChecked++;
    //                     if ((!studentDetailsFound) && (numOfChildrenChecked == numOfChildren)) {
    //                         resToClient.json({message:"Student Details spreadsheet is not found under CCA-admin folder"});
    //                     }   
    //                 });
    //             } 
    //         } else{
    //             resToClient.json({message:"error when accessing CCA Admin folder", err:err});
    //         }
    //     });
    // } else {
    //     resToClient.json({message:"cannot find CCA Admin folder in user google drive"});
    // }
};

// currently this method assume the spreadsheet doesnt contain duplicate students (which is reasonable)
// it is slow since it has to delete the students one by one
exports.deleteMembersFromCCA = function(req, res) {
    var resToClient = res;

    var CCAName = req.body.CCAName;
    var students = req.body.students;    

    if (!gapi.oauth2Client.credentials.access_token) {
        resToClient.json({message: "please log in first"});
    }

	if (rootFolderId) {
        
        gapi.googleDrive.children.list({'folderId': rootFolderId}, function(err,res){
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

                                            var auth = {
			                                      type: 'Bearer',
			                                      value: gapi.oauth2Client.credentials.access_token
			                                };
			                                var my_sheet = new googleSpreadsheetNew(memberDetailsFileId, auth);

											my_sheet.getInfo( function( err, sheet_info ){
										        if (err) {
										        	console.log(err);
										        } else {
										        	console.log(sheet_info);
										        }

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


												// async.whilst(
												//     function () { return (rowLastLastTime != rowLastTime); },
												//     function (callback) {
												        // sheet_info.worksheets[0].getRows( function( err, rows ){
												        //     if (err) {
												        //     	callback(err);
												        //     } else {
												        //     	var numOfRows = rows.length;
                    //                                             console.log ("numOfRows");
                    //                                             console.log (numOfRows);
													       //      for (var i = 0; i < rows.length; i++) {
													       //      	var curId = rows[i].id;
										          //   	            if ((students.indexOf(curId)) !== -1) {
				                //                                         rows[i].del();
				                //                                         numOfRows--;
				                //                                         break;
				                //                                     }										            	
													       //      };

													       //      rowLastLastTime = rowLastTime;
													       //      rowLastTime = numOfRows;
													       //      callback();
												        //     }
												        // });
												//     },
												//     function (err) {
												//         console.log("finish all");
												//         resToClient.json({message:"finish all"});
												//     }
												// );


										    })



                                            // googleSpreadsheet.load({
                                            //     debug: true,
                                            //     spreadsheetId: memberDetailsFileId,
                                            //     worksheetName: 'Sheet1',
                                            //     accessToken : {
                                            //       type: 'Bearer',
                                            //       token: gapi.oauth2Client.credentials.access_token
                                            //     }
                                            //     }, function sheetReady(err, spreadsheet) {
                                            //         if(err) {
                                            //             resToClient.json({message:"error when loading the spreadsheet", err:err});
                                            //         } else {
                                            //             spreadsheet.receive(function(err, rows, info) {
                                            //               if(err){
                                            //                 throw err;
                                            //               }else {
                                            //                 var numOfRows = info.totalRows;
                                            //                 var nextRow = info.nextRow;

                                            //                 if (numOfRows == 0) {

                                            //                 }


                                            //                 var targetStudentDetails = [];
                                            //                 var curRow = []
			                                         //        for (index in rows['1']) {
			                                         //            curRow.push(rows['1'][index]);
			                                         //        };
			                                         //        targetStudentDetails.push(curRow);
			                                         //        // targetStudentDetails.push(rows['1']);

			                                         //        for (var i = 2; i < numOfRows+1; i++) {
			                                         //            var index = '' + i;
			                                         //            var curStudent = rows[index];
			                                         //            var curId = curStudent['2'];
			                                         //            if ((students.indexOf(curId)) == -1) {
			                                         //                var curRow = []
			                                         //                for (index in curStudent) {
			                                         //                    curRow.push(curStudent[index]);
			                                         //                };
			                                         //                targetStudentDetails.push(curRow);
			                                         //            }
			                                         //        };


                                            //                 console.log(targetStudentDetails);
                                            //                 if (numOfRows > 1 && targetStudentDetails.length > 0) {
                                            //                     targetStudentDetails.splice(0, 1);
                                            //                 }
                                            //                 console.log(numOfRows);

                                            //                 contents = {};
                                            //                 contents[nextRow] = targetStudentDetails;

                                            //                 spreadsheet.add(contents);
                                            //                 spreadsheet.send(function(err) {
                                            //                   if(err) {
                                            //                   	resToClient.json({message:"edit spreadsheet error", err:err});
                                            //                     // console.log("edit spreadsheet error");
                                            //                     // console.log(err);
                                            //                   } else {
                                            //                   	resToClient.json({message:"success"});
                                            //                   }
                                                              
                                            //                 });
                                            //               } 
                                            //             });
                                            //         }

                                            //     }
                                            // );
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


    } else {
        resToClient.json({message:"cannot find CCA Admin folder in user google drive"});
    }



}



/******************************************************************************************

url: /participants/

*******************************************************************************************/


exports.getParticipants = function(req, res) {
    var eventStuentSheetId = req.body.eventStuentSheetId
    readStudentInfoFromASpreadSheet(eventStuentSheetId, res);
}


exports.addParticipants = function(req, res) {
	var memberSheetId = req.body.memberSheetId;
	var participantSheetId = req.body.participantSheetId;
	var students = req.body.students;

	copySelectedInfoBetweensheets(memberSheetId, participantSheetId, students, res);
}





/******************************************************************************************

helper methods

*******************************************************************************************/

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

// this function read the target spreadsheet from row 2 and return all name and id
function readStudentInfoFromASpreadSheet(sheetId, resToClient){
	if (!gapi.oauth2Client.credentials.access_token) {
        resToClient.json({message: "please log in first"});
    }

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
