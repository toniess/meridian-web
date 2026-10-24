// Сборка legacy — та же библиотека для браузеров постарше; типы у неё общие с основной
declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  export * from 'pdfjs-dist';
}
