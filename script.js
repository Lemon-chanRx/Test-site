// Sparkle bubbles on the sea as the seagull dances
(function sprinkleSparkles() {
  const sea = document.querySelector('.sea');
  if (!sea) return;

  function makeSparkle() {
    const s = document.createElement('div');
    s.className = 'sparkle';
    const size = 2 + Math.random() * 4;
    Object.assign(s.style, {
      position: 'absolute',
      left: Math.random() * 100 + '%',
      top: Math.random() * 90 + '%',
      width: size + 'px',
      height: size + 'px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.9)',
      boxShadow: '0 0 6px rgba(255,255,255,0.9)',
      opacity: '0',
      transition: 'opacity 1.2s ease-in-out, transform 1.2s ease-in-out',
      pointerEvents: 'none',
    });
    sea.appendChild(s);

    requestAnimationFrame(() => {
      s.style.opacity = '1';
      s.style.transform = 'translateY(-6px)';
    });

    setTimeout(() => {
      s.style.opacity = '0';
      setTimeout(() => s.remove(), 1200);
    }, 900 + Math.random() * 800);
  }

  setInterval(makeSparkle, 220);
})();

// Click the seagull for a celebratory spin
document.addEventListener('click', (e) => {
  const seagull = document.querySelector('.seagull');
  if (!seagull) return;
  seagull.style.transition = 'transform 0.9s cubic-bezier(.2,.8,.2,1)';
  seagull.style.transform = (seagull.style.transform || '') + ' rotate(360deg)';
  setTimeout(() => {
    seagull.style.transition = '';
    seagull.style.transform = '';
  }, 900);
});
