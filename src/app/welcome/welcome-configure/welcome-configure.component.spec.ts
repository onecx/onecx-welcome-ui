import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'
import FileSaver from 'file-saver'

import { Workspace } from '@onecx/integration-interface'
import { PortalMessageService } from '@onecx/angular-integration-interface'

import {
  ImageDataResponse,
  ImageInfo,
  ImagesInternalAPIService,
  ConfigExportImportAPIService,
  WelcomeSnapshot,
  ObjectFit
} from 'src/app/shared/generated'
import { WelcomeConfigureComponent } from './welcome-configure.component'
import { ImageCreateComponent } from './image-create/image-create.component'

const ws: Workspace = {
  workspaceName: 'wsName',
  portalName: 'wsName',
  baseUrl: 'url',
  microfrontendRegistrations: []
}

const imageInfos: ImageInfo[] = [
  {
    id: '123',
    imageId: '123',
    visible: true,
    position: '1',
    workspaceName: 'ws',
    url: 'http://example.com/image1.png'
  },
  { id: '1234', imageId: '1234', visible: true, position: '2', workspaceName: 'ws' },
  { id: '12345', imageId: '12345', visible: true, position: '4', workspaceName: 'ws' },
  { id: '123456', imageId: '123456', visible: true, position: '3', workspaceName: 'ws' },
  { id: '1234567', imageId: '1234567', visible: true, position: '3', workspaceName: 'ws' }
]

const imageDTO: WelcomeSnapshot = {
  id: 'export-id',
  created: '2025-02-03T15:30:53.122632Z',
  config: {
    images: [
      {
        image: {
          visible: true,
          position: '1',
          url: 'http://example.com/image1.png',
          objectFit: ObjectFit.ScaleDown,
          objectPosition: undefined,
          backgroundColor: 'unset'
        },
        imageData: undefined
      },
      {
        image: {
          visible: true,
          position: '2',
          url: undefined,
          objectFit: ObjectFit.ScaleDown,
          objectPosition: 'center center',
          backgroundColor: 'white'
        },
        imageData: {
          imageData: new Blob(['/9j/4AAQSkZJRgABAQEASABIAAD'], { type: 'image/*' }),
          dataLength: 37,
          mimeType: 'image/*'
        }
      }
    ]
  }
}

