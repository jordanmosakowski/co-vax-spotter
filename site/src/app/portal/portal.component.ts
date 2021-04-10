import { Component, OnInit } from '@angular/core';

import firebase from 'firebase';
import 'firebase/firestore';
import 'firebase/auth';
import User = firebase.User;

@Component({
  selector: 'app-portal',
  templateUrl: './portal.component.html',
  styleUrls: ['./portal.component.scss']
})
export class PortalComponent implements OnInit {

  user: User;
  providers = {};
  firestoreData = {};
  search = "";
  needsSave = false;
  showRecommended = true;

  constructor() {
    this.user = firebase.auth().currentUser;
    this.getLocations();
    this.getFirestoreData();
  }

  zipCodes = ["80027","80303","80026","80020","80021","80305","80310"]

  getFiltered(list:VaxLocation[]){
    if(this.showRecommended){
      list = list.filter((l) => {
        return (l.providerShort == "centura" && l.city == "Commerce City") || l.providerShort == "thorntonfd"|| this.zipCodes.indexOf(l.zip) >-1
      });
    }
    list.sort((a, b) =>{
      return a.city.localeCompare(b.city);
    });
    if(this.search==""){
      return list;
    }
    return list.filter((l) => {
      return l.address?.toLowerCase()?.indexOf(this.search.toLowerCase())>-1 || l.city?.toLowerCase()?.indexOf(this.search.toLowerCase())>-1
        || l.provider?.toLowerCase()?.indexOf(this.search.toLowerCase())>-1 || l.name?.toLowerCase()?.indexOf(this.search.toLowerCase())>-1
        || l.zip?.toLowerCase()?.indexOf(this.search.toLowerCase())>-1;
    })
  }

  getStoreTitle(loc: VaxLocation){
    if(loc.providerShort == "centura"){
      return loc.name/*+ " ("+loc.id+")"*/;
    }
    if(loc.providerShort == "thorntonfd"){
      return loc.name/*+ " ("+loc.id+")"*/;
    }
    if(loc.providerShort == "cvs"){
      return loc.city/*+ " ("+loc.id+")"*/;
    }
    return loc.address+", "+loc.city+", "+loc.zip/*+" ("+loc.id+")"*/;
  }

  async save(){
    await firebase.firestore().collection("settings").doc(this.user.uid).set(this.firestoreData);
    console.log(this.firestoreData);
    this.needsSave = false;
  }
  async removeAll(){
    if(confirm("Are you sure you want to remove all notifications? This can not be undone")){
      await firebase.firestore().collection("settings").doc(this.user.uid).set({});
      this.firestoreData = {};
      this.needsSave = false;
      alert("Thank you for using CO Vax Spotter!")
    }

  }

  ngOnInit(): void {
  }

  signOut(){
    firebase.auth().signOut();
  }

  providerList(){
    return Object.keys(this.providers).sort();
  }

  async getFirestoreData(){
    let doc = await firebase.firestore().collection("settings").doc(this.user.uid).get();
    if(doc.exists){
     this.firestoreData = doc.data();
    }
  }

  async getLocations(){
    let res = await fetch('https://www.vaccinespotter.org/api/v0/states/CO.json', {
      method: 'get',
    });
    let json = await res.json();
    console.log(json);
    let filtered = [...json.features];
    if(filtered.length==0){
      return;
    }
    for(let store of filtered) {
      let data: VaxLocation = {
        city: store.properties.city,
        address: store.properties.address,
        id: store.properties.provider.toString()+store.properties.id.toString(),
        zip: store.properties.postal_code,
        providerShort: store.properties.provider,
        provider: store.properties.provider_brand_name,
        name: store.properties.name,
        url: store.properties.url,
        appointments: [],
        available: false,
      };
      data.appointments = store.properties.appointments ?? [];
      data.available = store.properties.appointments_available ?? false;
      if (data.available) {
        data.lastAvailable = (new Date()).toISOString();
      }
      if(this.providers[data['provider']]==null) {
        this.providers[data['provider']] = [];
      }
      this.providers[data['provider']].push(data);
    }
    this.providers["Thornton"] = [{
      city: "Thornton",
      address: "11151 Colorado Boulevard",
      id: "thorntonfd",
      zip: "80233",
      provider: "Thornton Fire Department",
      providerShort: "thorntonfd",
      name: "Thornton Fire Department",
      // url: urls[i],
      appointments: [],
      available: true,
    }]
    console.log(this.providers);
  }
}

interface VaxLocation{
  id: string
  address: string,
  name: string,
  provider: string,
  url: string,
  available: boolean,
  providerShort: string,
  appointments: Appointment[],
  zip: string,
  city: string
  lastAvailable?: string,
}


interface Appointment{
  time: string,
  type: string,
  types: string[],
}
