import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { TranslateModule } from '@ngx-translate/core'

import { CarouselModule } from 'primeng/carousel'
import { ButtonModule } from 'primeng/button'
import { ConfirmDialogModule } from 'primeng/confirmdialog'
import { ConfirmPopupModule } from 'primeng/confirmpopup'
import { DataViewModule } from 'primeng/dataview'
import { DialogModule } from 'primeng/dialog'
import { DynamicDialogModule } from 'primeng/dynamicdialog'
import { DockModule } from 'primeng/dock'
import { SelectModule } from 'primeng/select'
import { FieldsetModule } from 'primeng/fieldset'
import { FileUploadModule } from 'primeng/fileupload'
import { FloatLabelModule } from 'primeng/floatlabel'
import { InputTextModule } from 'primeng/inputtext'
import { MessageModule } from 'primeng/message'
import { ToastModule } from 'primeng/toast'
import { TooltipModule } from 'primeng/tooltip'

import { AngularRemoteComponentsModule } from '@onecx/angular-remote-components'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'

import { LabelResolver } from './label.resolver'

@NgModule({
  declarations: [],
  imports: [
    AngularAcceleratorModule,
    AngularRemoteComponentsModule,
    ButtonModule,
    CarouselModule,
    CommonModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    DataViewModule,
    DialogModule,
    DockModule,
    SelectModule,
    DynamicDialogModule,
    FieldsetModule,
    FileUploadModule,
    FloatLabelModule,
    FormsModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    ToastModule,
    TooltipModule,
    TranslateModule
  ],
  exports: [
    AngularRemoteComponentsModule,
    ButtonModule,
    CarouselModule,
    CommonModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    DataViewModule,
    DialogModule,
    SelectModule,
    DockModule,
    DynamicDialogModule,
    FieldsetModule,
    FileUploadModule,
    FloatLabelModule,
    FormsModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    ToastModule,
    TooltipModule,
    TranslateModule
  ],
  providers: [LabelResolver]
})
export class SharedModule {}
