angular.module('cocoa.controllers', [])

.factory('Usergroups',function(){
  var allStudents = [{
          id:"aaa",
          name:"Wang Kunzhen",
          status:false,
          isSelected:true,
          contactNumber:"8888",
          address:"NUS"
        },
        {
          id:"bbb",
          name:"Wang Yichao",
          status:true,
          isSelected:true,
          contactNumber:"8888",
          address:"NUS"

        },
        {
          id:"ccc",
          name:"Wu Lifu",
          status:true,
          isSelected:true,
          contactNumber:"8888",
          address:"NUS",
        },
        {
          id:"ddd",
          name:"Li Zhenshuo",
          status:false,
          isSelected:true,
          contactNumber:"8888",
          address:"NUS",
          explain:"MC"
        }];

  var allCCA

  var allEvent = [{

  }]

  window.localStorage['allStudents'] = angular.toJson(allStudents);
  
  return {
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
      return {
        title: selectedEvent.title,
        startDate: selectedEvent.startDate,
        endDate: selectedEvent.endDate,
        time: selectedEvent.time,
        venue: selectedEvent.venue,
        busTime: selectedEvent.busTime,
        comment: selectedEvent.comment,
        TO: selectedEvent.TO
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
        status:[]
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

.controller('usergroupCtrl',function($scope, $timeout, $ionicSideMenuDelegate, $ionicModal, Usergroups){
  $scope.usergroups = Usergroups.all();
  $scope.activeGroup = $scope.usergroups[Usergroups.getLastActiveIndex()];
  $scope.eventlist = Usergroups.getEventList();
  $scope.filterText = "";

  var createNewCCA = function(name){
    var newCCA = Usergroups.newCCA(name);
    $scope.usergroups.push(newCCA);
    Usergroups.save($scope.usergroups);
    $scope.selectCCA(newCCA, $scope.usergroups.length - 1);
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
    $scope.eventlist = Usergroups.getEventList();
    $ionicSideMenuDelegate.toggleLeft(false);
  };

  var createNewEvent = function(name){
    var newEvent = Usergroups.newEvent(name);
    $scope.eventlist.push(newEvent);
    Usergroups.saveEventList($scope.eventlist);
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

  $timeout(function() {
    if($scope.usergroups.length == 0) {
      while(true) {
        var ccaName = prompt('Your first CCA name:');
        if(ccaName && ccaName.trim() != "") {
          createNewCCA(ccaName);
          break;
        }
      }
    }
  });
})

.controller('eventTaskMenuCtrl',function($scope, $stateParams, $ionicSideMenuDelegate, $ionicModal, $ionicGesture, $ionicActionSheet, EventViewFactory){
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
    for(var i=0; i<$scope.tempParticipants.length; i++){
      $scope.tempParticipants[i].isSelected = $scope.eventParticipants[i].isSelected;
    }
  });

  var createTask = function(name){
    var task = EventViewFactory.newTask(name);
    task.status = EventViewFactory.getEventParticipants();
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
    }
  };

  $scope.newTask = function(){
    console.log("new task");
    var taskName = prompt("Name for new task");
    if(taskName && taskName.trim() != "")
      createTask(taskName);
  };

  $scope.selectTask = function(task, index){
    $scope.selectedTask = task;
    $scope.selectedTaskIndex = index;
  };

  $scope.diselectTask = function(){
    $scope.selectedTask = null;
    $scope.selectedTaskIndex = -1;
  }

  $scope.selectStudent = function(id){
    if(!$scope.isEditMode)
      return;

    var allParticipants = $scope.selectedTask.status;
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
    } else
      $("#edit-btn").text("Finish");
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
    EventViewFactory.saveEventParticipants($scope.eventParticipants);
    updateTaskParticipants();
    $scope.partEditModal.hide();
  };

  $scope.eventDetailsView = function(){
    $scope.eventParticipants = EventViewFactory.getEventParticipants();
    $scope.tempParticipants = angular.fromJson(angular.toJson($scope.eventParticipants));
    $scope.participantsEditModel = generatePartEditModel($scope.tempParticipants);
  };

  $scope.showPartModel = function(){
    $scope.partEditModal.show();
  };

  var generatePartEditModel = function(array){
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


    $ionicActionSheet.show({
      titleText: task.name,
      buttons: [
        { text: 'Share <i class="icon ion-share"></i>' },
        { text: 'Move <i class="icon ion-arrow-move"></i>' },
      ],
      destructiveText: 'Delete',
      cancelText: 'Cancel',
      cancel: function() {
        console.log('CANCELLED');
      },
      buttonClicked: function(index) {
        console.log('BUTTON CLICKED', index);
        return true;
      },
      destructiveButtonClicked: function() {
        console.log('DESTRUCT');
        return true;
      }
    }); 


  };

})

.controller("studentDetailsViewCtrl",function($scope, $stateParams, StudentInfoFactory){
  $scope.student = StudentInfoFactory.getStudent($stateParams.studentId);
})
