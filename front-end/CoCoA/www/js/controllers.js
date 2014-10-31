angular.module('cocoa.controllers', [])

.factory('ServerInfo',function(){
  return {
    serverUrl:function(){
      return "http://ec2-54-169-89-65.ap-southeast-1.compute.amazonaws.com:3000";
    }
  };
})

.factory('AccountManagement',function(){
  return {
    saveUserId:function(id){
      window.localStorage['userid'] = id;
    },
    getUserId: function(){
      return window.localStorage['userid'];
    }
  }
})

.factory('Usergroups',function(){
  var allStudents = [{
          id:"aaa",
          name:"Wang Kunzhen",
          status:false,
          isSelected:true,
          contactNumber:"99998888",
          class:"s1-A1"
        },
        {
          id:"bbb",
          name:"Wang Yichao",
          status:true,
          isSelected:true,
          contactNumber:"99998888",
          class:"s1-E2"

        },
        {
          id:"ccc",
          name:"Wu Lifu",
          status:true,
          isSelected:true,
          contactNumber:"77778888",
          class:"s2-A2",
        },
        {
          id:"ddd",
          name:"Li Zhenshuo",
          status:false,
          isSelected:true,
          contactNumber:"88887777",
          class:"s2-C2",
          MC:"ASTHMA"
        }];

  var allSchoolStudents = [{
    id:"aaa",
    name:"Wang Kunzhen",
    isMember:false
  },
  {
    id:"bbb",
    name:"Wang Yichao",
    isMember:false
  },
  {
    id:"ccc",
    name:"Wu Lifu",
    isMember:false
  },
  {
    id:"ddd",
    name:"Li Zhenshuo",
    isMember:false
  },
  {
    id:"eee",
    name:"Wei Wenbo",
    isMember:false
  },
  {
    id:"fff",
    name:"Chen Hao",
    isMember:false
  },
  {
    id:"ggg",
    name:"Wen Yiran",
    isMember:false
  }];

  var allCCA

  var allEvent = [{

  }]

  window.localStorage['allStudents'] = angular.toJson(allStudents);
  window.localStorage['allSchoolStudents'] = angular.toJson(allSchoolStudents);
  
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

    newEvent: function(name){
      var id = this.generateRandomId();
      return {
        title:name,
        tasks:[],
        participants:[],
        id:id
      }
    },

    getEventList: function(){
      var allgroups = angular.fromJson(window.localStorage['usergroups']);
      if(allgroups){
        var activeIndex = parseInt(window.localStorage['lastActiveProject']) || 0;
        var activeGroup = allgroups[activeIndex];
        return activeGroup.events;
      }else{
        return [];
      }
    },

    saveEventList: function(events){
        var allgroups = angular.fromJson(window.localStorage['usergroups']);
        var activeIndex = parseInt(window.localStorage['lastActiveProject']) || 0;
        var activeGroup = allgroups[activeIndex];
        activeGroup.events = events;
        window.localStorage['usergroups'] = angular.toJson(allgroups);
    },


    getLastActiveIndex: function(){
      return parseInt(window.localStorage['lastActiveProject']) || 0;
    },

    setLastActiveIndex: function(index) {
      window.localStorage['lastActiveProject'] = index;
    },

    enterEvent: function(id){
      window.localStorage['eventId'] = id;
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
  var selectedEvent = undefined;

  var getEventFromId = function(id){
    var allgroups = window.localStorage['usergroups'];
    if(allgroups){
      var groups = angular.fromJson(allgroups);
      var selectedEvent = undefined;
      for(var i=0; i<groups.length; i++){
        var CCA = groups[i];
        var events = CCA.events;
        for(var j=0; j<events.length; j++){
          var event = events[j];
          if(event.id == id){
            selectedEvent = event;
          }
        }
      }

      return selectedEvent;
    }else{
      return undefined;
    }
  };

  return {
    allTasks:function(eventId){
      selectedEvent = getEventFromId(eventId);
      if(selectedEvent){
        return selectedEvent.tasks;
      }else{
        return [];
      }
    },

    getEventId:function(){
      return window.localStorage['eventId'];
    },


    getEventInfo:function(eventId){
      selectedEvent = getEventFromId(eventId);

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
        comments: selectedEvent.comment,
        TOIC:selectedEvent.TOIC,
        studentsNeeded:selectedEvent.studentsNeeded,
        reportTime:selectedEvent.reportTime,
        reportVenue:selectedEvent.reportVenue,
        id:selectedEvent.id
      }
    },

    getEventParticipants:function(){
      // return selectedEvent.participants;
      if(selectedEvent.participants.length > 0){
        return selectedEvent.participants;
      }else{
        return angular.fromJson(window.localStorage['allStudents']);
      }
    },

    saveEventInfo:function(eventInfo){

      var groups = angular.fromJson(window.localStorage['usergroups']);
      for(var i=0; i<groups.length; i++){
        var events = groups[i].events;
        for(var j=0; j<events.length; j++){
          var event = events[j];
          if(event.id == selectedEvent.id){
            event.startDate = eventInfo.startDate;
            event.endDate = eventInfo.endDate;
            event.time = eventInfo.time;
            event.venue = eventInfo.venue;
            event.studentsNeeded = eventInfo.studentsNeeded;
            event.reportTime = eventInfo.reportTime;
            event.reportVenue = eventInfo.reportVenue;
            event.TOIC = eventInfo.TOIC;
            event.comments = eventInfo.comments;
            break;
          }
        }
      }

      window.localStorage['usergroups'] = angular.toJson(groups);
    },

    saveEventParticipants:function(participants){
      selectedEvent.participants = participants;

      var groups = angular.fromJson(window.localStorage['usergroups']);
      for(var i=0; i<groups.length; i++){
        var events = groups[i].events;
        for(var j=0; j<events.length; j++){
          var event = events[j];
          if(event.id == selectedEvent.id){
            event.participants = participants;
            break;
          }
        }
      }

      window.localStorage['usergroups'] = angular.toJson(groups);
    },

    newTask: function(name){
      return {
        name:name,
        status:[],
        viewModel:{}
      }
    },

    saveTask:function(tasks){
      selectedEvent.tasks = tasks;
      var groups = angular.fromJson(window.localStorage['usergroups']);
      for(var i=0; i<groups.length; i++){
        var CCA = groups[i];
        var events = CCA.events;
        for(var j=0; j<events.length; j++){
          var event = events[j];
          if(event.id == selectedEvent.id){
            event.tasks = selectedEvent.tasks;
          }
        }
      }
      window.localStorage['usergroups'] = angular.toJson(groups);
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

.controller('usergroupCtrl',function($scope,$http, $timeout, $ionicSideMenuDelegate, $ionicModal, ServerInfo, Usergroups){
  $scope.usergroups = Usergroups.all();
  $scope.activeGroup = $scope.usergroups[Usergroups.getLastActiveIndex()];
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
    $http.post(ServerInfo.serverUrl()+"/cca",{
      cca_title:name
    })

    .success(function(res){
      var newCCA = Usergroups.newCCA(name);
      $scope.usergroups.push(newCCA);
      Usergroups.save($scope.usergroups);
      $scope.selectCCA(newCCA, $scope.usergroups.length - 1);
    })

    .error(function(res){
      console.log(angular.toJson(res));
    });
  };

  $scope.loadDataFromServer = function(){
    console.log("loading");
    $http.get(ServerInfo.serverUrl()+"/cca")
    .success(function(data, status){
      console.log(angular.toJson(data));

      while($scope.usergroups.length > 0){
        $scope.usergroups.pop();
      }

      for(var i=0; i<data.length;i++){
        $scope.usergroups.push(data[i]);
      }

      $scope.selectCCA($scope.usergroups[0],0);
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
    console.log("Selecting CCA at index "+index);
    $scope.activeGroup = cca;
    Usergroups.setLastActiveIndex(index);
    $ionicSideMenuDelegate.toggleLeft(false);

    $http.get(ServerInfo.serverUrl()+"/cca/"+$scope.activeGroup.id+"/events")
    .success(function(data){
      console.log("Event list: "+angular.toJson(data));
      console.log("Stamp");
      while($scope.eventlist.length >0 ){
        $scope.eventlist.pop();
      }

      for(var i=0; i<data.list_of_events.length; i++){
        console.log("Pushing "+angular.toJson(data.list_of_events[i]));
        $scope.eventlist.push(data.list_of_events[i]);
      }
    });
  };

  var createNewEvent = function(name){
    console.log("Create Event: Posting to "+ServerInfo.serverUrl()+"/cca/"+$scope.activeGroup.id+"/events");
    $http.post(ServerInfo.serverUrl()+"/cca/"+$scope.activeGroup.id+"/events",{
      event_title:name
    })

    .success(function(res, status){
      console.log(angular.toJson(res));
      // var newEvent = Usergroups.newEvent(name);
      // $scope.eventlist.push(newEvent);
      // Usergroups.saveEventList($scope.eventlist);
    })
    .error(function(res){
      console.log("createNewEvent: "+angular.toJson(res));
    });
  };

  $scope.newEvent = function(){
    var eventName = prompt("Name for new event");
    if(eventName && eventName.trim() != ""){
      createNewEvent(eventName);
    }
  };

  $scope.enterEvent = function(id){
    Usergroups.enterEvent(id);
  };

  $scope.showMemberModal = function(title){
    // console.log("Retrieving All Stident Data: ");
    // $http.get(ServerInfo.serverUrl()+"/membersOfCCA/"+title.substring(0,title.length))
    // .success(function(data){
    //   console.log("All Student Data Received: "+angular.toJson(data));
    // })
    // .error(function(err){
    //   console.log("Error Retrieving Student Info in CCA Group Menu: "+angular.toJson(err));
    // });

    $scope.memberModal.show();
  };

  $scope.cancel = function(){
    $scope.memberModal.hide();
  };

  $scope.confirm = function(){
    // send back to server
  };

  $scope.selectMember = function(student){
    student.isMember = !student.isMember
  };

  $timeout(function() {
    console.log("Logging");
    $scope.loadDataFromServer();
    // if($scope.usergroups.length == 0) {
    //   while(true) {
    //     var ccaName = prompt('Your first CCA name:');
    //     if(ccaName && ccaName.trim() != "") {
    //       createNewCCA(ccaName);
    //       break;
    //     }
    //   }
    // }
  });
})

.controller('eventTaskMenuCtrl',function($scope, $stateParams, $ionicSideMenuDelegate, $ionicModal, $ionicGesture, $ionicPopup, $timeout, EventViewFactory){
  $scope.eventtasks = $scope.eventtasks || EventViewFactory.allTasks(EventViewFactory.getEventId());
  $scope.selectedTask = $scope.eventtasks[0];
  $scope.eventId = EventViewFactory.getEventId();
  $scope.eventInfo = EventViewFactory.getEventInfo($scope.eventId);
  $scope.selectedTaskIndex = -1;
  $scope.deletingTaskIndex = -1;

  $ionicModal.fromTemplateUrl('templates/eventEditParticipant.html',{
    scope:$scope,
    animation:'slide-in-up'
  }).then(function(modal){
    $scope.partEditModal = modal;
  });


  $scope.$on("modal.hidden",function(){
    console.log("hidden");
    for(var i=0; i<$scope.tempParticipants.length; i++){
      $scope.tempParticipants[i].isSelected = $scope.eventParticipants[i].isSelected;
    }
  });

  var createTask = function(name){
    var task = EventViewFactory.newTask(name);
    task.status = EventViewFactory.getEventParticipants();
    task.viewModel = generatePartModel(task.status);
    $scope.eventtasks.push(task);
    EventViewFactory.saveTask($scope.eventtasks);
    $scope.selectTask(task);
    $ionicSideMenuDelegate.toggleLeft(false);
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
      createTask(taskName);
  };

  $scope.selectTask = function(task, index){
    $scope.selectedTask = task;
    $scope.selectedTaskIndex = index;
    console.log($scope.selectedTask);
  };

  $scope.diselectTask = function(){
    $scope.selectedTask = null;
    $scope.selectedTaskIndex = -1;
  }

  $scope.selectStudent = function(id){
    if(!$scope.isEditMode)
      return;

    var allParticipants = $scope.selectedTask.status;
    $scope.selectedTask.viewModel = generatePartModel(allParticipants);
    for(var i=0; i<allParticipants.length; i++){
      var participant = allParticipants[i];
      if(participant.id == id){
        participant.status = !participant.status;
      }
    }
    EventViewFactory.saveTask($scope.eventtasks);
  };

  $scope.chooseParticipant = function(id){
    // $scope.tempParticipants = angular.fromJson(angular.toJson($scope.eventParticipants));

    for(var i=0; i<$scope.tempParticipants.length; i++){
      var participant = $scope.tempParticipants[i];
      if(participant.id == id){
        participant.isSelected = !participant.isSelected;
      }
    }

    // EventViewFactory.saveEventParticipants(allParticipants);
  };

  $scope.diselectParticipant = function(id){
    for(var i=0; i<$scope.tempParticipants.length; i++){
      var participant = $scope.tempParticipants[i];
      if(participant.id == id){
        participant.isSelected = false;
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

  $scope.toggleEditMode = function(){
    $scope.isEditMode = !$scope.isEditMode;
    if($("#edit-btn").text() == "Finish")
      $("#edit-btn").html("<span class='ion-edit'></span>");
    else
      $("#edit-btn").text("Finish");
  }

  $scope.toggleEventDetailEditMode = function(){
    $scope.isEditMode = !$scope.isEditMode;
    if($("#edit-btn").text() == "Finish"){
      $("#edit-btn").text("Edit");
      EventViewFactory.saveEventInfo($scope.eventInfo);
    } else{
      $("#edit-btn").text("Finish");
    }
  }

  $scope.toggleTaskEditMode = function(){
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
    $scope.eventParticipants = angular.fromJson(angular.toJson($scope.tempParticipants));
    $scope.partViewModel = generatePartModel($scope.eventParticipants);
    EventViewFactory.saveEventParticipants($scope.eventParticipants);
    updateTaskParticipants();
    $scope.partEditModal.hide();
  };

  $scope.eventDetailsView = function(){
    $scope.eventParticipants = EventViewFactory.getEventParticipants();
    $scope.partViewModel = generatePartModel($scope.eventParticipants);
    $scope.tempParticipants = angular.fromJson(angular.toJson($scope.eventParticipants));
    $scope.participantsEditModel = generatePartModel($scope.tempParticipants);
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

    console.log(angular.toJson(result));
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

.controller("welcomeCtrl",function($scope){
  $scope.loginDetails = {};
  $scope.isUsernameValid = true;
  $scope.login = function(){
    console.log("Logging in with username: "+$scope.loginDetails.username+" and password: "+$scope.loginDetails.password);
  };
})