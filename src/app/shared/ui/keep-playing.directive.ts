import { Directive, ElementRef, NgZone, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Keeps a muted background video moving. Browsers pause or stall such videos when the tab is hidden,
 * the network hiccups or the page is restored from cache; this nudges it to play again, and rests it while off screen.
 */
@Directive({ selector: 'video[appKeepPlaying]', standalone: true })
export class KeepPlayingDirective implements OnInit, OnDestroy {
  private readonly video = inject<ElementRef<HTMLVideoElement>>(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private visible = true;
  private observer?: IntersectionObserver;
  private timer?: ReturnType<typeof setInterval>;
  private lastTime = -1;

  private readonly resume = () => {
    if (!this.visible || document.hidden || !this.video.paused) return;
    void this.video.play().catch(() => undefined);
  };
  private readonly onVisibility = () => this.resume();

  ngOnInit(): void {
    this.video.muted = true;
    this.zone.runOutsideAngular(() => {
      this.video.addEventListener('pause', this.resume);
      this.video.addEventListener('stalled', this.resume);
      this.video.addEventListener('suspend', this.resume);
      this.video.addEventListener('canplay', this.resume);
      document.addEventListener('visibilitychange', this.onVisibility);
      window.addEventListener('pageshow', this.onVisibility);
      this.observer = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible) this.resume();
        else this.video.pause();
      });
      this.observer.observe(this.video);
      // A video that claims to play but has not moved for a few seconds is frozen: reload it from where it stopped.
      this.timer = setInterval(() => {
        if (!this.visible || document.hidden || this.video.paused || this.video.ended) return;
        if (this.video.currentTime === this.lastTime) {
          const at = this.video.currentTime;
          this.video.load();
          this.video.currentTime = at;
          this.resume();
        }
        this.lastTime = this.video.currentTime;
      }, 4000);
    });
  }

  ngOnDestroy(): void {
    this.video.removeEventListener('pause', this.resume);
    this.video.removeEventListener('stalled', this.resume);
    this.video.removeEventListener('suspend', this.resume);
    this.video.removeEventListener('canplay', this.resume);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('pageshow', this.onVisibility);
    this.observer?.disconnect();
    clearInterval(this.timer);
  }
}
