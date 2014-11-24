'use strict';

var app = angular.module('stranslation', ['ngRoute']);

app.config(['$routeProvider', '$locationProvider',
  function($routeProvider, $locationProvider) {
    $routeProvider.
    when('/generate', {
      templateUrl: 'partials/generate',
      controller: 'generateCtrl'
    }).
    when('/csv', {
      templateUrl: 'partials/csv',
      controller: 'csvCtrl'
    }).
    when('/json', {
      templateUrl: 'partials/json',
      controller: 'jsonCtrl'
    }).
    when('/about', {
      templateUrl: 'partials/about'
    }).
    otherwise({
      redirectTo: '/'
    });

    $locationProvider.html5Mode(true);
  }
]);
