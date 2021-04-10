import { Component } from '@angular/core';
import firebase from 'firebase';
import 'firebase/firestore';
import 'firebase/auth';
import User = firebase.User;


const firebaseConfig = {
  apiKey: "AIzaSyB3gMf8V4w8RwGG-BEoBMpmqB049v3euxE",
  authDomain: "covaxspotter.firebaseapp.com",
  projectId: "covaxspotter",
  storageBucket: "covaxspotter.appspot.com",
  messagingSenderId: "1005239184863",
  appId: "1:1005239184863:web:838c84e9dde2e68eaa286a",
  measurementId: "G-7GSV5EBKVV"
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'site';
  signedIn = false;
  user: User;
  constructor(){
    if(!firebase.apps.length){
      firebase.initializeApp(firebaseConfig);
    }
    firebase.auth().onAuthStateChanged((user) => {
      this.signedIn = user != null;
      console.log(this.signedIn);
      if(this.signedIn){
        this.user = user;
        console.log(this.user);
      }
    });
    if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
      var email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      firebase.auth().signInWithEmailLink(email, window.location.href)
        .then((result) => {
          history.replaceState(null, "", location.href.split("?")[0]);
          window.localStorage.removeItem('emailForSignIn');
        })
        .catch((error) => {});
    }
  }
}
