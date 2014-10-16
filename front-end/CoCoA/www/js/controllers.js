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

    save: function(projects){
      window.localStorage['usergroups'] = angular.toJson(projects);
    },

    newCCA: function(name){
      return {
        title:name,
        events:[]
      };
    },

    newEvent: function(name){
      return {
        title:name
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
    }
  };
})

.controller('usergroupCtrl',function($scope,$timeout, $ionicSideMenuDelegate, Usergroups){
  $scope.usergroups = Usergroups.all();
  $scope.activeGroup = $scope.usergroups[Usergroups.getLastActiveIndex()];
  $scope.eventlist = Usergroups.getEventList();

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
  }

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