describe('WelcomeConfigureComponent', () => {
  let component: WelcomeConfigureComponent
  let fixture: ComponentFixture<WelcomeConfigureComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    getAllImageInfosByWorkspaceName: jasmine.createSpy('getAllImageInfosByWorkspaceName').and.returnValue(of([])),
    getImageById: jasmine.createSpy('getImageById').and.returnValue(of({})),
    deleteImageInfoById: jasmine.createSpy('deleteImageInfoById').and.returnValue(of({})),
    updateImageInfo: jasmine.createSpy('updateImageInfo').and.returnValue(of({})),
    updateImageOrder: jasmine.createSpy('updateImageOrder').and.returnValue(of({}))
  }
  const eximServiceSpy = {
    exportConfiguration: jasmine.createSpy('exportConfiguration').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WelcomeConfigureComponent, ImageCreateComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: ImagesInternalAPIService, useValue: apiServiceSpy },
        { provide: ConfigExportImportAPIService, useValue: eximServiceSpy }
      ]
    }).compileComponents()
    // reset
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.getAllImageInfosByWorkspaceName.calls.reset()
    apiServiceSpy.getImageById.calls.reset()
    apiServiceSpy.deleteImageInfoById.calls.reset()
    apiServiceSpy.updateImageInfo.calls.reset()
    eximServiceSpy.exportConfiguration.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WelcomeConfigureComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('fetchImageData', () => {
    beforeEach(() => {
      component.workspace = ws
    })

    it('should get infos for all images', (done) => {
      apiServiceSpy.getAllImageInfosByWorkspaceName.and.returnValue(of(imageInfos))

      component.fetchImageInfos()

      component.imageInfo$?.subscribe({
        next: (images) => {
          expect(images.length).toBe(5)
          done()
        },
        error: done.fail
      })
    })

    it('should handle error when fetching imageinfos', (done) => {
      const errorResponse = { status: 404, statusText: 'Not found' }
      apiServiceSpy.getAllImageInfosByWorkspaceName.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.fetchImageInfos()

      component.imageInfo$?.subscribe({
        next: () => {
          expect(console.error).toHaveBeenCalledWith('getAllImageInfosByWorkspaceName', errorResponse)
          done()
        },
        error: done.fail
      })
    })
  })

  describe('fetchImageData', () => {
    it('should get data for one image', () => {
      const imgDataResponse: ImageDataResponse = { imageId: 'id' }
      apiServiceSpy.getImageById.and.returnValue(of(imgDataResponse))

      component.fetchImageData(imageInfos)

      expect(component.images).toContain(imgDataResponse)
    })

    it('should handle error when fetching imageInfos', () => {
      apiServiceSpy.getImageById.and.returnValue(throwError(() => new Error()))
      const imageInfos = [{ id: '123', imageId: '123', visible: true, position: '1', workspaceName: 'w1' }]

      component.fetchImageData(imageInfos)

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'VALIDATION.ERRORS.IMAGES.NOT_FOUND' })
    })
  })

  describe('buildImageSrc', () => {
    it('should return base64 string if image is found', () => {
      component.images = [{ imageId: '123', mimeType: 'image/png', imageData: new Blob() }]

      const result = component.buildImageSrc(imageInfos[0])

      expect(result).toBe('data:image/png;base64,[object Blob]')
    })

    it('should return the URL if image is not found', () => {
      const imageInfo = {
        id: 'id',
        imageId: 'id',
        visible: true,
        position: '1',
        workspaceName: 'w1',
        url: 'http://example.com/image3.png'
      }
      component.images = imageInfos

      const result = component.buildImageSrc(imageInfo)

      expect(result).toBe(imageInfo.url)
    })
  })

  /*
   * UI ACTIONS
   */
  describe('OnDeleteImage', () => {
    it('should delete an image', () => {
      apiServiceSpy.deleteImageInfoById.and.returnValue(of({}))

      component.onDeleteImage('123', 0, imageInfos)

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.SUCCESS' })
    })

    it('should handle error when deleting image', () => {
      const errorResponse = { status: 400, statusText: 'Error on image deletion' }
      apiServiceSpy.deleteImageInfoById.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onDeleteImage('123', 0, imageInfos)

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.ERROR' })
      expect(console.error).toHaveBeenCalledWith('deleteImageInfoById', errorResponse)
    })
  })

  describe('onChangeVisibility', () => {
    it('should handle error when updating visiblity', () => {
      apiServiceSpy.updateImageInfo.and.returnValue(of({}))

      component.onChangeVisibility({ id: '123', imageId: '123', visible: true, position: '1', workspaceName: 'w1' })

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.VISIBILITY.SUCCESS' })
    })

    it('should handle error when updating visiblity', () => {
      const errorResponse = { status: 400, statusText: 'Error on image updating' }
      apiServiceSpy.updateImageInfo.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onChangeVisibility({ id: '123', imageId: '123', visible: true, position: '1', workspaceName: 'w1' })

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.VISIBILITY.ERROR' })
      expect(console.error).toHaveBeenCalledWith('updateImageInfo', errorResponse)
    })
  })

  describe('onSaveOrder', () => {
    it('should swap elements and update their positions - normal case', () => {
      const ii: ImageInfo[] = [
        { position: '0', id: 'a', workspaceName: 'ws' },
        { position: '1', id: 'b', workspaceName: 'ws' },
        { position: '2', id: 'c', workspaceName: 'ws' },
        { position: '3', id: 'd', workspaceName: 'ws' }
      ]

      component.onSwapElement(ii, 1, 2)

      expect(ii[1].position).toBe('1')
      expect(ii[2].position).toBe('2')

      expect(ii[1].id).toBe('c')
      expect(ii[2].id).toBe('b')

      expect(component.isReordered).toBe(true)
    })

    it('should swap elements and update their positions - edge case -1', () => {
      const ii: ImageInfo[] = [
        { position: '0', id: 'a', workspaceName: 'ws' },
        { position: '1', id: 'b', workspaceName: 'ws' },
        { position: '2', id: 'c', workspaceName: 'ws' },
        { position: '3', id: 'd', workspaceName: 'ws' }
      ]

      component.onSwapElement(ii, 0, -1)

      expect(ii[0].position).toBe('0')
      expect(ii[1].position).toBe('1')
      expect(ii[2].position).toBe('2')
      expect(ii[3].position).toBe('3')

      expect(ii[0].id).toBe('d')
      expect(ii[1].id).toBe('b')
      expect(ii[2].id).toBe('c')
      expect(ii[3].id).toBe('a')
    })

    it('should swap elements and update their positions - edge case +1', () => {
      const ii: ImageInfo[] = [
        { position: '0', id: 'a', workspaceName: 'ws' },
        { position: '1', id: 'b', workspaceName: 'ws' },
        { position: '2', id: 'c', workspaceName: 'ws' },
        { position: '3', id: 'd', workspaceName: 'ws' }
      ]

      component.onSwapElement(ii, 3, 4) // d <=> a

      expect(ii[0].position).toBe('0')
      expect(ii[1].position).toBe('1')
      expect(ii[2].position).toBe('2')
      expect(ii[3].position).toBe('3')

      expect(ii[0].id).toBe('d')
      expect(ii[1].id).toBe('b')
      expect(ii[2].id).toBe('c')
      expect(ii[3].id).toBe('a')
    })

    it('should save positions', () => {
      apiServiceSpy.updateImageOrder.and.returnValue(of({}))

      component.onSaveOrder()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.REORDER.SUCCESS' })
    })

    it('should handle error when updating positions', () => {
      const errorResponse = { status: 400, statusText: 'Error on image updating' }
      apiServiceSpy.updateImageOrder.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onSaveOrder()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.REORDER.ERROR' })
      expect(console.error).toHaveBeenCalledWith('updateImageOrder', errorResponse)
    })
  })

  describe('CreateDialog', () => {
    it('should open create dialog', () => {
      component.displayCreateDialog = false

      component.onOpenCreateDialog()

      expect(component.displayCreateDialog).toBeTrue()
    })
    it('should open detail dialog', () => {
      component.displayDetailDialog = false

      component.onOpenDetailDialog(123)

      expect(component.displayDetailDialog).toBeTrue()
      expect(component.detailImageIndex).toBe(123)
    })

    it('should refresh images after closing', () => {
      spyOn(component, 'fetchImageInfos')

      component.onCloseDetailDialog(true)

      expect(component.fetchImageInfos).toHaveBeenCalled()
    })

    it('should not refresh after closing', () => {
      component.displayCreateDialog = true
      component.displayDetailDialog = true
      component.displayImportDialog = true
      spyOn(component, 'fetchImageInfos')

      component.onCloseDetailDialog(false)

      expect(component.displayCreateDialog).toBeFalse()
      expect(component.displayDetailDialog).toBeFalse()
      expect(component.displayImportDialog).toBeFalse()
      expect(component.fetchImageInfos).not.toHaveBeenCalled()
    })
  })

  describe('sortImagesByPosition', () => {
    it('should sort images by position in ascending order', () => {
      const images: ImageInfo[] = [
        { position: '3', workspaceName: 'ws' },
        { position: '1', workspaceName: 'ws' },
        { position: '2', workspaceName: 'ws' }
      ]
      const sortedImages = images.sort(component['sortImagesByPosition'])
      expect(sortedImages).toEqual([
        { position: '1', workspaceName: 'ws' },
        { position: '2', workspaceName: 'ws' },
        { position: '3', workspaceName: 'ws' }
      ])
    })

    it('should treat undefined positions as 0', () => {
      const images: ImageInfo[] = [
        { position: undefined, workspaceName: 'ws' },
        { position: '0', workspaceName: 'ws' },
        { position: '1', workspaceName: 'ws' }
      ]
      const sortedImages = images.sort(component['sortImagesByPosition'])
      expect(sortedImages).toEqual([
        { position: undefined, workspaceName: 'ws' },
        { position: '0', workspaceName: 'ws' },
        { position: '1', workspaceName: 'ws' }
      ])
    })

    it('should handle an empty array', () => {
      const images: ImageInfo[] = []
      const sortedImages = images.sort(component['sortImagesByPosition'])
      expect(sortedImages).toEqual([])
    })

    it('should handle a mix of defined and undefined positions', () => {
      const images: ImageInfo[] = [
        { position: undefined, workspaceName: 'ws1' },
        { position: '2', workspaceName: 'ws2' },
        { position: undefined, workspaceName: 'ws3' },
        { position: '1', workspaceName: 'ws4' },
        { position: '3', workspaceName: 'ws5' }
      ]
      const sortedImages = images.sort(component['sortImagesByPosition'])
      expect(sortedImages).toEqual([
        { position: undefined, workspaceName: 'ws1' },
        { position: undefined, workspaceName: 'ws3' },
        { position: '1', workspaceName: 'ws4' },
        { position: '2', workspaceName: 'ws2' },
        { position: '3', workspaceName: 'ws5' }
      ])
    })
  })

  describe('Export', () => {
    beforeEach(() => {
      component.workspace = ws
    })

    it('should do nothing if no workspace is available', () => {
      component.workspace = undefined

      component.onExport()

      expect(eximServiceSpy.exportConfiguration).not.toHaveBeenCalled()
    })

    it('should save export file', () => {
      spyOn(JSON, 'stringify').and.returnValue('themejson')
      spyOn(FileSaver, 'saveAs')

      eximServiceSpy.exportConfiguration.and.returnValue(of(imageDTO) as any)

      component.onExport()

      expect(eximServiceSpy.exportConfiguration).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ exportWelcomeRequest: { workspaceName: component.workspace?.workspaceName } })
      )
    })

    it('should display error on export fail', () => {
      const errorResponse = { status: 400, statusText: 'Error on exporting configuration' }
      eximServiceSpy.exportConfiguration.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onExport()

      expect(console.error).toHaveBeenCalledWith('exportConfiguration', errorResponse)
      expect(msgServiceSpy.error).toHaveBeenCalledOnceWith({ summaryKey: 'ACTIONS.EXPORT.MESSAGE_NOK' })
    })
  })

  describe('Import', () => {
    beforeEach(() => {
      component.workspace = ws
    })

    it('should open import dialog', () => {
      component.onImport()

      expect(component.displayImportDialog).toBeTrue()
    })
  })
})
