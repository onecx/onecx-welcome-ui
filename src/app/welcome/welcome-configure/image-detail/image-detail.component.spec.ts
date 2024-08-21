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
import { ImagesInternalAPIService } from 'src/app/shared/generated'
import { ImageDetailComponent } from './image-detail.component'
import { OverlayPanelModule } from 'primeng/overlaypanel'
import { ButtonModule } from 'primeng/button'

describe('ImageDetailComponent', () => {
  let component: ImageDetailComponent
  let fixture: ComponentFixture<ImageDetailComponent>

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
      declarations: [ImageDetailComponent],
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
    fixture = TestBed.createComponent(ImageDetailComponent)
    component = fixture.componentInstance
    component.displayDetailDialog = true
    fixture.detectChanges()
  })
  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
