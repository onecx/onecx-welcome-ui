import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, waitForAsync, TestBed } from '@angular/core/testing'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateModule, TranslateLoader } from '@ngx-translate/core'
import {
  PortalMessageService,
  createTranslateLoader,
  AppStateService,
  UserService
} from '@onecx/portal-integration-angular'
import { DialogModule } from 'primeng/dialog'
import { InputSwitchModule } from 'primeng/inputswitch'
import { of, throwError } from 'rxjs'
import { ImageDataResponse, ImageInfo, ImagesInternalAPIService } from 'src/app/shared/generated'
import { ImageCreateComponent } from './image-create.component'
import { OverlayPanelModule } from 'primeng/overlaypanel'
import { By } from '@angular/platform-browser'
import { ButtonModule } from 'primeng/button'

describe('ImageCreateComponent', () => {
  let component: ImageCreateComponent
  let fixture: ComponentFixture<ImageCreateComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', [
    'success',
    'error',
    'info',
    'warning'
  ])

  const apiServiceSpy = {
    createImageInfo: jasmine.createSpy('createImageInfo').and.returnValue(of({})),
    createImage: jasmine.createSpy('createImage').and.returnValue(of({})),
    updateImageInfo: jasmine.createSpy('updateImageInfo').and.returnValue(of({}))
  }

  const mockUserService = {
    lang$: {
      getValue: jasmine.createSpy('getValue')
    },
    profile$: {
      getValue: jasmine.createSpy('getValue'),
      asObservable: jasmine.createSpy('asObservable')
    }
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ImageCreateComponent],
      imports: [
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        }),
        BrowserAnimationsModule,
        DialogModule,
        FormsModule,
        InputSwitchModule,
        OverlayPanelModule,
        ReactiveFormsModule,
        ButtonModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: ImagesInternalAPIService, useValue: apiServiceSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    msgServiceSpy.info.calls.reset()
    msgServiceSpy.warning.calls.reset()
    apiServiceSpy.createImage.calls.reset()
    apiServiceSpy.createImageInfo.calls.reset()
    apiServiceSpy.updateImageInfo.calls.reset()
    mockUserService.lang$.getValue.and.returnValue('de')
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageCreateComponent)
    component = fixture.componentInstance
    component.displayCreateDialog = true
    fixture.detectChanges()
  })
  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should display form', () => {
    component.ngOnInit()
    fixture.detectChanges()
    const dElement = fixture.debugElement
    const uploadField = dElement.query(By.css('p-fileupload'))

    expect(uploadField).toBeTruthy()
  })

  it('should save image with url', () => {
    component.formGroup.controls['url'].setValue('someUrl')
    component.ngOnInit()
    fixture.detectChanges()
    const dElement = fixture.debugElement
    apiServiceSpy.createImageInfo.and.returnValue(of({ id: '123', url: 'someUrl', position: '1' } as ImageInfo))

    const saveButton = dElement.queryAll(By.css('button'))[2]
    expect(saveButton).toBeTruthy()
    saveButton.nativeElement.click()
    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.SUCCESS' })
  })
  it('should save image with fileUpload', () => {
    component.ngOnInit()
    component.handleFileSelected(new Blob())

    fixture.detectChanges()
    const dElement = fixture.debugElement
    apiServiceSpy.createImageInfo.and.returnValue(of({ id: '123', position: '1', modificationCount: 0 } as ImageInfo))
    apiServiceSpy.createImage.and.returnValue(of({ imageId: '1234' } as ImageDataResponse))
    apiServiceSpy.updateImageInfo.and.returnValue(
      of({ id: '123', imageId: '1234', position: '1', modificationCount: 1 } as ImageInfo)
    )

    const saveButton = dElement.queryAll(By.css('button'))[2]
    expect(saveButton).toBeTruthy()
    saveButton.nativeElement.click()
    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.SUCCESS' })
  })

  it('should handle file removal', () => {
    component.ngOnInit()
    component.handleFileSelected(new Blob())
    expect(component.selectedFile).toBeDefined()
    component.handleFileRemoval()
    expect(component.selectedFile).toBeUndefined()
  })

  it('should handle error when creating imageinfo', () => {
    apiServiceSpy.createImageInfo.and.returnValue(throwError(() => new Error()))
    component.formGroup.controls['url'].setValue('someUrl')
    component.onSave()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ERROR' })
  })

  it('should handle error when creating image data', () => {
    component.ngOnInit()

    component.handleFileSelected(new Blob())

    apiServiceSpy.createImageInfo.and.returnValue(of({ id: '123', position: '1', modificationCount: 0 } as ImageInfo))

    apiServiceSpy.createImage.and.returnValue(throwError(() => new Error()))

    component.onSave()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ERROR' })
  })

  it('should handle error when updating image info', () => {
    component.ngOnInit()

    component.handleFileSelected(new Blob())

    apiServiceSpy.createImageInfo.and.returnValue(of({ id: '123', position: '1', modificationCount: 0 } as ImageInfo))
    apiServiceSpy.createImage.and.returnValue(of({ imageId: '1234' } as ImageDataResponse))

    apiServiceSpy.updateImageInfo.and.returnValue(throwError(() => new Error()))

    component.onSave()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ERROR' })
  })

  it('should close dialog', () => {
    component.ngOnInit()
    fixture.detectChanges()

    const dElement = fixture.debugElement

    const dialog = dElement.nativeElement.querySelector('p-dialog')
    expect(dialog.attributes.getNamedItem('ng-reflect-visible').value).toBeTruthy()
    const closeButton = dElement.queryAll(By.css('button'))[1]
    expect(closeButton).toBeTruthy()
    //spyOn(component, 'onDialogHide').and.callThrough()
    let dialogCloseEvent
    component.hideDialogAndChanged.subscribe((event: any) => {
      dialogCloseEvent = event
    })
    expect(dialogCloseEvent).toBeUndefined()
    closeButton.nativeElement.click()

    //component.onDialogHide()
    //fixture.detectChanges()
    //const dialogAfterChange = dElement.nativeElement.querySelector('p-dialog')
    //expect(dialogAfterChange.attributes.getNamedItem('ng-reflect-visible').value).toBe('false')
    expect(dialogCloseEvent).toBeDefined()
    if (dialogCloseEvent) {
      expect(dialogCloseEvent).toBe(false)
    }
  })
})
