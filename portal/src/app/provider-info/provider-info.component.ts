import {Component, Input, OnInit} from '@angular/core';
import {VaxLocation} from "../interfaces";

@Component({
  selector: 'app-provider-info',
  templateUrl: './provider-info.component.html',
  styleUrls: ['./provider-info.component.scss']
})
export class ProviderInfoComponent implements OnInit {

  @Input() name: string
  @Input() locations: VaxLocation[];
  @Input() filterAvailable: boolean;
  @Input() callback: () => void;
  expanded: boolean;

  constructor() {
  }

  ngOnInit(): void {
    this.expanded = this.count()>0;
    this.locations.sort((a, b) =>{
      if(a.available==b.available){
        return a.city.localeCompare(b.city);
      }
      if(a.available){
        return -1;
      }
      return 1;
    })
  }

  count(): number{
    return this.locations.filter(l => l.available).length;
  }

  getLocations(){
    if(this.filterAvailable){
      return this.locations.filter(l => l.available);
    }
    return this.locations;
  }

}
