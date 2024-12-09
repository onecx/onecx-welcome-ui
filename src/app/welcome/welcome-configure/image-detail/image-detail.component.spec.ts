import { NO_ERRORS_SCHEMA } from '@angular/core'
import { provideHttpClient, HttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, waitForAsync, TestBed } from '@angular/core/testing'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { By } from '@angular/platform-browser'

import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { TranslateModule, TranslateLoader } from '@ngx-translate/core'

import { DialogModule } from 'primeng/dialog'
import { InputSwitchModule } from 'primeng/inputswitch'
import { OverlayPanelModule } from 'primeng/overlaypanel'
import { ButtonModule } from 'primeng/button'

import { createTranslateLoader, AppStateService } from '@onecx/portal-integration-angular'

import { ImageDetailComponent } from './image-detail.component'
import { ImageInfo } from 'src/app/shared/generated'

describe('ImageDetailComponent', () => {
  let component: ImageDetailComponent
  let fixture: ComponentFixture<ImageDetailComponent>

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
        InputSwitchModule,
        OverlayPanelModule,
        ReactiveFormsModule,
        ButtonModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents()
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

  describe('buildImageSrc', () => {
    it('should return the base64 image source if the image is found', () => {
      const imageInfo = { imageId: '1', url: 'http://example.com/image1.png' } as ImageInfo
      const result = component.buildImageSrc(imageInfo)
      expect(result).toBe('http://example.com/image1.png')
    })

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
  })
})
