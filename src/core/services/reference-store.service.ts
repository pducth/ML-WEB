import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map } from 'rxjs';
import { environment } from '../environment/environment';
import type { ReferenceStore } from '../models/reference-store.model';

@Injectable({ providedIn: 'root' })
export class ReferenceStoreService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/referenceStore`;

  getSnapshot() {
    return this.http.get<ReferenceStore[]>(this.endpoint).pipe(
      catchError(() => this.http.get<ReferenceStore[]>('/assets/reference-store.json')),
      map(([store]) => {
        if (!store) {
          throw new Error('The reference store dataset is empty.');
        }
        return store;
      }),
    );
  }
}
