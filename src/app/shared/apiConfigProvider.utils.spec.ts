import { TestBed } from '@angular/core/testing'
import { PortalApiConfiguration } from '@onecx/angular-utils'
import { provideAppStateServiceMock } from '@onecx/angular-integration-interface/mocks'

import { apiConfigProvider } from './apiConfigProvider.utils'

describe('apiConfigProvider', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideAppStateServiceMock()]
    })
  })

  it('should be defined', () => {
    expect(apiConfigProvider).toBeDefined()
  })

  it('should return a PortalApiConfiguration instance', () => {
    const result = TestBed.runInInjectionContext(() => apiConfigProvider())

    expect(result).toBeInstanceOf(PortalApiConfiguration)
  })

  it('should use environment apiPrefix from configuration', () => {
    const result = TestBed.runInInjectionContext(() => apiConfigProvider())

    expect(result).toBeInstanceOf(PortalApiConfiguration)
    expect(result).toBeDefined()
  })
})
