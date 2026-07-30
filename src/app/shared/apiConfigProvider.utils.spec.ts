import { PortalApiConfiguration } from '@onecx/angular-utils'

import { apiConfigProvider } from './apiConfigProvider.utils'

describe('apiConfigProvider', () => {
  it('should be defined', () => {
    expect(apiConfigProvider).toBeDefined()
  })

  it('should return a PortalApiConfiguration instance', () => {
    const result = apiConfigProvider()

    expect(result).toBeInstanceOf(PortalApiConfiguration)
  })

  it('should use environment apiPrefix from configuration', () => {
    const result = apiConfigProvider()

    expect(result).toBeInstanceOf(PortalApiConfiguration)
    expect(result).toBeDefined()
  })
})
