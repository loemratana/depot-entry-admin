import { describe, expect, it } from 'vitest'
import {
  locationField,
  locationNameKey,
  pickedLocationId,
  toTypedLocation,
  typedLocationName,
} from './typed-location'

describe('typed location values', () => {
  it('round-trips a typed name, collapsing spaces', () => {
    const value = toTypedLocation('  ឃុំ   ថ្មី ')
    expect(typedLocationName(value)).toBe('ឃុំ ថ្មី')
    expect(pickedLocationId(value)).toBeUndefined()
  })

  it('treats anything else as a picked id', () => {
    expect(typedLocationName('665f1c2e9b1d4a0012345678')).toBeNull()
    expect(pickedLocationId('665f1c2e9b1d4a0012345678')).toBe(
      '665f1c2e9b1d4a0012345678'
    )
    expect(pickedLocationId('')).toBeUndefined()
  })

  it('maps to the API field for picked and typed values', () => {
    expect(locationField('district', 'abc123')).toEqual({
      field: 'districtId',
      value: 'abc123',
    })
    expect(locationField('commune', toTypedLocation('ឃុំថ្មី'))).toEqual({
      field: 'communeName',
      value: 'ឃុំថ្មី',
    })
  })

  it('compares names like the backend', () => {
    expect(locationNameKey(' Test  COMMUNE one ')).toBe(
      locationNameKey('testcommuneone')
    )
  })
})
