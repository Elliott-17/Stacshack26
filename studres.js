const iframe = document.createElement("iframe");
iframe.src = "https://www.youtube.com/embed/RNaEo6Zooww?autoplay=1&mute=1";
//                                              ^^^^^^^ /embed/ not /watch?v=
iframe.allow = "autoplay; encrypted-media";
iframe.style.cssText = `
  position: fixed;
  bottom: 0;
  right: 0;
  width: 50%;
  height: 100%;
  border: none;
  z-index: 99999;
  border-radius: 8px 0 0 0;
`;
document.body.appendChild(iframe);