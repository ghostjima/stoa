// `size-adjust` is a CSS Fonts 5 font-face descriptor and is accepted by the
// FontFace constructor, but TypeScript's DOM library does not list it yet.
// Whether a browser honours it is measured in the panel and reported, not
// assumed here: this declaration only lets the descriptor be passed.
declare global {
  interface FontFaceDescriptors {
    sizeAdjust?: string;
  }
}

export {};
