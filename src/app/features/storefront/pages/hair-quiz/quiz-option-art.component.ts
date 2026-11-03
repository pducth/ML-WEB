import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Questions whose answers are illustrated; every other quiz answer is a text-only card. */
export const QUIZ_ART_QUESTIONS: readonly string[] = ['hair_texture', 'hair_thickness'];

/** Supplied artwork per answer, keyed "<questionId>.<optionId>". Hair texture is drawn below in the same style. */
const QUIZ_OPTION_IMAGES: Record<string, string> = {
  'hair_thickness.fine': '/assets/quiz/thickness-fine.png',
  'hair_thickness.medium': '/assets/quiz/thickness-medium.png',
  'hair_thickness.thick': '/assets/quiz/thickness-thick.png',
};

/** Strand shapes for the texture circles; the strands run diagonally like the thickness artwork. */
const TEXTURE_STRANDS: Record<string, string> = {
  straight: 'M-46 0H46',
  wavy: 'M-46 0C-35 -12 -23 -12 -12 0S11 12 23 0S35 -12 46 0',
  curly: 'M-46 0C-40 -13 -30 -13 -28 -2S-18 12 -12 3S-2 -13 3 -3S12 11 17 2S27 -12 32 -2S41 10 46 0',
};
const STRAND_OFFSETS = [-27, -9, 9, 27];

/** Round illustration for one quiz answer: the supplied thickness artwork, or a matching hair-texture drawing. */
@Component({
  selector: 'app-quiz-option-art',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full h-full' },
  template: `
    @if (image(); as src) {
      <img [src]="src" alt="" class="w-full h-full object-contain" loading="lazy" />
    } @else {
      <svg viewBox="0 0 120 120" class="w-full h-full" aria-hidden="true" fill="none" stroke-linecap="round">
        <circle cx="60" cy="60" r="58" fill="#F4F0E6" />
        <circle cx="60" cy="60" r="50" fill="#0B4332" />
        <g transform="translate(60 60) rotate(-28)">
          @for (y of offsets; track y) {
            <path [attr.d]="strand()" [attr.transform]="'translate(0 ' + y + ')'" stroke="#FFFFFF" stroke-width="3.4" />
          }
        </g>
      </svg>
    }
  `,
})
export class QuizOptionArtComponent {
  readonly question = input.required<string>();
  readonly option = input.required<string>();

  readonly offsets = STRAND_OFFSETS;
  readonly image = computed(() => QUIZ_OPTION_IMAGES[`${this.question()}.${this.option()}`] ?? null);
  readonly strand = computed(() => TEXTURE_STRANDS[this.option()] ?? TEXTURE_STRANDS['straight']);
}
