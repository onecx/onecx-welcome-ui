/* eslint-disable @angular-eslint/component-selector */
import { Component, input } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { Location } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { ActivatedRoute } from '@angular/router'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { BehaviorSubject, firstValueFrom, of, throwError } from 'rxjs'
import FileSaver from 'file-saver'

import { Workspace } from '@onecx/integration-interface'
import { AngularAcceleratorModule, BreadcrumbService, PageHeaderComponent } from '@onecx/angular-accelerator'
import {
  AppStateService,
  ConfigurationService,
  PortalMessageService,
  UserService
} from '@onecx/angular-integration-interface'
import { PermissionService, PortalPageComponent } from '@onecx/angular-utils'

import {
  ImageDataResponse,
  ImageInfo,
  ImagesInternalAPIService,
  ConfigExportImportAPIService,
  WelcomeSnapshot,
  ObjectFit
} from 'src/app/shared/generated'
import { WelcomeConfigureComponent } from './welcome-configure.component'

// Test data: do not use AppStateServiceMock
const ws: Workspace = {
  workspaceName: 'workspace',
  portalName: 'workspace',
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
/*
 *  Fake (empty) components
 *  This is necessary because the real components uses stuff which is not available.
 *  See overrideComponent() below, where the Mock components are used instead of the real ones.
 */
@Component({ selector: 'ocx-portal-page', standalone: true, template: '<ng-content></ng-content>' })
class MockPortalPageComponent {}
@Component({ selector: 'ocx-page-header', standalone: true, template: '<ng-content></ng-content>' })
class MockPageHeaderComponent {
  header = input<string>()
  subheader = input<string>()
  actions = input<any[]>()
  manualBreadcrumbs = input<boolean>()
}
@Component({ selector: 'ocx-content', standalone: true, template: '<ng-content></ng-content>' })
class MockOcxContentComponent {}

// Lets go testing:
describe('WelcomeConfigureComponent', () => {
  let component: WelcomeConfigureComponent
  let fixture: ComponentFixture<WelcomeConfigureComponent>
  let appStateSubject: BehaviorSubject<Workspace | undefined>
  let langSubject: BehaviorSubject<string>

  const locationSpy = jasmine.createSpyObj<Location>('Location', ['back'])
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const configServiceSpy = jasmine.createSpyObj('ConfigurationService', ['getConfig', 'getProperty', 'config$'])
  configServiceSpy.getConfig.and.returnValue({ baseUrl: 'http://localhost/api', production: false })
  const imageServiceSpy = {
    getAllImageInfosByWorkspaceName: jasmine.createSpy('getAllImageInfosByWorkspaceName').and.returnValue(of([])),
    getImageById: jasmine.createSpy('getImageById').and.returnValue(of({})),
    deleteImageInfoById: jasmine.createSpy('deleteImageInfoById').and.returnValue(of({})),
    updateImageInfo: jasmine.createSpy('updateImageInfo').and.returnValue(of({})),
    updateImageOrder: jasmine.createSpy('updateImageOrder').and.returnValue(of({}))
  }
  const eximServiceSpy = {
    exportConfiguration: jasmine.createSpy('exportConfiguration').and.returnValue(of({}))
  }
  const mockActivatedRoute = { snapshot: { data: {} } }
  const mockPermissionService = jasmine.createSpyObj('PermissionService', ['hasPermission', 'getPermissions'])
  mockPermissionService.hasPermission.and.returnValue(of(true))
  mockPermissionService.getPermissions.and.returnValue(of([]))

  function initTestComponent(): void {
    fixture = TestBed.createComponent(WelcomeConfigureComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(waitForAsync(() => {
    appStateSubject = new BehaviorSubject<Workspace | undefined>(undefined)
    langSubject = new BehaviorSubject<string>('de')
    TestBed.configureTestingModule({
      imports: [
        WelcomeConfigureComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        BreadcrumbService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: Location, useValue: locationSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: AppStateService, useValue: { currentWorkspace$: appStateSubject } },
        { provide: ConfigurationService, useValue: configServiceSpy },
        { provide: UserService, useValue: { lang$: langSubject, profile$: new BehaviorSubject<any>({}) } },
        { provide: PermissionService, useValue: { hasPermission: () => of(true), getPermissions: () => of([]) } },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: ImagesInternalAPIService, useValue: imageServiceSpy },
        { provide: ConfigExportImportAPIService, useValue: eximServiceSpy }
      ]
    })
      // replace problematic components with mocks to avoid errors during testing
      .overrideComponent(WelcomeConfigureComponent, {
        remove: { imports: [AngularAcceleratorModule, PortalPageComponent, PageHeaderComponent] },
        add: { imports: [MockPageHeaderComponent, MockOcxContentComponent, MockPortalPageComponent] }
      })
      .compileComponents()
  }))

  beforeEach(() => {
    initTestComponent()
    // reset
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    imageServiceSpy.getAllImageInfosByWorkspaceName.calls.reset()
    imageServiceSpy.getImageById.calls.reset()
    imageServiceSpy.deleteImageInfoById.calls.reset()
    imageServiceSpy.updateImageInfo.calls.reset()
    imageServiceSpy.updateImageOrder.calls.reset()
    eximServiceSpy.exportConfiguration.calls.reset()
    ;(component as any).imageService = imageServiceSpy
    ;(component as any).eximService = eximServiceSpy
    ;(component as any).msgService = msgServiceSpy
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should set workspace and reload when workspace becomes available', () => {
    imageServiceSpy.getAllImageInfosByWorkspaceName.and.returnValue(of([]))
    spyOn(component, 'onReload')

    appStateSubject.next(ws)

    expect(component.workspace).toEqual(ws)
    expect(component.onReload).toHaveBeenCalled()
  })

  it('should revoke blob URLs on destroy', () => {
    component['blobUrls'].set('id1', 'blob:test-url')
    spyOn(URL, 'revokeObjectURL')

    component.ngOnDestroy()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url')
  })

  describe('fetchImageData', () => {
    beforeEach(() => {
      component.workspace = ws
    })

    it('should revoke existing blob URLs before fetching new ones', () => {
      component['blobUrls'].set('id1', 'blob:old-url')
      spyOn(URL, 'revokeObjectURL')
      imageServiceSpy.getAllImageInfosByWorkspaceName.and.returnValue(of([]))

      component.fetchImageInfos()

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:old-url')
    })

    it('should get infos for all images', async () => {
      imageServiceSpy.getAllImageInfosByWorkspaceName.and.returnValue(of(imageInfos))

      component.fetchImageInfos()
      const images = await firstValueFrom(component.imageInfo$)
      expect(images).toHaveSize(5)
    })

    it('should handle error when fetching imageinfos', async () => {
      const errorResponse = { status: 404, statusText: 'Not found' }
      imageServiceSpy.getAllImageInfosByWorkspaceName.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.fetchImageInfos()
      await firstValueFrom(component.imageInfo$)

      expect(console.error).toHaveBeenCalledWith('getAllImageInfosByWorkspaceName', errorResponse)
    })
  })

  describe('fetchImageData', () => {
    it('should get data for one image', () => {
      const imgDataResponse: ImageDataResponse = { imageId: 'id' }
      imageServiceSpy.getImageById.and.returnValue(of(imgDataResponse))

      component.fetchImageData(imageInfos)

      expect(component.images()).toContain(imgDataResponse)
    })

    it('should handle error when fetching imageInfos', () => {
      imageServiceSpy.getImageById.and.returnValue(throwError(() => new Error()))
      const imageInfos = [{ id: '123', imageId: '123', visible: true, position: '1', workspaceName: 'w1' }]

      component.fetchImageData(imageInfos)

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'VALIDATION.ERRORS.IMAGES.NOT_FOUND' })
    })
  })

  /*
   * UI ACTIONS
   */
  describe('OnDeleteImage', () => {
    it('should delete an image', () => {
      imageServiceSpy.deleteImageInfoById.and.returnValue(of({}))

      component.onDeleteImage('123', 0, [...imageInfos])

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.SUCCESS' })
    })

    it('should handle error when deleting image', () => {
      const errorResponse = { status: 400, statusText: 'Error on image deletion' }
      imageServiceSpy.deleteImageInfoById.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onDeleteImage('123', 0, [...imageInfos])

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.ERROR' })
      expect(console.error).toHaveBeenCalledWith('deleteImageInfoById', errorResponse)
    })
  })

  describe('onChangeVisibility', () => {
    it('should handle error when updating visiblity', () => {
      imageServiceSpy.updateImageInfo.and.returnValue(of({}))

      component.onChangeVisibility({ id: '123', imageId: '123', visible: true, position: '1', workspaceName: 'w1' })

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.VISIBILITY.SUCCESS' })
    })

    it('should handle error when updating visiblity', () => {
      const errorResponse = { status: 400, statusText: 'Error on image updating' }
      imageServiceSpy.updateImageInfo.and.returnValue(throwError(() => errorResponse))
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

    it('should not call preparePageAction if already reordered', () => {
      const ii: ImageInfo[] = [
        { position: '0', id: 'a', workspaceName: 'ws' },
        { position: '1', id: 'b', workspaceName: 'ws' }
      ]
      component.isReordered = true
      spyOn<any>(component, 'preparePageAction')

      component.onSwapElement(ii, 0, 1)

      expect(component['preparePageAction']).not.toHaveBeenCalled()
      expect(component.isReordered).toBe(true)
    })

    it('should save positions', () => {
      imageServiceSpy.updateImageOrder.and.returnValue(of({}))

      component.onSaveOrder()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.REORDER.SUCCESS' })
    })

    it('should handle error when updating positions', () => {
      const errorResponse = { status: 400, statusText: 'Error on image updating' }
      imageServiceSpy.updateImageOrder.and.returnValue(throwError(() => errorResponse))
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

  describe('Page actions:', () => {
    beforeEach(() => {
      component.ngOnInit()
    })

    it('should have BACK navigation', () => {
      if (component.actions$) {
        component.actions$.subscribe((actions) => {
          const action = actions[0]
          action.actionCallback?.()

          expect(locationSpy.back).toHaveBeenCalled()
        })
      }
    })

    describe('Export:', () => {
      it('should call EXPORT: hide button if there are no items', () => {
        component['imageInfos'] = []
        component.isReordered = true

        component.actions$.subscribe((actions) => {
          const action = actions[1]

          expect(action.showCondition).toBeFalse()
        })
      })

      it('should call EXPORT: enabled button', () => {
        spyOn(component, 'onExport')
        component['imageInfos'] = imageInfos
        component.isReordered = false

        component.actions$.subscribe((actions) => {
          const action = actions[1]
          action.actionCallback?.()

          expect(action.showCondition).toBeTrue()
          expect(component.onExport).toHaveBeenCalled()
        })
      })
    })

    describe('Import:', () => {
      it('should call IMPORT: hide button on condition', () => {
        component.isReordered = true

        component.actions$.subscribe((actions) => {
          const action = actions[2]

          expect(action.showCondition).toBeFalse()
        })
      })

      it('should call IMPORT: enabled button', () => {
        spyOn(component, 'onImport')
        component.isReordered = false

        component.actions$.subscribe((actions) => {
          const action = actions[2]
          action.actionCallback?.()

          expect(action.showCondition).toBeTrue()
          expect(component.onImport).toHaveBeenCalled()
        })
      })
    })

    describe('Create:', () => {
      it('should call CREATE: hide button on conditions', () => {
        component.isReordered = true
        component['imageInfos'] = imageInfos

        component.actions$.subscribe((actions) => {
          const action = actions[3]

          expect(action.showCondition).toBeFalse()
        })
      })

      it('should call CREATE: hide button on conditions', () => {
        component.isReordered = false
        component['imageInfos'] = imageInfos
        component.maxImages = imageInfos.length

        component.actions$.subscribe((actions) => {
          const action = actions[3]

          expect(action.showCondition).toBeFalse()
        })
      })

      it('should call CREATE: enabled button', () => {
        spyOn(component, 'onOpenCreateDialog')
        component.isReordered = false

        component.actions$.subscribe((actions) => {
          const action = actions[3]
          action.actionCallback?.()

          expect(action.showCondition).toBeTrue()
          expect(component.onOpenCreateDialog).toHaveBeenCalled()
        })
      })
    })
  })

  describe('Reorder Cancel:', () => {
    it('should call REORDER: hide button on conditions', () => {
      component.isReordered = false
      component['imageInfos'] = imageInfos

      component.actions$.subscribe((actions) => {
        const action = actions[4]

        expect(action.showCondition).toBeFalse()
      })
    })

    it('should call REORDER: enabled button', () => {
      spyOn(component, 'onReload')
      component.isReordered = true

      component.actions$.subscribe((actions) => {
        const action = actions[4]
        action.actionCallback?.()

        expect(action.showCondition).toBeTrue()
        expect(component.onReload).toHaveBeenCalled()
      })
    })
  })

  describe('Reorder Save:', () => {
    it('should call REORDER: hide button on conditions', () => {
      component.isReordered = false
      component['imageInfos'] = imageInfos

      component.actions$.subscribe((actions) => {
        const action = actions[5]

        expect(action.showCondition).toBeFalse()
      })
    })

    it('should call REORDER: enabled button', () => {
      spyOn(component, 'onSaveOrder')
      component.isReordered = true

      component.actions$.subscribe((actions) => {
        const action = actions[5]
        action.actionCallback?.()

        expect(action.showCondition).toBeTrue()
        expect(component.onSaveOrder).toHaveBeenCalled()
      })
    })
  })
})
