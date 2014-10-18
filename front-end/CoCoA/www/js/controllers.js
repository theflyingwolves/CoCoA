angular.module('cocoa.controllers', [])

.factory('Usergroups',function(){
  return {
    all: function(){
      var allgroups = window.localStorage['usergroups'];
      if(allgroups){
        return angular.fromJson(allgroups);
      }else{
        return [];
      }
    },

    allStudents:function(){
      // var studentlist = window.localStorage['studentlist'];
      // return angular.fromJson(studentlist);

      return [
        {
          id:"aaa",
          name:"Wang Kunzhen",
          status:false
        },
        {
          id:"bbb",
          name:"Wang Yichao",
          status:false
        }];
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
      console.log("Creating event "+name+" with id: "+id);
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
      console.log("Event Id: "+eventId+" Event: "+angular.toJson(selectedEvent));
      if(selectedEvent){
        return selectedEvent.tasks;
      }else{
        return [];
      }
    },

    getEventId:function(){
      return window.localStorage['eventId'];
    },

    getEventParticipant:function(){
      // return selectedEvent.participants;
            return [
        {
          id:"aaa",
          name:"Wang Kunzhen",
          status:false
        },
        {
          id:"bbb",
          name:"Wang Yichao",
          status:false
        }];
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

  // $scope.studentlist = [
  // {
  //   id:"aaa",
  //   name:"Wang Kunzhen",
  //   status:true
  // },
  // {
  //   id:"bbb",
  //   name:"Wang Yichao",
  //   status:false
  // }];

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

.controller('eventTaskMenuCtrl',function($scope, $stateParams, $ionicModal, EventViewFactory){
  $scope.eventtasks = $scope.eventtasks || EventViewFactory.allTasks(EventViewFactory.getEventId());

  $scope.selectedTask = $scope.eventtasks[0];

  var createTask = function(name){
    var task = EventViewFactory.newTask(name);
    task.status = EventViewFactory.getEventParticipant();
    $scope.eventtasks.push(task);
    EventViewFactory.saveTask($scope.eventtasks);
    $scope.selectTask(task);
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
  }
})