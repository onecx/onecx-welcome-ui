import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, fakeAsync, TestBed, waitForAsync } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { TranslateModule, TranslateLoader } from '@ngx-translate/core'
import { AppStateService, createTranslateLoader, PortalMessageService } from '@onecx/portal-integration-angular'
import { of, throwError } from 'rxjs'
import { ImageDataResponse, ImagesInternalAPIService } from 'src/app/shared/generated'
import { WelcomeEditComponent } from '../welcome-edit/welcome-edit.component'
import { CardModule } from 'primeng/card'
import { ButtonModule } from 'primeng/button'
import { ImageDialogComponent } from './image-dialog/image-dialog.component'
import { DialogModule } from 'primeng/dialog'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'

describe('WelcomeEditComponent', () => {
  let component: WelcomeEditComponent
  let fixture: ComponentFixture<WelcomeEditComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', [
    'success',
    'error',
    'info',
    'warning'
  ])

  const apiServiceSpy = {
    getAllImageInfos: jasmine.createSpy('getAllImageInfos').and.returnValue(of([])),
    getImageById: jasmine.createSpy('getImageById').and.returnValue(of({})),
    deleteImageInfoById: jasmine.createSpy('deleteImageInfoById').and.returnValue(of({})),
    updateImageInfo: jasmine.createSpy('updateImageInfo').and.returnValue(of({})),
    updateImageOrder: jasmine.createSpy('updateImageOrder').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WelcomeEditComponent, ImageDialogComponent],
      imports: [
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        }),
        CardModule,
        ButtonModule,
        DialogModule,
        BrowserAnimationsModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: ImagesInternalAPIService, useValue: apiServiceSpy }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    msgServiceSpy.info.calls.reset()
    msgServiceSpy.warning.calls.reset()
    apiServiceSpy.getAllImageInfos.calls.reset()
    apiServiceSpy.getImageById.calls.reset()
    apiServiceSpy.deleteImageInfoById.calls.reset()
    apiServiceSpy.updateImageInfo.calls.reset()
    apiServiceSpy.updateImageOrder.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WelcomeEditComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })
  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should display image', () => {
    apiServiceSpy.getAllImageInfos.and.returnValue(
      of([
        { id: '123', imageId: '123', visible: true, position: '1' },
        { id: '1234', imageId: '1234', visible: true, position: '2' },
        { id: '12345', imageId: '12345', visible: true, position: '4' },
        { id: '123456', imageId: '123456', visible: true, position: '3' },
        { id: '1234567', imageId: '1234567', visible: true, position: '3' }
      ])
    )
    apiServiceSpy.getImageById.and.returnValues(
      of({ imageId: '123', imageData: new Blob() } as ImageDataResponse),
      of({ imageId: '1234', imageData: new Blob() } as ImageDataResponse),
      of({ imageId: '12345', imageData: new Blob() } as ImageDataResponse),
      of({ imageId: '123456', imageData: new Blob() } as ImageDataResponse),
      of({ imageId: '1234567', imageData: new Blob() } as ImageDataResponse)
    )

    component.ngOnInit()
    fixture.detectChanges()

    const dElement = fixture.debugElement
    const nElement = dElement.query(By.css('p-card'))
    expect(nElement).toBeTruthy()
  })

  it('should change visiblity on click', () => {
    apiServiceSpy.getAllImageInfos.and.returnValue(of([{ id: '123', imageId: '123', visible: true, position: '1' }]))
    apiServiceSpy.getImageById.and.returnValue(of({ imageId: '123', imageData: new Blob() } as ImageDataResponse))

    component.ngOnInit()
    fixture.detectChanges()

    const dElement = fixture.debugElement
    const button = dElement.queryAll(By.css('button'))[0]
    const icon = dElement.queryAll(By.css('.pi-eye'))[0]
    const iconSlash = dElement.queryAll(By.css('.pi-eye-slash'))[0]

    expect(icon).toBeTruthy()
    expect(iconSlash).toBeFalsy()

    apiServiceSpy.getAllImageInfos.calls.reset()
    apiServiceSpy.getImageById.calls.reset()
    apiServiceSpy.updateImageInfo.and.returnValue(of({}))
    apiServiceSpy.getAllImageInfos.and.returnValue(of([{ id: '123', imageId: '123', visible: false, position: '1' }]))
    apiServiceSpy.getImageById.and.returnValue(of({ imageId: '123', imageData: new Blob() } as ImageDataResponse))
    button.nativeElement.click({ id: '123', imageId: '123', visible: false, position: '1' })
    fixture.detectChanges()
    expect(apiServiceSpy.updateImageInfo).toHaveBeenCalled()
    const iconAfterUpdate = dElement.queryAll(By.css('.pi-eye'))[0]
    const iconSlashAfterUpdate = dElement.queryAll(By.css('.pi-eye-slash'))[0]

    expect(iconAfterUpdate).toBeFalsy()
    expect(iconSlashAfterUpdate).toBeTruthy()
  })

  it('should get deleted on click', () => {
    apiServiceSpy.getAllImageInfos.and.returnValue(
      of([
        { id: '123', imageId: '123', visible: true, position: '1' },
        { id: '124', imageId: '1234', visible: true, position: '2' }
      ])
    )
    apiServiceSpy.getImageById.and.returnValues(
      of({ imageId: '123', imageData: new Blob() } as ImageDataResponse),
      of({ imageId: '1234', imageData: new Blob() } as ImageDataResponse)
    )

    component.ngOnInit()
    fixture.detectChanges()

    const dElement = fixture.debugElement
    const deleteButton = dElement.queryAll(By.css('button'))[1]
    expect(deleteButton).toBeTruthy()
    const cardAmount = dElement.queryAll(By.css('.p-card')).length
    expect(cardAmount).toBe(2)
    apiServiceSpy.getAllImageInfos.calls.reset()
    apiServiceSpy.getImageById.calls.reset()
    apiServiceSpy.getAllImageInfos.and.returnValue(of([{ id: '124', imageId: '1234', visible: true, position: '2' }]))
    apiServiceSpy.getImageById.and.returnValue(of({ imageId: '1234', imageData: new Blob() } as ImageDataResponse))
    apiServiceSpy.deleteImageInfoById.and.returnValue(of({}))
    deleteButton.nativeElement.click('123')
    expect(apiServiceSpy.deleteImageInfoById).toHaveBeenCalled()
    fixture.detectChanges()
    const cardAmountAfterDelete = dElement.queryAll(By.css('.p-card')).length
    expect(cardAmountAfterDelete).toBe(1)
  })

  it('should open create dialog', fakeAsync(() => {
    const dElement = fixture.debugElement
    const openDialogButton = dElement.query(By.css('.addImageCard'))
    expect(openDialogButton).toBeTruthy()
    expect(component.displayImageDialog).toBeFalsy()
    openDialogButton.nativeElement.click()
    fixture.detectChanges()
    expect(component.displayImageDialog).toBeTruthy()

    const dialog = dElement.nativeElement.querySelector('p-dialog')
    expect(dialog.attributes.getNamedItem('ng-reflect-visible').value).toBeTruthy()
    const closeButton = dElement.query(By.css('.p-dialog-header-close'))
    closeButton.nativeElement.click()
    component.onCloseDialog(true)
    fixture.detectChanges()

    const dialogAfterChange = dElement.nativeElement.querySelector('p-dialog')
    expect(dialogAfterChange.attributes.getNamedItem('ng-reflect-visible').value).toBe('false')
  }))

  it('should swap image positions', () => {
    const dElement = fixture.debugElement

    apiServiceSpy.getAllImageInfos.and.returnValue(
      of([
        { id: '123', imageId: '123', visible: true, position: '1' },
        { id: '1234', imageId: '1234', visible: true, position: '2' }
      ])
    )
    apiServiceSpy.getImageById.and.returnValues(
      of({ imageId: '123', imageData: new Blob() } as ImageDataResponse),
      of({ imageId: '1234', imageData: new Blob() } as ImageDataResponse)
    )
    component.ngOnInit()
    fixture.detectChanges()
    let saveOrderButton = dElement.nativeElement.querySelector('.saveOrder')
    expect(saveOrderButton.attributes.getNamedItem('ng-reflect-disabled').value).toBeTruthy()
    component.swapElement(component.imageInfos, 0, 1)
    apiServiceSpy.updateImageOrder.and.returnValue(of({}))
    component.onSaveOrder()
    fixture.detectChanges()
    saveOrderButton = dElement.nativeElement.querySelector('.saveOrder')
    expect(saveOrderButton.attributes.getNamedItem('ng-reflect-disabled').value).toBe('false')
    expect(component.imageInfos[0].id).toEqual('1234')
    expect(component.imageInfos[0].position?.toString()).toBe('1')
  })

  it('should handle error when fetching imageinfos', () => {
    apiServiceSpy.getAllImageInfos.and.returnValue(throwError(() => new Error()))

    component.fetchImageInfos()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'GENERAL.IMAGES.NOT_FOUND' })
  })

  it('should handle error when fetching imageData', () => {
    apiServiceSpy.getImageById.and.returnValue(throwError(() => new Error()))
    component.imageInfos = [{ id: '123', imageId: '123', visible: true, position: '1' }]
    component.fetchImageData()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'GENERAL.IMAGES.NOT_FOUND' })
  })

  it('should handle error when deleting image', () => {
    apiServiceSpy.deleteImageInfoById.and.returnValue(throwError(() => new Error()))
    component.handleDelete('123')

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.ERROR' })
  })

  it('should handle error when updating visiblity', () => {
    apiServiceSpy.updateImageInfo.and.returnValue(throwError(() => new Error()))
    component.updateVisibility({ id: '123', imageId: '123', visible: true, position: '1' })

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.VISIBILITY.ERROR' })
  })
  it('should handle error when updating positions', () => {
    apiServiceSpy.updateImageOrder.and.returnValue(throwError(() => new Error()))
    component.onSaveOrder()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.REORDER.ERROR' })
  })
})
