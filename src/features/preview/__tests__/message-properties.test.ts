import { describe, expect, it } from 'vitest'
import { readMessageProperty } from '../message-properties'

describe('readMessageProperty', () => {
  it('reads normal message properties values', () => {
    const text = `doRegister=Register`
    expect(readMessageProperty(text, 'doRegister')).toBe('Register')
  })

  it('supports empty values without consuming the next line', () => {
    const text = `noAccount=
username=Username`
    expect(readMessageProperty(text, 'noAccount')).toBe('')
  })

  it('returns following properties independently', () => {
    const text = `noAccount=
username=Username`
    expect(readMessageProperty(text, 'username')).toBe('Username')
  })
})

