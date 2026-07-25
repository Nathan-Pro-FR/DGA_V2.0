document.addEventListener("DOMContentLoaded", () => {
  const galleryGrid = document.getElementById("gallery-grid");
  const modal = document.getElementById("media-modal");
  const modalContent = modal ? modal.querySelector(".modal-content") : null;
  const modalClose = modal ? modal.querySelector(".modal-close") : null;

  if (!galleryGrid) return;

  // BUG CRITIQUE CORRIGÉ : xmlns contenait "[http://...](http://...)" au lieu
  // d'une URL de namespace valide. Un SVG avec un xmlns invalide n'est pas du
  // tout rendu par le navigateur : l'image de secours affichait une case vide,
  // pas le message "Media indisponible".
  const fallbackImage =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
        <rect width="1200" height="800" fill="#0d0d17"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              fill="#ec4899" font-size="44" font-family="Arial, sans-serif">
          Media indisponible
        </text>
      </svg>
    `);

  const videoExtensions = [".mp4", ".mov", ".webm", ".ogg", ".m4v", ".mkv"];

  const isVideo = (url) => {
    const clean = String(url).split("?")[0].toLowerCase();
    return videoExtensions.some((ext) => clean.endsWith(ext));
  };

  const renderMessage = (text) => {
    galleryGrid.innerHTML = `<p class="gallery-message">${text}</p>`;
  };

  const createMediaElement = (url) => {
    if (isVideo(url)) {
      const video = document.createElement("video");
      video.src = url;
      video.controls = true;
      video.preload = "metadata";
      video.playsInline = true;
      video.className = "gallery-media";
      video.onerror = () => {
        const img = document.createElement("img");
        img.src = fallbackImage;
        img.alt = "Video indisponible";
        img.loading = "lazy";
        img.className = "gallery-media";
        video.replaceWith(img);
      };
      return video;
    }

    const image = document.createElement("img");
    image.src = url;
    image.alt = "Media Discord";
    image.loading = "lazy";
    image.decoding = "async";
    image.className = "gallery-media";
    image.onerror = () => {
      // On désactive le handler après le premier échec : si l'image de secours
      // (data URI) venait elle-même à échouer, on évite une boucle infinie de
      // tentatives de chargement.
      image.onerror = null;
      image.src = fallbackImage;
      image.alt = "Image indisponible";
    };
    return image;
  };

  // BUG CORRIGÉ : clonedMedia = mediaElement.cloneNode(true) ne recopie jamais
  // les handlers assignés en JS (ex: mediaElement.onerror), seulement les
  // attributs HTML. La vidéo/image affichée dans la modale perdait donc son
  // fallback "media indisponible" en cas d'échec de chargement. On reconstruit
  // l'élément proprement au lieu de cloner.
  let lastFocusedElement = null;

  const openModalWithUrl = (url) => {
    if (!modal || !modalContent) return;

    // On coupe proprement toute vidéo déjà affichée avant de la remplacer :
    // sans ça, si l'utilisateur enchaîne les clics sur plusieurs cartes sans
    // fermer la modale, l'ancienne vidéo continue de jouer/télécharger en
    // arrière-plan (fuite mémoire / bande passante inutile).
    const previousVideo = modalContent.querySelector("video");
    if (previousVideo) {
      previousVideo.pause();
      previousVideo.removeAttribute("src");
      previousVideo.load();
    }
    modalContent.innerHTML = "";

    const modalMedia = createMediaElement(url);
    modalMedia.className = "modal-media";
    if (modalMedia.tagName === "VIDEO") {
      modalMedia.autoplay = true;
    }

    modalContent.appendChild(modalMedia);
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    lastFocusedElement = document.activeElement;
    if (modalClose) modalClose.focus();
  };

  const addMediaCard = (url) => {
    const card = document.createElement("div");
    card.className = "media-card";

    const mediaElement = createMediaElement(url);
    card.appendChild(mediaElement);
    galleryGrid.appendChild(card);

    mediaElement.addEventListener("click", () => openModalWithUrl(url));
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    if (modalContent) {
      const video = modalContent.querySelector("video");
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
      modalContent.innerHTML = "";
    }

    // Rend le focus clavier à l'élément qui a ouvert la modale (accessibilité).
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  };

  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.classList.contains("modal-content")) {
        closeModal();
      }
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.classList.contains("active")) {
      closeModal();
    }
  });

  const loadGallery = async () => {
    try {
      renderMessage("Chargement des medias...");
      const response = await fetch("donnees.json", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const urls = await response.json();

      if (!Array.isArray(urls)) {
        throw new Error("Format invalide: tableau d'URLs attendu.");
      }

      galleryGrid.innerHTML = "";

      if (urls.length === 0) {
        renderMessage("Aucun media disponible pour le moment.");
        return;
      }

      urls.forEach((url) => {
        if (typeof url === "string" && url.trim()) {
          addMediaCard(url.trim());
        }
      });

      if (galleryGrid.children.length === 0) {
        renderMessage("Aucun lien media valide n'a ete trouve.");
      }
    } catch (error) {
      console.error("Erreur de chargement de la galerie:", error);
      renderMessage("Impossible de charger la galerie pour le moment.");
    }
  };

  loadGallery();
});
