import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { TranslateModule, TranslateLoader } from '@ngx-translate/core'
import { AppStateService, createTranslateLoader, PortalMessageService } from '@onecx/portal-integration-angular'
import { of } from 'rxjs'
import { ImageDataResponse, ImagesInternalAPIService } from 'src/app/shared/generated'
import { WelcomeEditComponent } from '../welcome-edit/welcome-edit.component'
import { CardModule } from 'primeng/card'
import { ButtonModule } from 'primeng/button'

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
      declarations: [WelcomeEditComponent],
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
        ButtonModule
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
        { id: '1234', imageId: '1234', visible: true, position: '2' }
      ])
    )
    apiServiceSpy.getImageById.and.returnValue(of({ imageId: '123', imageData: new Blob() } as ImageDataResponse))

    component.ngOnInit()
    fixture.detectChanges()

    const dElement = fixture.debugElement
    const nElement = dElement.query(By.css('p-card'))
    expect(nElement).toBeTruthy()
  })

  it('should change visiblity on click', () => {})

  it('should get deleted on click', () => {})
  it('should open create dialog', () => {})
})
