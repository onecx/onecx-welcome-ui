import { NO_ERRORS_SCHEMA } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { BehaviorSubject, of, throwError } from 'rxjs'

import { ButtonModule } from 'primeng/button'
import { DialogModule } from 'primeng/dialog'

import { AppStateService, PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import { ImageDataResponse, ImageInfo, ImagesInternalAPIService } from 'src/app/shared/generated'
import { ImageCreateComponent } from './image-create.component'

describe('ImageCreateComponent', () => {
  let component: ImageCreateComponent
  let fixture: ComponentFixture<ImageCreateComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    createImageInfo: jasmine.createSpy('createImageInfo').and.returnValue(of({})),
    createImage: jasmine.createSpy('createImage').and.returnValue(of({})),
    updateImageInfo: jasmine.createSpy('updateImageInfo').and.returnValue(of({}))
  }
  const lang$ = new BehaviorSubject<string>('de')
  const profile$ = new BehaviorSubject<any>({})
  const mockUserService = {
    lang$,
    profile$
  }
  const appStateServiceSpy = {
    currentWorkspace$: of({ workspaceName: 'test-ws' })
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ImageCreateComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en'),
        BrowserAnimationsModule,
        DialogModule,
        ButtonModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: ImagesInternalAPIService, useValue: apiServiceSpy },
        { provide: UserService, useValue: mockUserService },
        { provide: AppStateService, useValue: appStateServiceSpy }
      ]
    })
      .overrideProvider(ImagesInternalAPIService, { useValue: apiServiceSpy })
      .overrideProvider(UserService, { useValue: mockUserService })
      .overrideProvider(AppStateService, { useValue: appStateServiceSpy })
      .overrideComponent(ImageCreateComponent, {
        set: {
          providers: [{ provide: ImagesInternalAPIService, useValue: apiServiceSpy }]
        }
      })
      .compileComponents()
    // reset
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.createImage.calls.reset()
    apiServiceSpy.createImageInfo.calls.reset()
    apiServiceSpy.updateImageInfo.calls.reset()
    // default data
    lang$.next('de')
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageCreateComponent)
    component = fixture.componentInstance
    ;(component as any).imageApiService = apiServiceSpy
    ;(component as any).msgService = msgServiceSpy
    component.currentWorkspaceName = 'test-ws'
    component.displayCreateDialog = true
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('on init/change', () => {
    it('should display form', () => {
      component.ngOnInit()
      fixture.detectChanges()
      const dElement = fixture.debugElement
      const uploadField = dElement.query(By.css('p-fileupload'))

      expect(uploadField).toBeTruthy()
    })

    it('should reset form field url', () => {
      component.ngOnInit()
      component.ngOnChanges()
      fixture.detectChanges()
      const dElement = fixture.debugElement
      const uploadField = dElement.query(By.css('p-fileupload'))

      expect(uploadField).toBeTruthy()
    })
  })

  it('should save image with url', () => {
    component.formGroup.controls['url'].setValue('someUrl')
    component.ngOnInit()
    fixture.detectChanges()
    apiServiceSpy.createImageInfo.and.returnValue(of({ id: '123', url: 'someUrl', position: '1' } as ImageInfo))

    component.onSave()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.SUCCESS' })
  })
  it('should save image with fileUpload', () => {
    component.ngOnInit()
    component.onFileSelected(new Blob())

    fixture.detectChanges()
    apiServiceSpy.createImageInfo.and.returnValue(of({ id: '123', position: '1', modificationCount: 0 } as ImageInfo))
    apiServiceSpy.createImage.and.returnValue(of({ imageId: '1234' } as ImageDataResponse))
    apiServiceSpy.updateImageInfo.and.returnValue(
      of({ id: '123', imageId: '1234', position: '1', modificationCount: 1 } as ImageInfo)
    )

    component.onSave()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.SUCCESS' })
  })

  it('should handle file removal', () => {
    component.ngOnInit()
    component.onFileSelected(new Blob())
    expect(component.selectedFile).toBeDefined()
    component.onFileRemoval()
    expect(component.selectedFile).toBeUndefined()
  })

  it('should handle error when creating imageinfo', () => {
    apiServiceSpy.createImageInfo.and.returnValue(throwError(() => new Error('createImageInfo failed')))
    component.formGroup.controls['url'].setValue('someUrl')
    component.onSave()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ERROR' })
  })

  it('should handle error when creating image data', () => {
    const errorResponse = { status: 400, statusText: 'Error on creation' }
    apiServiceSpy.createImageInfo.and.returnValue(of({ id: '123', position: '1', modificationCount: 0 } as ImageInfo))
    apiServiceSpy.createImage.and.returnValue(throwError(() => errorResponse))
    spyOn(console, 'error')

    component.ngOnInit()
    component.onFileSelected(new Blob())
    component.onSave()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ERROR' })
    expect(console.error).toHaveBeenCalledWith('createImage', errorResponse)
  })

  it('should handle error when updating image info', () => {
    const errorResponse = { status: 400, statusText: 'Error on updating' }
    apiServiceSpy.createImageInfo.and.returnValue(of({ id: '123', position: '1', modificationCount: 0 } as ImageInfo))
    apiServiceSpy.createImage.and.returnValue(of({ imageId: '1234' } as ImageDataResponse))
    apiServiceSpy.updateImageInfo.and.returnValue(throwError(() => errorResponse))
    spyOn(console, 'error')

    component.ngOnInit()
    component.onFileSelected(new Blob())
    component.onSave()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ERROR' })
    expect(console.error).toHaveBeenCalledWith('updateImageInfo', errorResponse)
  })

  it('should show error if workspace name is empty when saving', () => {
    component.currentWorkspaceName = ''
    component.formGroup.controls['url'].setValue('someUrl')

    component.onSave()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ERROR' })
    expect(apiServiceSpy.createImageInfo).not.toHaveBeenCalled()
  })

  it('should call onFileRemoval when onFileSelected is called with undefined', () => {
    spyOn(component, 'onFileRemoval')

    component.onFileSelected(undefined)

    expect(component.onFileRemoval).toHaveBeenCalled()
    expect(component.selectedFile).toBeUndefined()
  })

  it('should clear fileUpload when files exist on removal', () => {
    const mockClear = jasmine.createSpy('clear')
    component.fileUpload = { files: [new File([], 'test.png')], clear: mockClear } as any

    component.onFileRemoval()

    expect(mockClear).toHaveBeenCalled()
  })

  it('should close dialog', () => {
    component.ngOnInit()
    fixture.detectChanges()

    const dElement = fixture.debugElement

    const dialog = dElement.query(By.css('p-dialog'))
    expect(dialog).toBeTruthy()
    const closeButton = dElement.query(By.css("p-button[icon='pi pi-times']"))
    expect(closeButton).toBeTruthy()
    let dialogCloseEvent
    component.hideDialogAndChanged.subscribe((event: any) => {
      dialogCloseEvent = event
    })
    expect(dialogCloseEvent).toBeUndefined()
    component.onDialogHide()

    expect(dialogCloseEvent).toBeDefined()
    if (dialogCloseEvent) {
      expect(dialogCloseEvent).toBe(false)
    }
  })
})
