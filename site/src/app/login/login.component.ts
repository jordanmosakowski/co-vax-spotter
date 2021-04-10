import { Component, OnInit } from '@angular/core';
import firebase from 'firebase';
import 'firebase/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  email: string;
  sent = false;

  constructor() { }

  ngOnInit(): void {
  }

  logIn(){
    var actionCodeSettings = {
      url: window.location.origin+"/",
      // This must be true.
      handleCodeInApp: true,
      // iOS: {
      //   bundleId: 'com.example.ios'
      // },
      // android: {
      //   packageName: 'com.example.android',
      //   installApp: true,
      //   minimumVersion: '12'
      // },
      // dynamicLinkDomain: 'example.page.link'
    };
    firebase.auth().sendSignInLinkToEmail(this.email, actionCodeSettings)
      .then(() => {
        // The link was successfully sent. Inform the user.
        // Save the email locally so you don't need to ask the user for it again
        // if they open the link on the same device.
        window.localStorage.setItem('emailForSignIn', this.email);
        this.sent = true;
        // ...
      })
      .catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;
        // ...
      });
  }

}
