import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api-client'
import { submitClient } from '../data/api'
import {
  forgetPhotoUpload,
  uploadPhotoInBackground,
  waitForPhotoUpload,
} from './photo-upload'

const photo = (name = 'site.jpg') =>
  new File([new Uint8Array([0xff, 0xd8, 0xff])], name, { type: 'image/jpeg' })

const gps = {
  latitude: 11.55,
  longitude: 104.92,
  accuracy: 10,
  capturedAt: '2026-10-04T08:00:00.000Z',
}

afterEach(() => vi.restoreAllMocks())

describe('uploadPhotoInBackground', () => {
  it('uploads to <endpoint>/photos and gives the uploadId to Submit', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: { data: { uploadId: 'u'.repeat(32) } } })
    void uploadPhotoInBackground('p1', photo(), '/admin/submissions')
    expect(await waitForPhotoUpload('p1')).toBe('u'.repeat(32))
    expect(post.mock.calls[0][0]).toBe('/admin/submissions/photos')
    forgetPhotoUpload('p1')
    expect(await waitForPhotoUpload('p1')).toBeUndefined()
  })

  it('a failed upload resolves to undefined after one retry, so Submit sends the file', async () => {
    vi.useFakeTimers()
    const post = vi
      .spyOn(apiClient, 'post')
      .mockRejectedValue(new Error('offline'))
    const upload = uploadPhotoInBackground('p2', photo(), '/public/submissions')
    await vi.runAllTimersAsync()
    expect(await upload).toBeUndefined()
    expect(post).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe('submitClient', () => {
  it('sends uploaded photos by uploadId and the others as files, all with GPS', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: { data: { submissionNo: 'S-1' } } })
    await submitClient(
      {
        clientName: 'Test',
        phone: '012345678',
        provinceId: 'p',
        districtId: 'd',
        communeId: 'c',
        files: [],
        sitePhotos: [
          { photoId: 'a', file: photo('a.jpg'), gps, uploadId: 'x'.repeat(32) },
          { photoId: 'b', file: photo('b.jpg'), gps },
        ],
      },
      { idempotencyKey: 'key-12345678' }
    )
    const form = post.mock.calls[0][1] as FormData
    expect(JSON.parse(form.get('stagedPhotos') as string)).toEqual([
      { photoId: 'a', uploadId: 'x'.repeat(32) },
    ])
    expect(form.get('sitePhotos[a]')).toBeNull()
    expect((form.get('sitePhotos[b]') as File).name).toBe('b.jpg')
    expect(
      JSON.parse(form.get('sitePhotoMeta') as string).map(
        (m: { photoId: string }) => m.photoId
      )
    ).toEqual(['a', 'b'])
  })
})
