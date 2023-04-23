import { render } from '@testing-library/svelte'
import { it, describe, expect } from 'vitest'
import App from '../src/App.svelte'

describe('App', () => {
  it('should render without crash', () => {
    const result = render(App)
    expect(result.component).toBeDefined()
  })
})
