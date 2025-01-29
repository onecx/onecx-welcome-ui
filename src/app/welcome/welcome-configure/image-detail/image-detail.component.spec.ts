import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, waitForAsync, TestBed } from '@angular/core/testing'
import { provideHttpClient, HttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { By } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateModule, TranslateLoader } from '@ngx-translate/core'
import { of /*, throwError */ } from 'rxjs'

import { DialogModule } from 'primeng/dialog'

import { PortalMessageService } from '@onecx/angular-integration-interface'
import { AppStateService } from '@onecx/angular-integration-interface'
import { createTranslateLoader } from '@onecx/portal-integration-angular'

import { ImageInfo, ImagesInternalAPIService, ImageDataResponse } from 'src/app/shared/generated'
//import { ImageDataResponse, ImageInfo, ImagesInternalAPIService, ObjectFit } from 'src/app/shared/generated'

import { ImageDetailComponent } from './image-detail.component'

fdescribe('ImageDetailComponent', () => {
  let component: ImageDetailComponent
  let fixture: ComponentFixture<ImageDetailComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    updateImageInfo: jasmine.createSpy('updateImageInfo').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ImageDetailComponent],
      imports: [
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
        ReactiveFormsModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: ImagesInternalAPIService, useValue: apiServiceSpy }
      ]
    }).compileComponents()
    // reset
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.updateImageInfo.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageDetailComponent)
    component = fixture.componentInstance
    //component.displayDetailDialog = true
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should close dialog', () => {
    fixture.detectChanges()

    const dElement = fixture.debugElement

    const dialog = dElement.nativeElement.querySelector('p-dialog')
    expect(dialog.attributes.getNamedItem('ng-reflect-visible').value).toBeTruthy()
    const closeButton = dElement.queryAll(By.css('button'))[1]
    expect(closeButton).toBeTruthy()
    let dialogCloseEvent
    component.hideDialogAndChanged.subscribe((event: any) => {
      dialogCloseEvent = event
    })
    expect(dialogCloseEvent).toBeUndefined()
    closeButton.nativeElement.click()

    expect(dialogCloseEvent).toBeDefined()
    if (dialogCloseEvent) {
      expect(dialogCloseEvent).toBe(false)
    }
  })

  fdescribe('buildImageSrc', () => {
    fit('should return the base64 image source if the image is found', () => {
      const imageInfo: ImageInfo = { imageId: '1', url: 'http://example.com/image1.png', workspaceName: 'ws' }
      const imageData: ImageDataResponse[] = [{ imageId: '1', mimeType: 'mimeType', imageData: new Blob() }]

      const result = component.buildImageSrc(imageInfo, imageData)

      expect(result).toBe('http://example.com/image1.png')
    })
    /*
    it('should return the image URL if the image is not found', () => {
      const imageInfo = { imageId: '3', url: 'http://example.com/image3.png' } as ImageInfo
      const result = component.buildImageSrc(imageInfo)

      expect(result).toBe('http://example.com/image3.png')
    })

    it('should return the correct URL if images array is empty', () => {
      component.images = []
      const imageInfo = { imageId: '1', url: 'http://example.com/image1.png' } as ImageInfo
      const result = component.buildImageSrc(imageInfo)

      expect(result).toBe('http://example.com/image1.png')
    })

    it('should return the correct URL if imageData is empty', () => {
      component.images = [{ imageId: '1', mimeType: 'image/png' }]
      const imageInfo = { imageId: '1', url: 'http://example.com/image1.png' } as ImageInfo
      const result = component.buildImageSrc(imageInfo)

      expect(result).toBe('data:image/png;base64,undefined')
    })
      */
  })
})
