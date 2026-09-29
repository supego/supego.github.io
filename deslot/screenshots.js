/* A dependency-free, manually controlled gallery. */
(() => {
  const gallery = document.querySelector('[data-screenshot-gallery]');
  if (!gallery) return;

  const thumbnails = [...gallery.querySelectorAll('[data-screenshot]')];
  const stage = gallery.querySelector('.screenshot-stage');
  const photo = gallery.querySelector('#screenshot-photo');
  const caption = gallery.querySelector('.screenshot-title');
  const fullSize = gallery.querySelector('.screenshot-full-size');
  const status = gallery.querySelector('[data-screenshot-status]');
  const counter = document.querySelector('[data-screenshot-count]');
  const progress = gallery.querySelector('.screenshot-position-fill');
  const rail = gallery.querySelector('.screenshot-thumbnails');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let requestedIndex = 0;
  let requestNumber = 0;
  let pointerStart = null;

  async function showScreenshot(index, focusThumbnail = false) {
    requestedIndex = (index + thumbnails.length) % thumbnails.length;
    const selectedIndex = requestedIndex;
    const request = ++requestNumber;
    const thumbnail = thumbnails[selectedIndex];
    const nextPhoto = new Image();
    nextPhoto.src = thumbnail.dataset.src;
    stage.setAttribute('aria-busy', 'true');

    try {
      await nextPhoto.decode();
    } catch {
      if (request === requestNumber) {
        stage.setAttribute('aria-busy', 'false');
        status.textContent = 'This screenshot could not load. Please try choosing it again.';
      }
      return;
    }
    if (request !== requestNumber) return;

    photo.src = nextPhoto.src;
    photo.alt = thumbnail.dataset.alt;
    caption.textContent = thumbnail.dataset.title;
    fullSize.href = thumbnail.dataset.src;
    fullSize.setAttribute('aria-label', `Open full-size screenshot: ${thumbnail.dataset.title} (opens in a new tab)`);
    counter.textContent = `${String(selectedIndex + 1).padStart(2, '0')} / ${String(thumbnails.length).padStart(2, '0')}`;
    progress.style.width = `${((selectedIndex + 1) / thumbnails.length) * 100}%`;
    thumbnails.forEach((button, buttonIndex) => button.setAttribute('aria-pressed', String(buttonIndex === selectedIndex)));
    status.textContent = `Screenshot ${selectedIndex + 1} of ${thumbnails.length}: ${thumbnail.dataset.title}.`;
    stage.setAttribute('aria-busy', 'false');

    if (!reducedMotion.matches && photo.animate) {
      photo.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
    }
    if (focusThumbnail) thumbnail.focus({ preventScroll: true });
    if (rail.scrollWidth > rail.clientWidth) {
      const railBounds = rail.getBoundingClientRect();
      const thumbBounds = thumbnail.getBoundingClientRect();
      if (thumbBounds.left < railBounds.left || thumbBounds.right > railBounds.right) {
        rail.scrollTo({
          left: rail.scrollLeft + thumbBounds.left - railBounds.left - (rail.clientWidth - thumbnail.clientWidth) / 2,
          behavior: reducedMotion.matches ? 'instant' : 'smooth',
        });
      }
    }
  }

  thumbnails.forEach((thumbnail, index) => thumbnail.addEventListener('click', () => showScreenshot(index)));
  gallery.querySelector('[data-screenshot-previous]').addEventListener('click', () => showScreenshot(requestedIndex - 1));
  gallery.querySelector('[data-screenshot-next]').addEventListener('click', () => showScreenshot(requestedIndex + 1));

  gallery.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    let nextIndex;
    switch (event.key) {
      case 'ArrowLeft': nextIndex = requestedIndex - 1; break;
      case 'ArrowRight': nextIndex = requestedIndex + 1; break;
      case 'Home': nextIndex = 0; break;
      case 'End': nextIndex = thumbnails.length - 1; break;
      default: return;
    }
    event.preventDefault();
    showScreenshot(nextIndex, Boolean(event.target.closest('[data-screenshot]')));
  });

  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' || event.target.closest('button, a')) return;
    pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  stage.addEventListener('pointerup', (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const distanceX = event.clientX - pointerStart.x;
    const distanceY = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(distanceX) > 50 && Math.abs(distanceX) > Math.abs(distanceY)) {
      showScreenshot(requestedIndex + (distanceX < 0 ? 1 : -1));
    }
  });
  stage.addEventListener('pointercancel', () => { pointerStart = null; });
})();
