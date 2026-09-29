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

/** Ready to send: shrunk and located */
export const isSitePhotoReady = (photo: SitePhoto) =>
  photo.status === 'ready' && !!photo.gps && !photo.preparing
