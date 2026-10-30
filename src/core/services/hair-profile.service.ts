import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { environment } from '../environment/environment';
import type { HairProfile } from '../models/hair-profile.model';

@Injectable({ providedIn: 'root' })
export class HairProfileService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/hairProfiles`;

  getForUser(userId: string) {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<HairProfile[]>(this.endpoint, { params }).pipe(
      catchError(() =>
        this.http
          .get<HairProfile[]>('/assets/mock-hair-profiles.json')
          .pipe(map((profiles) => profiles.filter((p) => p.userId === userId || !p.userId))),
      ),
    );
  }

  save(profile: Omit<HairProfile, 'id'> & { id?: string }) {
    if (profile.id) {
      const { id, ...changes } = profile;
      return this.http
        .put<HairProfile>(`${this.endpoint}/${encodeURIComponent(id)}`, changes)
        .pipe(catchError(() => of({ id, ...changes } as HairProfile)));
    }

    return this.http.post<HairProfile>(this.endpoint, profile).pipe(
      catchError(() => {
        const created: HairProfile = { ...profile, id: `hair-profile-${Date.now()}` } as HairProfile;
        return of(created);
      }),
    );
  }
}
