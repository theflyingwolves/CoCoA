angular.module('cocoa.controllers', [])

.factory('Usergroups',function(){
  var allStudents = [{
          id:"aaa",
          name:"Wang Kunzhen",
          status:false,
          isSelected:true
        },
        {
          id:"bbb",
          name:"Wang Yichao",
          status:false,
          isSelected:true
        },
        {
          id:"ccc",
          name:"Wu Lifu",
          status:false,
          isSelected:true
        },
        {
          id:"ddd",
          name:"Li Zhenshuo",
          status:false,
          isSelected:true
        }];

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

    getEventParticipants:function(){
      // return selectedEvent.participants;
      if(selectedEvent.participants.length > 0){
        return selectedEvent.participants;
      }else{
        return angular.fromJson(window.localStorage['allStudents']);
      }
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
    if(ccaName){
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
    if(eventName){
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
        if(ccaName) {
          createNewCCA(ccaName);
          break;
        }
      }
    }
  });
})

.controller('eventTaskMenuCtrl',function($scope, $stateParams, $ionicSideMenuDelegate, $ionicModal, EventViewFactory){
  $scope.eventtasks = $scope.eventtasks || EventViewFactory.allTasks(EventViewFactory.getEventId());

  $scope.selectedTask = $scope.eventtasks[0];

  $ionicModal.fromTemplateUrl('templates/eventDetailsView.html',{
    scope:$scope,
    animation:'slide-in-up'
  }).then(function(modal){
    $scope.eventDetailsModal = modal;
  });

  var createTask = function(name){
    var task = EventViewFactory.newTask(name);
    task.status = EventViewFactory.getEventParticipants();
    $scope.eventtasks.push(task);
    EventViewFactory.saveTask($scope.eventtasks);
    $scope.selectTask(task);
    $ionicSideMenuDelegate.toggleLeft(false);
  };

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
    var name = prompt("Name for new task");
    createTask(name);
  };

  $scope.selectTask = function(task){
    $scope.selectedTask = task;
  };

  $scope.selectStudent = function(id){
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
  
  $scope.toggleEditMode = function(){
    $scope.isEditMode = $scope.isEditMode? false : true;
    if($("#edit-btn").text() == "Finish")
      $("#edit-btn").html("<span class='ion-compose'></span>");
    else
      $("#edit-btn").text("Finish");
  }
  $scope.cancel = function(){
    $scope.eventDetailsModal.hide();
  };

  $scope.confirm = function(){
    $scope.eventParticipants = $scope.tempParticipants;
    EventViewFactory.saveEventParticipants($scope.eventParticipants);
    updateTaskParticipants();
    $scope.eventDetailsModal.hide();
  };

  $scope.eventDetailsView = function(){
    $scope.eventParticipants = EventViewFactory.getEventParticipants();
    $scope.tempParticipants = angular.fromJson(angular.toJson($scope.eventParticipants));
    $scope.eventDetailsModal.show();
  };
})

.controller("studentDetailsViewCtrl",function($scope, $stateParams, StudentInfoFactory){
  $scope.student = StudentInfoFactory.getStudent($stateParams.studentId);
})

