import { Component, OnInit, ViewChild, effect, inject, input, model, output, untracked } from '@angular/core'
import { AbstractControl, FormBuilder, FormControl, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms'
import { TranslateModule } from '@ngx-translate/core'
import { EMPTY, catchError, concatMap, filter, take, tap } from 'rxjs'

import { ButtonModule } from 'primeng/button'
import { DialogModule } from 'primeng/dialog'
import { FileUploadModule, FileUpload } from 'primeng/fileupload'
import { FloatLabelModule } from 'primeng/floatlabel'
import { InputTextModule } from 'primeng/inputtext'
import { TooltipModule } from 'primeng/tooltip'

import { AppStateService, PortalMessageService } from '@onecx/angular-integration-interface'
import { Workspace } from '@onecx/integration-interface'

import { ImageInfo, ImagesInternalAPIService } from 'src/app/shared/generated'

@Component({
  selector: 'app-image-create',
  standalone: true,
  imports: [
    ButtonModule,
    DialogModule,
    FileUploadModule,
    FloatLabelModule,
    InputTextModule,
    ReactiveFormsModule,
    TooltipModule,
    TranslateModule
  ],
  templateUrl: './image-create.component.html',
  styleUrl: './image-create.component.scss'
})
export class ImageCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder)
  private readonly msgService = inject(PortalMessageService)
  private readonly appstateService = inject(AppStateService)
  private readonly imageApiService = inject(ImagesInternalAPIService)

  public readonly displayCreateDialog = model<boolean>(false)
  public readonly imageInfoCount = input<number>(0)
  public readonly hideDialogAndChanged = output<boolean>()

  @ViewChild('fileUpload', { static: true }) fileUpload?: FileUpload

  private currentWorkspaceName: string | undefined = undefined
  public isLoading = false
  public selectedFile: Blob | undefined = undefined
  public uploadDisabled: boolean = false
  public formGroup = this.fb.nonNullable.group({
    url: new FormControl<string | null>(null, [
      Validators.minLength(7),
      Validators.maxLength(255),
      Validators.pattern('^(http|https)://.{6,245}'),
      this.imageSrcValidator() // check loaded image src, if file was selected
    ]),
    image: new FormControl(null)
  })

  constructor() {
    effect(() => {
      const isOpen = this.displayCreateDialog()
      if (!isOpen) {
        untracked(() => {
          this.formGroup.get('url')?.reset()
          this.uploadDisabled = false
          this.onFileRemoval()
        })
      }
    })
  }

  ngOnInit(): void {
    this.formGroup.get('url')?.valueChanges.subscribe((v) => {
      this.uploadDisabled = v !== null && v !== ''
    })
    this.formGroup.disable() // default disabled, will be enabled when preconditions are ready
    this.appstateService.currentWorkspace$
      .pipe(
        filter((ws): ws is Workspace => !!ws?.workspaceName),
        take(1)
      )
      .subscribe((ws) => {
        this.currentWorkspaceName = ws.workspaceName
        this.formGroup.enable()
      })
  }

  private imageSrcValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null =>
      control.value !== null && control.value != '' ? null : { srcMissing: 'image src missing' }
  }

  public onDialogHide(): void {
    this.displayCreateDialog.set(false)
    this.hideDialogAndChanged.emit(false)
  }

  public onSave(): void {
    if (!this.currentWorkspaceName) {
      this.msgService.error({ summaryKey: 'ACTIONS.CREATE.ERROR' })
      return
    }
    if (!this.formGroup.valid) return

    const imageInfo = this.submitFormValues() as ImageInfo
    imageInfo.modificationCount = 0
    imageInfo.position = (this.imageInfoCount() + 1).toString()
    imageInfo.workspaceName = this.currentWorkspaceName

    this.imageApiService
      .createImageInfo({ imageInfo })
      .pipe(
        concatMap((data) => {
          if (!this.selectedFile) {
            this.msgService.success({ summaryKey: 'ACTIONS.CREATE.SUCCESS' })
            this.formGroup.controls['url'].reset()
            this.hideDialogAndChanged.emit(true)
            return EMPTY
          }
          return this.imageApiService.createImage({ body: this.selectedFile }).pipe(
            catchError((err) => {
              this.msgService.error({ summaryKey: 'ACTIONS.CREATE.ERROR' })
              console.error('createImage', err)
              return EMPTY
            }),
            concatMap((createdImage) => {
              const updateInfo = this.submitFormValues() as ImageInfo
              updateInfo.modificationCount = data.modificationCount
              updateInfo.imageId = createdImage.imageId
              updateInfo.position = (this.imageInfoCount() + 1).toString()
              updateInfo.visible = true
              if (this.currentWorkspaceName) updateInfo.workspaceName = this.currentWorkspaceName
              return this.imageApiService.updateImageInfo({ id: data.id!, imageInfo: updateInfo }).pipe(
                catchError((err) => {
                  this.msgService.error({ summaryKey: 'ACTIONS.CREATE.ERROR' })
                  console.error('updateImageInfo', err)
                  return EMPTY
                })
              )
            }),
            tap(() => {
              this.msgService.success({ summaryKey: 'ACTIONS.CREATE.SUCCESS' })
              this.hideDialogAndChanged.emit(true)
              this.onFileRemoval()
            })
          )
        }),
        catchError(() => {
          this.msgService.error({ summaryKey: 'ACTIONS.CREATE.ERROR' })
          return EMPTY
        })
      )
      .subscribe()
  }

  public onFileSelected(selectedFile: Blob | undefined): void {
    if (!selectedFile) {
      this.onFileRemoval()
      return
    }

    this.selectedFile = selectedFile
    this.formGroup.controls['url'].disable()
  }

  public onFileRemoval() {
    this.formGroup.controls['url'].enable()
    this.selectedFile = undefined

    if (this.fileUpload?.files?.length && typeof this.fileUpload.clear === 'function') {
      this.fileUpload.clear()
    }
  }

  private submitFormValues(): any {
    const imageInfo: ImageInfo = { ...this.formGroup.value, workspaceName: this.currentWorkspaceName } as ImageInfo
    return imageInfo
  }
}
