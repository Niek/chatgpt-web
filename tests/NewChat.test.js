import { render } from '@testing-library/svelte'
import { it, describe, expect } from 'vitest'
import NewChat from '../src/lib/NewChat.svelte'

describe('NewChat', () => {
  it('should render without crash', () => {
    const result = render(NewChat)
    expect(result.component).toBeDefined()
  })
})
