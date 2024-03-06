import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core'
import { FormBuilder, FormControl, FormGroup, Validators, ValidationErrors, ValidatorFn } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'
import { finalize, Observable, map, of } from 'rxjs'
import { SelectItem } from 'primeng/api'

import { Action, PortalMessageService, UserService } from '@onecx/portal-integration-angular'

@Component({
  selector: 'app-welcome-detail',
  templateUrl: './welcome-detail.component.html',
  styleUrls: ['./welcome-detail.component.scss']
})
export class WelcomeDetailComponent implements OnInit, OnChanges {

  constructor(
  ) {
  }

  ngOnInit() {
    console.log("init")
  }
}
