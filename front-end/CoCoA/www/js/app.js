angular.module('cocoa', ['ionic', 'cocoa.controllers'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

    .state('app', {
      url: "/app",
      abstract: true,
      templateUrl: "templates/userGroupMenu.html",
      controller: 'usergroupCtrl'
    })

    .state('app.events',{
      url:"/eventlist",
      views:{
        content:{
          templateUrl:"templates/eventlist.html"
        }
      }
    })

    .state('event',{
      url:"/event",
      abstract:true,
      templateUrl:"templates/userGroupMenu.html"
    })

    .state('event.eventview',{
      url:"/:eventId",
      views:{
        content:{
          templateUrl:"templates/eventview.html",
          controller:'eventViewCtrl'
        }
      }
    })
  
  $urlRouterProvider.otherwise('/app/eventlist');
});

