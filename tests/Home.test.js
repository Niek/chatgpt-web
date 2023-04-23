import { render } from '@testing-library/svelte'
import { it, describe, expect } from 'vitest'
import Home from '../src/lib/Home.svelte'

describe('Home', () => {
  it('should render without crash', () => {
    const result = render(Home)
    expect(result.component).toBeDefined()
  })
})
