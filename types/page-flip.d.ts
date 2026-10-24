// У page-flip 2.0.7 нет своих типов. Описано только то, чем пользуется читалка.
declare module 'page-flip/dist/js/page-flip.module.js' {
  export type Orientation = 'portrait' | 'landscape';

  export interface FlipSettings {
    width: number;
    height: number;
    size?: 'fixed' | 'stretch';
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    showCover?: boolean;
    usePortrait?: boolean;
    autoSize?: boolean;
    drawShadow?: boolean;
    maxShadowOpacity?: number;
    flippingTime?: number;
    startPage?: number;
    mobileScrollSupport?: boolean;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    swipeDistance?: number;
  }

  export interface FlipEvent<T = unknown> {
    data: T;
    object: PageFlip;
  }

  export class PageFlip {
    constructor(root: HTMLElement, settings: FlipSettings);
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    flipNext(corner?: 'top' | 'bottom'): void;
    flipPrev(corner?: 'top' | 'bottom'): void;
    flip(page: number, corner?: 'top' | 'bottom'): void;
    turnToPage(page: number): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): Orientation;
    update(): void;
    destroy(): void;
    on(event: 'flip', cb: (e: FlipEvent<number>) => void): PageFlip;
    on(event: 'changeOrientation', cb: (e: FlipEvent<Orientation>) => void): PageFlip;
    on(event: 'init' | 'update', cb: (e: FlipEvent<{ page: number; mode: Orientation }>) => void): PageFlip;
    on(event: 'changeState', cb: (e: FlipEvent<string>) => void): PageFlip;
  }
}
