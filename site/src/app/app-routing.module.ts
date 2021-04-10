import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {PortalComponent} from './portal/portal.component';
import {LoginComponent} from './login/login.component';

const routes: Routes = [
  {path:"portal",component: PortalComponent},
  {path: "**", component: LoginComponent,}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
