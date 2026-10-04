import { type GpsErrorCode, type GpsReading } from './geolocation'

/** One site photo with its own id and its own GPS reading */
export type SitePhoto = {
  /** Client-generated; the backend matches GPS to the photo by this id */
  photoId: string
  file: File
  status: 'locating' | 'ready' | 'failed'
  /** Still being shrunk on the device before upload */
  preparing?: boolean
  gps?: GpsReading
  error?: GpsErrorCode
  /** Uploading in the background (Submit waits for it) */
  uploading?: boolean
  /** Set once uploaded in the background; Submit then sends only this id */
  uploadId?: string
}

/**
 * Ready for Submit: shrunk, and the first location attempt is over. A photo still
 * without GPS gets the current location on Submit; the form is not sent without it.
 */
export const isSitePhotoReady = (photo: SitePhoto) =>
  photo.status !== 'locating' && !photo.preparing
