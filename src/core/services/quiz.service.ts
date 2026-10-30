import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../environment/environment';
import type { QuizQuestion } from '../models/quiz-question.model';
import type { QuizResult } from '../models/quiz-result.model';

@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly http = inject(HttpClient);
  private readonly questionsEndpoint = `${environment.apiUrl}/quizQuestions`;
  private readonly resultsEndpoint = `${environment.apiUrl}/quizResults`;

  getQuestions() {
    return this.http.get<QuizQuestion[]>(this.questionsEndpoint);
  }

  submitAnswers(userId: string, answers: Record<string, string>) {
    return this.http.post<QuizResult>(this.resultsEndpoint, {
      userId,
      answers,
      submittedAt: new Date().toISOString(),
    });
  }
}
