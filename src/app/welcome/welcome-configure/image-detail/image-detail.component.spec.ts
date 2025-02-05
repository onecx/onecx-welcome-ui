import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { FormControl, FormGroup } from '@angular/forms'
import { of, throwError } from 'rxjs'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { ImageInfo, ImagesInternalAPIService, ImageDataResponse, ObjectFit } from 'src/app/shared/generated'

import { ImageDetailComponent, ImageCssForm } from './image-detail.component'

const imageCssForm = new FormGroup<ImageCssForm>({
  objectFit: new FormControl(ObjectFit.ScaleDown),
  objectPosition: new FormControl('center center'),
  backgroundColor: new FormControl('unset')
})

const imageInfos: ImageInfo[] = [
  {
    id: '01',
    imageId: '01',
    modificationCount: 0,
    visible: true,
    position: '0',
    workspaceName: 'ws',
    url: 'http://example.com/image1.png',
    objectFit: ObjectFit.ScaleDown,
    objectPosition: 'center center',
    backgroundColor: 'unset'
  },
  { id: '02', imageId: '02', visible: true, position: '1', workspaceName: 'ws' },
  { id: '03', imageId: '03', visible: true, position: '2', workspaceName: 'ws' },
  { id: '04', imageId: '04', visible: true, position: '3', workspaceName: 'ws' },
  { id: '05', imageId: '05', visible: true, position: '4', workspaceName: 'ws' }
]

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
    component.displayDialog = true
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('on changes', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('imageInfos', imageInfos)
    })

    it('should fill the form with image values', () => {
      spyOn(component, 'ngOnChanges').and.callThrough()
      fixture.componentRef.setInput('imageIndex', -1)

      fixture.detectChanges() // trigger lifecycle hook: ngOnChanges()

      expect(component.ngOnChanges).toHaveBeenCalled()
    })

    it('should fill the form with image values', () => {
      spyOn(component, 'ngOnChanges').and.callThrough()
      fixture.componentRef.setInput('imageIndex', 0)

      fixture.detectChanges() // trigger lifecycle hook: ngOnChanges()

      expect(component.ngOnChanges).toHaveBeenCalled()

      expect(component.formGroup.value).toEqual(imageCssForm.value)
    })

    it('should fill the form with default values', () => {
      spyOn(component, 'ngOnChanges').and.callThrough()
      fixture.componentRef.setInput('imageIndex', 1)

      fixture.detectChanges() // trigger lifecycle hook: ngOnChanges()

      expect(component.ngOnChanges).toHaveBeenCalled()

      expect(component.formGroup.value).toEqual(imageCssForm.value)
    })
  })

  describe('build image src', () => {
    const imageData: ImageDataResponse[] = [{ imageId: '02', mimeType: 'mimeType', imageData: new Blob() }]
    beforeEach(() => {
      fixture.componentRef.setInput('imageIndex', 0)
      fixture.detectChanges() // trigger lifecycle hook: ngOnChanges()
    })

    it('should return the base64 image source if image data are available', () => {
      const result = component.buildImageSrc(imageInfos[0], imageData)

      expect(result).toBe('http://example.com/image1.png')
    })

    it('should return the image URL if the image data are not found', () => {
      const result = component.buildImageSrc(imageInfos[1], imageData)

      expect(result).toBe('data:mimeType;base64,[object Blob]')
    })

    it('should return the correct URL if imageData is empty', () => {
      const imageInfo: ImageInfo = { imageId: '01', url: 'http://example.com/image1.png', workspaceName: 'ws' }
      const result = component.buildImageSrc(imageInfo, [])

      expect(result).toBe('http://example.com/image1.png')
    })
  })

  describe('hide dialog', () => {
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

  describe('image navigation', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('imageInfos', imageInfos)
    })

    it('should go to first image if on last', () => {
      fixture.componentRef.setInput('imageIndex', imageInfos.length - 1) // last

      component.onNavigateToImage(imageInfos.length) // last + 1

      expect(component.imageIndex).toBe(0)
    })

    it('should go to last image if on first', () => {
      fixture.componentRef.setInput('imageIndex', 0) // last

      component.onNavigateToImage(-1)

      expect(component.imageIndex).toBe(imageInfos.length - 1)
    })

    it('should go to next image', () => {
      fixture.componentRef.setInput('imageIndex', 1)

      component.onNavigateToImage(2)

      expect(component.imageIndex).toBe(2)
    })
  })

  /***************************************************************************
   * SAVE => UPDATE
   **************************************************************************/
  describe('Saving', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('imageInfos', imageInfos)
      fixture.componentRef.setInput('imageIndex', 0)
      fixture.detectChanges() // trigger lifecycle hook: ngOnChanges()
    })

    it('should save image info - successful', () => {
      const responseData: ImageInfo = { ...imageInfos[0], modificationCount: 1 }
      apiServiceSpy.updateImageInfo.and.returnValue(of(responseData))

      component.onSave()

      expect(component.imageInfos[0]).toEqual(responseData)
      expect(component.isChanged).toBeTrue()
      expect(msgServiceSpy.success).toHaveBeenCalledOnceWith({ summaryKey: 'ACTIONS.SAVE.MESSAGE_OK' })
    })

    it('should save image info - failed', () => {
      const errorResponse = { status: 400, statusText: 'Error on saving image info' }
      apiServiceSpy.updateImageInfo.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onSave()

      expect(msgServiceSpy.error).toHaveBeenCalledOnceWith({ summaryKey: 'ACTIONS.SAVE.MESSAGE_NOK' })
      expect(console.error).toHaveBeenCalledWith('updateImageInfo', errorResponse)
    })
  })
})
