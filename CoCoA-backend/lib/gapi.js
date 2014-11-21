var google = require('googleapis'),
    OAuth2 = google.auth.OAuth2,
    client = '807229978561-31oibemm0lihmqr3c1c3gckf536q83un.apps.googleusercontent.com',
    secret = 'tU7_JA7GBmyXKnZ9NbY2nvQg',
    redirect = 'http://ec2-54-169-89-65.ap-southeast-1.compute.amazonaws.com:3000/oauth2callback',
    oauth2Client =new OAuth2(client, secret, redirect);


var authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  //approval_prompt: 'force',
  scope: [  
            'https://www.googleapis.com/auth/plus.me',
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/drive.file'
        ]
});

var googlePlus = google.plus('v1');
var googleDrive = google.drive({ version: 'v2', auth: oauth2Client });

exports.authUrl = authUrl;
exports.oauth2Client = oauth2Client;
exports.googlePlus = googlePlus;
exports.googleDrive = googleDrive;

exports.ping = function() {
    console.log('pong');
};


