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
}

/**
 * Ready to send: shrunk, and the location attempt is over. Location is optional:
 * if the user refuses it (or it is unavailable) the photo is sent without GPS.
 */
export const isSitePhotoReady = (photo: SitePhoto) =>
  photo.status !== 'locating' && !photo.preparing

