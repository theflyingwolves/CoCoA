angular.module('cocoa.controllers', [])

.factory('ServerInfo',function(){
  return {
    serverUrl:function(){
      return "http://ec2-54-169-89-65.ap-southeast-1.compute.amazonaws.com:3000";
    }
  };
})

.factory('AccountManager',function(){
  return {
    saveUserId:function(id){
      window.localStorage['userid'] = id;
    },
    getUserId: function(){
      return window.localStorage['userid'];
    }
  }
})

.factory('StatusTracker',function(){
  return {
    selectCCA: function(CCA){
      window.localStorage['currCCA'] = angular.toJson(CCA);
    },
    getCurrCCA: function(){
      var cca = window.localStorage['currCCA'];
      if(cca){
        return angular.fromJson(cca);
      }else{
        return {};
      }
    },
    enterEvent:function(event){
      window.localStorage['selectedEvent'] = angular.toJson(event);
    },
    getCurrEvent:function(){
      var event = window.localStorage['selectedEvent'];
      if(event){
        return angular.fromJson(event);
      }else{
        return {};
      }
    },
    saveCurrCCAForMemberEdit:function(ccaTitle){
      window.localStorage['currCCAForMemberEdit'] = angular.toJson(ccaTitle);
    },
    getCurrCCAForMemberEdit:function(cca){
      var ccaTitle = window.localStorage['currCCAForMemberEdit'];
      if(ccaTitle){
        return angular.fromJson(ccaTitle);
      }else{
        return "";
      }
    }
  }
})

