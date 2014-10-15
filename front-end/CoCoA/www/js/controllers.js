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
  var createNewCCA = function(name){
    var newCCA = Usergroups.newCCA(name);
    $scope.usergroups.push(newCCA);
    Usergroups.save($scope.usergroups);
    $scope.selectCCA(newCCA, $scope.usergroups.length - 1);
  };

  $scope.newUserGroup = function(){
    var ccaName = promp("Name for new CCA");
    if(ccaName){
      createNewCCA(ccaName);
    }
  };

  $scope.selectCCA = function(cca, index){
    $scope.activeGroup = cca;
    Usergroups.setLastActiveIndex(index);
    $ionicSideMenuDelegate.toggleLeft(false);
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

.controller('eventlistCtrl',function($scope){
  $scope.eventlist = [
  {
    id:'event1',
    title:'Event 1'
  },

  {
    id:'event2',
    title:'Event 2'
  },

  {
    id:'event3',
    title:'Event 3'
  },

  {
    id:'event4',
    title:'Event 4'
  }];
})