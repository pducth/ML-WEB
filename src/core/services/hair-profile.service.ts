import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../environment/environment';
import type { HairProfile } from '../models/hair-profile.model';

@Injectable({ providedIn: 'root' })
export class HairProfileService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/hairProfiles`;

  getForUser(userId: string) {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<HairProfile[]>(this.endpoint, { params });
  }

  save(profile: Omit<HairProfile, 'id'> & { id?: string }) {
    if (profile.id) {
      const { id, ...changes } = profile;
      return this.http.put<HairProfile>(`${this.endpoint}/${encodeURIComponent(id)}`, changes);
    }

    return this.http.post<HairProfile>(this.endpoint, profile);
  }
}