.factory('Usergroups',function(){
  return {
    allStudentsInSchool:function(){
      var allSchoolStudents = angular.fromJson(window.localStorage['allSchoolStudents']);
      return allSchoolStudents;
    },

    all: function(){
      var allgroups = window.localStorage['usergroups'];
      if(allgroups){
        return angular.fromJson(allgroups);
      }else{
        return [];
      }
    },

    save: function(groups){
      window.localStorage['usergroups'] = angular.toJson(groups);
    },

    newCCA: function(name){
      return {
        title:name,
        members:[],
        events:[]
      };
    },

    saveEventList:function(events){
      var allgroups = angular.fromJson(window.localStorage['usergroups']);
      var activeIndex = parseInt(window.localStorage['lastActiveProject']);
      allgroups[activeIndex].eventlist = events;
      window.localStorage['usergroups'] = angular.toJson(allgroups);
    },

    getEventList:function(){
      var allgroups = angular.fromJson(window.localStorage['usergroups']);
      var activeIndex = parseInt(window.localStorage['lastActiveProject']);
      if(allgroups[activeIndex] && allgroups[activeIndex].eventlist != undefined){
        return allgroups[activeIndex].eventlist;
      }else{
        return [];
      }
    },

    newEvent: function(name){
      var id = this.generateRandomId();
      return {
        title:name,
        tasks:[],
        participants:[],
        id:id
      }
    },

    getLastActiveIndex: function(){
      return parseInt(window.localStorage['lastActiveProject']) || 0;
    },

    setLastActiveIndex: function(index) {
      console.log("Last Active Index Changed from "+parseInt(window.localStorage['lastActiveProject'])+" to "+index);
      window.localStorage['lastActiveProject'] = index;
    },

    generateRandomId: function(){
      var randId = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for( var i=0; i < 10; i++ ){
          randId += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      return randId;
    }
  };
})

.factory('EventViewFactory',function(){
  var selectedEvent = angular.fromJson(window.localStorage['selectedEvent']).event_details;

  var updateSelectedEvent = function(){
    selectedEvent = angular.fromJson(window.localStorage['selectedEvent']).event_details;
  };

  var saveSelectedEvent = function(){
      var event = angular.fromJson(window.localStorage['selectedEvent']);
      event.event_details = selectedEvent;
      window.localStorage['selectedEvent'] = angular.toJson(event);
  };

  return {
    allTasks:function(){
      updateSelectedEvent();
      if(selectedEvent.tasks){
        return selectedEvent.tasks;
      }else{
        selectedEvent.tasks = [];
        return selectedEvent.tasks;
      }
    },

    getEventInfo:function(){
      updateSelectedEvent();
      var startDateFormat = new Date(selectedEvent.startDate);
      var endDateFormat = new Date(selectedEvent.endDate);
      var currentDate = new Date();
      var isCurrentYear = true;
      if( ( !isNaN(startDateFormat.getFullYear()) && startDateFormat.getFullYear() != currentDate.getFullYear()) ||
        ( !isNaN(endDateFormat.getFullYear()) && endDateFormat.getFullYear() != currentDate.getFullYear() )){
        isCurrentYear = false;
      }

      return {
        title: selectedEvent.title,
        startDate: selectedEvent.startDate,
        endDate: selectedEvent.endDate,
        isCurrentYear: isCurrentYear,
        time: selectedEvent.time,
        venue: selectedEvent.venue,
        comments: selectedEvent.comments,
        TOIC:selectedEvent.TOIC,
        studentsNeeded:selectedEvent.studentsNeeded,
        reportTime:selectedEvent.reportTime,
        reportVenue:selectedEvent.reportVenue,
        id:selectedEvent.id
      }
    },

    getEventParticipants:function(){
      // return selectedEvent.participants;
      updateSelectedEvent();
      var cca_members = angular.fromJson(window.localStorage['selectedEvent']).cca_members;
      var eventParticipants = [];
      for(var i=0; i<cca_members.length; i++){
        var student = cca_members[i];
        if(student.selected){
          eventParticipants.push(student);
        }
      }

      return eventParticipants;
    },

    getTaskMemberList:function(){
      updateSelectedEvent();
      var cca_members = angular.fromJson(window.localStorage['selectedEvent']).cca_members;
      var students = [];

      console.log("cca_members: "+angular.toJson(cca_members));
      
      for(var i=0; i<cca_members.length; i++){
        var student = cca_members[i];
        if(student.selected){
          student.status = false;
          students.push(angular.fromJson(angular.toJson(student)));
        }
      }

      console.log("Task member list: "+angular.toJson(students));
      return students;
    },

    getCCAMembersForEvent:function(){
      updateSelectedEvent();
      var cca_members = angular.fromJson(window.localStorage['selectedEvent']).cca_members;
      return cca_members;
    },

    saveEventInfo:function(eventInfo){
      selectedEvent.startDate = eventInfo.startDate;
      selectedEvent.endDate = eventInfo.endDate;
      selectedEvent.time = eventInfo.time;
      selectedEvent.venue = eventInfo.venue;
      selectedEvent.studentsNeeded = eventInfo.studentsNeeded;
      selectedEvent.reportTime = eventInfo.reportTime;
      selectedEvent.reportVenue = eventInfo.reportVenue;
      selectedEvent.TOIC = eventInfo.TOIC;
      selectedEvent.comments = eventInfo.comments;

      saveSelectedEvent();
    },

    saveEventParticipants:function(participants){
      selectedEvent.participants = participants;
      saveSelectedEvent();
    },

    newTask: function(name){
      return {
        name:name,
        status:[],
        viewModel:{}
      }
    },

    saveTask:function(tasks){
      updateSelectedEvent();
      selectedEvent.tasks = tasks;
      saveSelectedEvent();
    }

  };
})

.factory('StudentInfoFactory',function(){
  return {
    getStudent:function(id){
      var allStudents = angular.fromJson(window.localStorage['allStudents']);
      var selectedStudent = undefined;
      for(var i=0; i<allStudents.length; i++){
        if(allStudents[i].id == id){
          selectedStudent = allStudents[i];
          break;
        }
      }
      return selectedStudent;
    }
  };
})

.controller('usergroupCtrl',function($scope,$http, $timeout, $ionicSideMenuDelegate, $stateParams, $ionicModal, $window, $ionicLoading, ServerInfo, Usergroups, AccountManager, StatusTracker){
  // AccountManager.saveUserId($stateParams.googleId);
  $scope.usergroups = Usergroups.all();
  // $scope.eventlist = Usergroups.getEventList();
  $scope.eventlist = [];
  $scope.filterText = "";
  $scope.allSchoolStudents = Usergroups.allStudentsInSchool();

  $ionicModal.fromTemplateUrl('templates/CCAAddMemberModal.html',{
    scope:$scope,
    animation:'slide-in-up'
  }).then(function(modal){
    $scope.memberModal = modal;
  });

  for(var i = 0 ; i < $scope.eventlist.length; i ++){
      var selectedEvent = $scope.eventlist[i];
      var startDateFormat = new Date(selectedEvent.startDate);
      var endDateFormat = new Date(selectedEvent.endDate);
      var currentDate = new Date();
      var isCurrentYear = true;
      if( ( !isNaN(startDateFormat.getFullYear()) && startDateFormat.getFullYear() != currentDate.getFullYear()) ||
        ( !isNaN(endDateFormat.getFullYear()) && endDateFormat.getFullYear() != currentDate.getFullYear() )){
        isCurrentYear = false;
      }
      $scope.eventlist[i].isCurrentYear = isCurrentYear;
  }

  var createNewCCA = function(name){
    $http.post(ServerInfo.serverUrl()+"/"+AccountManager.getUserId()+"/cca",{
      cca_title:name
    })

    .success(function(res){
      var newCCA = Usergroups.newCCA(name);
      newCCA.id = res.cca_id;
      $scope.usergroups.push(newCCA);
      Usergroups.save($scope.usergroups);
      $scope.selectCCA(newCCA, $scope.usergroups.length - 1);
      console.log("Selecting Members for new CCA");
    })

    .error(function(res){
      console.log("Error: Create New CCA");
    });
  };

  $scope.loadDataFromServer = function(){
    $ionicLoading.show({
        content: 'Loading Data',
        animation: 'fade-in',
        showBackdrop: false,
        maxWidth: 200,
        showDelay: 500
    });

    $http.get(ServerInfo.serverUrl()+"/"+AccountManager.getUserId()+"/cca")

    .success(function(data, status){

      console.log("Load Data From Server Status: "+angular.toJson(status)+" with data "+angular.toJson(data));
      console.log("Last Active Index: "+Usergroups.getLastActiveIndex());
      $ionicLoading.hide();

      while($scope.usergroups.length > 0){
        $scope.usergroups.pop();
      }

      for(var i=0; i<data.length;i++){
        $scope.usergroups.push(data[i]);
      }

      Usergroups.save($scope.usergroups);

      $scope.selectCCA($scope.usergroups[Usergroups.getLastActiveIndex()],Usergroups.getLastActiveIndex());

    })

    .error(function(data,status){
      console.log("Error: loadDataFromServer");
    });
  };

  $scope.newUserGroup = function(){
    var ccaName = prompt("Name for new CCA");
    if(ccaName && ccaName.trim() != ""){
      createNewCCA(ccaName);
    }
  };

  $scope.selectCCA = function(cca, index){
    $scope.activeGroup = cca;
    Usergroups.setLastActiveIndex(index);
    StatusTracker.selectCCA(cca);
    $ionicSideMenuDelegate.toggleLeft(false);

    while($scope.eventlist.length >0 ){
      $scope.eventlist.pop();
    }

    var events = Usergroups.getEventList();
    for(var i=0; i<events.length; i++){
      $scope.eventlist.push(events[i]);
    }
    console.log("Eveeees: "+angular.toJson($scope.eventlist));

    $http.get(ServerInfo.serverUrl()+"/"+AccountManager.getUserId()+"/cca/"+$scope.activeGroup.id+"/events")
    .success(function(data){
      console.log("Data Received: "+angular.toJson(data));
      while($scope.eventlist.length >0 ){
        $scope.eventlist.pop();
      }
      for(var i=0; i<data.list_of_events.length; i++){
        $scope.eventlist.push(data.list_of_events[i]);
      }

      Usergroups.saveEventList($scope.eventlist);
    });
  };

  var createNewEvent = function(name){
    $http.post(ServerInfo.serverUrl()+"/"+AccountManager.getUserId()+"/cca/"+$scope.activeGroup.id+"/events",{
      event_title:name
    })

    .success(function(res, status){
      res.id = res.event_spreadsheet_id;
      $scope.eventlist.push(res);
    })
    .error(function(res){
      console.log("Error: createNewEvent: "+angular.toJson(res));
    });
  };

  $scope.newEvent = function(){
    var eventName = prompt("Name for new event");
    if(eventName && eventName.trim() != ""){
      createNewEvent(eventName);
    }
  };

  $scope.enterEvent = function(id){
    $scope.loadingIndicator = $ionicLoading.show({
      content: 'Loading Data',
      animation: 'fade-in',
      showBackdrop: false,
      maxWidth: 200,
      showDelay: 500
    });

    var currCCA = StatusTracker.getCurrCCA();
    console.log("Enteringssss Event: "+ServerInfo.serverUrl()+"/"+AccountManager.getUserId()+"/cca/"+currCCA.id+"/events/"+id);

    $http.get(ServerInfo.serverUrl()+"/"+AccountManager.getUserId()+"/cca/"+currCCA.id+"/events/"+id)
    
    .success(function(data){
      console.log("Event Entered: "+angular.toJson(data));
      StatusTracker.enterEvent(data.event);
      // $scope.eventtasks = data.event.event_details.tasks;

      $window.location.href = "#/event/detail/"+id;
      $ionicLoading.hide();
    })

    .error(function(err){
      console.log("Error: Enter Event "+angular.toJson(err));
    });
  };

  $scope.showMemberModal = function(title){
    console.log("Showing");
    $scope.loadingIndicator = $ionicLoading.show({
      content: 'Loading Data',
      animation: 'fade-in',
      showBackdrop: false,
      maxWidth: 200,
      showDelay: 500
    });

    StatusTracker.saveCurrCCAForMemberEdit(title);
    $http.get(ServerInfo.serverUrl()+"/"+AccountManager.getUserId()+"/allStudents/"+title)
    .success(function(data){
      $ionicLoading.hide();
      $scope.allSchoolStudents = data.students;
      $scope.allSchoolStudentsViewModel = generatePartModel($scope.allSchoolStudents);
      $scope.memberModal.show();
    })
    .error(function(err){
      console.log("Error Retrieving Student Info in CCA Group Menu: "+angular.toJson(err));
    });
  };

  $scope.cancel = function(){
    $scope.memberModal.hide();
  };

  $scope.confirm = function(){
    var title = StatusTracker.getCurrCCAForMemberEdit();
    $scope.memberModal.hide();

    $http.put(ServerInfo.serverUrl()+"/"+AccountManager.getUserId()+"/membersOfCCA",{
      CCAName: title,
      students:$scope.allSchoolStudents
    })

    .success(function(data){
      console.log("CCA Members Updated: "+angular.toJson(data));
    })
    .error(function(err){
      console.log("Failed: CCA Member Info Update - "+angular.toJson(err));
    });
  };

  $scope.selectMember = function(student){
    student.selected = !student.selected;
  };

  var generatePartModel = function(array){
    var sorted = array.sort(function(a,b){
      return a.name.localeCompare(b.name);
    });

    var firstLetter = "A";
    var result = {};
    for(var i=0; i<sorted.length; i++){
      var item = sorted[i].name;
      var initial = item.toUpperCase().charAt(0);
      if( initial != firstLetter){
        firstLetter = initial;
      }
      if(result[firstLetter] == undefined){
        result[firstLetter] = [];
      }
      result[firstLetter].push(sorted[i]);
    }

    return result;
  };

  $timeout(function() {
    var data = Usergroups.all();
    while($scope.usergroups.length > 0){
      $scope.usergroups.pop();
    }

    for(var i=0; i<data.length;i++){
      $scope.usergroups.push(data[i]);
    }

    $scope.loadDataFromServer();
  });
})

.controller('eventTaskMenuCtrl',function($scope, $stateParams, $ionicSideMenuDelegate, $ionicModal, $ionicGesture, $ionicPopup,$http, $timeout, $location, $ionicScrollDelegate, EventViewFactory, AccountManager, ServerInfo, StatusTracker){
  $scope.eventtasks = EventViewFactory.allTasks();
  $scope.selectedTask = $scope.eventtasks[0];
  $scope.eventInfo = EventViewFactory.getEventInfo();
  $scope.selectedTaskIndex = -1;
  $scope.deletingTaskIndex = -1;
  $scope.isTaskStudentEditMode = false;
  $scope.isEditMode = false;

  $ionicModal.fromTemplateUrl('templates/eventEditParticipant.html',{
    scope:$scope,
    animation:'slide-in-up'
  }).then(function(modal){
    $scope.partEditModal = modal;
  });

  var createTask = function(name){
    console.log("Event Task: "+angular.toJson($scope.eventtasks));
    var currCCA = StatusTracker.getCurrCCA();
    var currEventDetails = StatusTracker.getCurrEvent().event_details;

    console.log("Creating Task: "+ServerInfo.serverUrl()+"/"+AccountManager.getUserId+"/tasks");
    console.log("CCAName: "+currCCA.title+" Event Name: "+currEventDetails.title);
    
    $http.post(ServerInfo.serverUrl()+"/"+AccountManager.getUserId()+"/tasks",{
      newTaskName:name,
      CCAName: currCCA.title,
      eventName: currEventDetails.title
    })

    .success(function(data){
      var task = data.task;
      task.status = EventViewFactory.getTaskMemberList();
      console.log("Event Participants: "+angular.toJson(task.status));
      task.viewModel = generatePartModel(task.status);
      console.log(task.viewModel);
      $scope.eventtasks.push(task);
      $scope.selectTask(task);
      $ionicSideMenuDelegate.toggleLeft(false);
    })

    .error(function(err){
      console.log("Failed: Create Task "+console.log(err));
    });

    // EventViewFactory.saveTask($scope.eventtasks);
    // $scope.selectTask(task);
    // $ionicSideMenuDelegate.toggleLeft(false);
  };

  $scope.selectTask = function(task, index){
    $scope.selectedTask = task;
    $scope.selectedTask.viewModel = generatePartModel($scope.selectedTask.status);
    console.log("Selecting Task: "+angular.toJson(task));
    $scope.selectedTaskIndex = index;
    console.log("isEdit"+$scope.isEditMode);
  };

  $scope.scrollTop = function() {
    $ionicScrollDelegate.scrollTop();
  };

  $scope.deleteTask = function(name){
    for(var i = 0; i < $scope.eventtasks.length; i++){
      if($scope.eventtasks[i].name == name){
        $scope.eventtasks.splice(i,1);
        EventViewFactory.saveTask($scope.eventtasks);
      }
    }
  }

  var updateTaskParticipants = function(){
    var allParticipants = $scope.eventParticipants;
    for(var i=0; i<$scope.eventtasks.length;i++){
      var task = $scope.eventtasks[i];
      var tempTaskStatus = angular.fromJson(angular.toJson(task.status));
      task.status = angular.fromJson(angular.toJson(allParticipants));
      for(var j=0; j<allParticipants.length; j++){
        var participant = task.status[j];
        for(var k=0; k<tempTaskStatus.length; k++){
          if(participant.id == tempTaskStatus[k].id){
            participant.status = tempTaskStatus[k].status;
            break;
          }
        }
      }
      task.viewModel = generatePartModel(task.status);
    }
  };

  $scope.newTask = function(){
    var taskName = prompt("Name for new task");
    if(taskName && taskName.trim() != "")
      console.log("Creating Task with name: "+taskName);
      createTask(taskName);
  };

  $scope.diselectTask = function(){
    $scope.selectedTask = null;
    $scope.selectedTaskIndex = -1;
  }

  $scope.selectStudent = function(id){
    var allParticipants = $scope.selectedTask.status;
    for(var i=0; i<allParticipants.length; i++){
      var participant = allParticipants[i];
      if(participant.id == id){
        participant.status = !participant.status;
      }
    }
    $scope.selectedTask.viewModel = generatePartModel(allParticipants);
    EventViewFactory.saveTask($scope.eventtasks);
  };

  $scope.chooseParticipant = function(id){
    // $scope.tempParticipants = angular.fromJson(angular.toJson($scope.eventParticipants));

    for(var i=0; i<$scope.tempParticipants.length; i++){
      var participant = $scope.tempParticipants[i];
      if(participant.id == id){
        participant.selected = !participant.selected;
      }
    }

    // EventViewFactory.saveEventParticipants(allParticipants);
  };

  $scope.diselectParticipant = function(id){
    for(var i=0; i<$scope.tempParticipants.length; i++){
      var participant = $scope.tempParticipants[i];
      if(participant.id == id){
        participant.selected = false;
      }
    }
    // EventViewFactory.saveEventParticipants(allParticipants);
  };

  $scope.selectDeletingTaskIndex = function(index){
    $scope.deletingTaskIndex = index;
  }

  $scope.toggleStuInfoDisplay = function(rowIndex){
    $scope.selectedRow = $scope.selectedRow == rowIndex? -1 : rowIndex;
  }

  $scope.toggleTaskStudentEditMode = function(){
    $scope.isTaskStudentEditMode = !$scope.isTaskStudentEditMode;
    if($("#edit-btn").text() == "Finish"){
      console.log("Comfirming");
      $("#edit-btn").html("<span class='ion-edit'></span>");
      var currCCA = StatusTracker.getCurrCCA();
      var currEventDetails = StatusTracker.getCurrEvent().event_details;
      console.log("Info: "+angular.toJson($scope.selectedTask));
      $http.put(ServerInfo.serverUrl()+"/"+AccountManager.getUserId()+"/taskStatus",{
        CCAName:currCCA.title,
        eventName:currEventDetails.title,
        task:$scope.selectedTask
      })

      .success(function(data){
        console.log("Event Status Updated!!!!!! "+angular.toJson(data));
      })

      .error(function(err){
        console.log("Error: "+angular.toJson(err));
      });

    }else{
      console.log("Editting");
      $("#edit-btn").text("Finish");
    }
  }

  $scope.toggleEventDetailEditMode = function(){
    $scope.isEditMode = !$scope.isEditMode;
    if($("#edit-btn").text() == "Finish"){
      $("#edit-btn").text("Edit");
      var currCCA = StatusTracker.getCurrCCA();
      var currEventDetails = StatusTracker.getCurrEvent().event_details;

      $scope.confirm();

      console.log("Event Details Update: "+angular.toJson($scope.eventInfo));
      console.log("Url: "+ServerInfo.serverUrl()+"/"+AccountManager.getUserId()+"/cca/"+currCCA.id+"/events");
      $http.put(ServerInfo.serverUrl()+"/"+AccountManager.getUserId()+"/cca/"+currCCA.id+"/events",$scope.eventInfo)

      .success(function(data){
        EventViewFactory.saveEventInfo($scope.eventInfo);
      })

      .error(function(err){
        console.log("Error: Update Event Info");
      });

      console.log("Putting: "+currCCA.title+" "+currEventDetails.title+" \n "+angular.toJson($scope.tempParticipants));

      $http.put(ServerInfo.serverUrl()+"/"+AccountManager.getUserId()+"/participants",{
        CCAName:currCCA.title,
        eventName:currEventDetails.title,
        students:$scope.tempParticipants
      })

      .success(function(data){
        console.log("Participants Updated: "+angular.toJson(data));
      })

      .error(function(err){
        console.log("Error: Update Participants");
      })

    } else{
      $("#edit-btn").text("Finish");
    }
    $scope.scrollTop();
  }

  $scope.toggleTaskEditMode = function(){
    console.log("toggle ")
    $scope.isTaskEditMode = !$scope.isTaskEditMode;
      if($("#task-edit-btn").text() == "Finish"){
      $("#task-edit-btn").text("Edit");
      $scope.deletingTaskIndex = -1;
    } else
      $("#task-edit-btn").text("Finish");
  }

  $scope.toggleAddParticpantMode = function(){
    $scope.isAddPartMode = !$scope.isAddPartMode;
    // if($("#addParticipantBtn").text() == "Finish")
    //   $("addParticipantBtn").text("");
    // else 
    //   $("#addParticipantBtn").text("Finish");
  }


  $scope.cancel = function(){
    $scope.partEditModal.hide();
  };

  $scope.confirm = function(){

    while($scope.eventParticipants.length > 0){
      $scope.eventParticipants.pop();
    }

    for(var i=0; i<$scope.tempParticipants.length;i++){
      var student = $scope.tempParticipants[i];
      if(student.selected){
        $scope.eventParticipants.push(student);
      }
    }

    console.log("Data: "+angular.toJson($scope.tempParticipants));

    $scope.partViewModel = generatePartModel($scope.eventParticipants);

    EventViewFactory.saveEventParticipants($scope.eventParticipants);

    console.log("Event Participants: "+angular.toJson($scope.eventParticipants));

    updateTaskParticipants();
    $scope.partEditModal.hide();
  };

  $scope.eventDetailsView = function(){
    $scope.eventParticipants = EventViewFactory.getEventParticipants();
    $scope.partViewModel = generatePartModel($scope.eventParticipants);
    $scope.tempParticipants = EventViewFactory.getCCAMembersForEvent();
    $scope.participantsEditModel = generatePartModel($scope.tempParticipants);
    console.log("isEditMode "+$scope.isEditMode);
  };

  $scope.showPartModel = function(){
    $scope.partEditModal.show();
  };

  var generatePartModel = function(array){
    var sorted = array.sort(function(a,b){
      return a.name.localeCompare(b.name);
    });

    var firstLetter = "A";
    var result = {};
    for(var i=0; i<sorted.length; i++){
      var item = sorted[i].name;
      var initial = item.toUpperCase().charAt(0);
      if( initial != firstLetter){
        firstLetter = initial;
      }
      if(result[firstLetter] == undefined){
        result[firstLetter] = [];
      }
      result[firstLetter].push(sorted[i]);
    }

    return result;
  };

  titleText = "eve";
  destructiveText = "Delete";

  $scope.onTaskRowHold = function (task) {

    // An elaborate, custom popup
   var confirmPopup = $ionicPopup.confirm({
     title: 'Delete Task',
     template: 'Are you sure you want to delete the task?'
   });
   confirmPopup.then(function(res) {
     if(res) {
        $scope.deleteTask(task.name);
     } else {
     }
   });

  };
})

.controller("studentDetailsViewCtrl",function($scope, $stateParams, StudentInfoFactory){
  $scope.student = StudentInfoFactory.getStudent($stateParams.studentId);
})

.controller("eventlistCtrl",function($scope, $stateParams, AccountManager){
  AccountManager.saveUserId($stateParams.googleId);
})

.controller("welcomeCtrl",function($scope, $window){
  $scope.login = function(){
    $window.location.href='http://54.169.89.65:3000';
  };
})