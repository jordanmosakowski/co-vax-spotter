import { Component } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Settings} from "./interfaces";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'portal';
  host = window.location.origin;
  updated: Date;
  settings: Settings;
  needsSave = false;

  filterAvailable: boolean;

  providers: any;
  constructor(private http: HttpClient){
    this.providers = {};
    this.settings = {
      enabled: false,
      checkLarge: false
    };
    this.getLiveData();
    this.getSettings();
    this.filterAvailable = true;
  }

  enableSave = (args: any): void => {
    this.needsSave = true;
  }

  async getLiveData(){
    let json = await this.http.get(this.host+"/live.json").toPromise();
    this.updated = new Date(json['updated']);
    for(let data of json['data']){
      if(this.providers[data['provider']]==null) {
        this.providers[data['provider']] = [];
      }
      this.providers[data['provider']].push(data);
    }
    console.log(this.providers);
  }
  async getSettings(){
    this.settings = await this.http.get<Settings>(this.host+"/settings").toPromise();
  }

  async apiCall(route){
    await fetch(this.host+"/"+route);
    await this.getSettings();
  }

  keys(){
    return Object.keys(this.providers);
  }
}
