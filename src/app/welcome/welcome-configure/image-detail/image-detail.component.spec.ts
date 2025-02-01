import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
//import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms'
import { of /*, throwError */ } from 'rxjs'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { ImageInfo, ImagesInternalAPIService, ImageDataResponse } from 'src/app/shared/generated'
//import { ImageDataResponse, ImageInfo, ImagesInternalAPIService, ObjectFit } from 'src/app/shared/generated'

import { ImageDetailComponent } from './image-detail.component'

describe('ImageDetailComponent', () => {
  let component: ImageDetailComponent
  let fixture: ComponentFixture<ImageDetailComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = { updateImageInfo: jasmine.createSpy('updateImageInfo').and.returnValue(of({})) }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ImageDetailComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
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
    // satisfy the displaying of the url in HTML
    component.imageInfos = [{ imageId: '1', url: 'http://example.com/image1.png', workspaceName: 'ws' }]
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('buildImageSrc', () => {
    const imageData: ImageDataResponse[] = [{ imageId: '1', mimeType: 'mimeType', imageData: new Blob() }]

    it('should return the base64 image source if image data are available', () => {
      const imageInfo: ImageInfo = { imageId: '1', workspaceName: 'ws' }

      const result = component.buildImageSrc(imageInfo, imageData)

      expect(result).toBe('data:mimeType;base64,[object Blob]')
    })

    it('should return the image URL if the image data are not found', () => {
      const imageInfo: ImageInfo = { imageId: '2', url: 'http://example.com/image2.png', workspaceName: 'ws' }

      const result = component.buildImageSrc(imageInfo, imageData)

      expect(result).toBe('http://example.com/image2.png')
    })

    it('should return the correct URL if imageData is empty', () => {
      const imageInfo: ImageInfo = { imageId: '1', url: 'http://example.com/image1.png', workspaceName: 'ws' }
      const result = component.buildImageSrc(imageInfo, [])

      expect(result).toBe('http://example.com/image1.png')
    })
  })

  describe('onDialogHide', () => {
    it('should emit false when onCloseDetailDialog is called', () => {
      spyOn(component.closeDialog, 'emit')
      component.isChanged = false

      component.onDialogHide()

      expect(component.closeDialog.emit).toHaveBeenCalledWith(component.isChanged)
    })

    it('should emit false when onDialogHide is called', () => {
      spyOn(component.closeDialog, 'emit')
      component.isChanged = true

      component.onDialogHide()

      expect(component.closeDialog.emit).toHaveBeenCalledWith(component.isChanged)
    })
  })

  /***************************************************************************
   * SAVE => CREATE + UPDATE
   **************************************************************************/
})
