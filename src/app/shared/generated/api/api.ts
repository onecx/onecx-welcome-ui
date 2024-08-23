export * from './announcements.service';
import { AnnouncementsAPIService } from './announcements.service';
export * from './imagesInternal.service';
import { ImagesInternalAPIService } from './imagesInternal.service';
export const APIS = [AnnouncementsAPIService, ImagesInternalAPIService];
