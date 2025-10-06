(function () {
  "use strict";

  const CUSTOM_BEATS_KEY = "beatsAuth:customBeats";

  const baseCatalog = [
    {
      id: "exotica",
      title: "Ex&oacute;tica",
      genre: "reggaeton",
      mood: "Reggaeton - 74 BPM",
      price: 20,
      license: "Standard",
      cover: "assets/img/beat1.webp",
      audio: "assets/audio/neon-nights-preview.mp3",
      releaseDate: "2025-09-05",
      files: ["MP3 HQ", "WAV"]
    },
    {
      id: "under-pleasure",
      title: "Under Pleasure",
      genre: "trap",
      mood: "Trap atmosf&eacute;rico - 136 BPM",
      price: 35,
      license: "Premium",
      cover: "assets/img/beat2.webp",
      audio: "assets/audio/under-pleasure-preview.mp3",
      releaseDate: "2025-08-18",
      files: ["MP3 HQ", "WAV", "STEMS"]
    },
    {
      id: "dreaming",
      title: "Dreaming",
      genre: "rnb",
      mood: "R&amp;B soulful - 92 BPM",
      price: 28,
      license: "Standard",
      cover: "assets/img/beat3.webp",
      audio: "assets/audio/dreaming-preview.mp3",
      releaseDate: "2025-07-22",
      files: ["MP3 HQ", "WAV"]
    },
    {
      id: "rappers-3",
      title: "Rappers 3",
      genre: "rap",
      mood: "Rap boom bap - 88 BPM",
      price: 24,
      license: "Premium",
      cover: "assets/img/beat4.webp",
      audio: "assets/audio/rappers-3-preview.mp3",
      releaseDate: "2025-06-30",
      files: ["MP3 HQ", "WAV", "STEMS"]
    },
    {
      id: "night-shift",
      title: "Night Shift",
      genre: "drill",
      mood: "Drill oscuro - 142 BPM",
      price: 48,
      license: "Exclusiva",
      cover: "assets/img/beat1.webp",
      audio: "assets/audio/night-shift-preview.mp3",
      releaseDate: "2025-09-22",
      files: ["MP3 HQ", "WAV", "STEMS", "Trackouts"]
    },
    {
      id: "velvet-lights",
      title: "Velvet Lights",
      genre: "rnb",
      mood: "R&amp;B suave - 100 BPM",
      price: 32,
      license: "Premium",
      cover: "assets/img/beat2.webp",
      audio: "assets/audio/velvet-lights-preview.mp3",
      releaseDate: "2025-05-14",
      files: ["MP3 HQ", "WAV", "STEMS"]
    },
    {
      id: "golden-hour",
      title: "Golden Hour",
      genre: "afrobeat",
      mood: "Afrobeat - 110 BPM",
      price: 40,
      license: "Standard",
      cover: "assets/img/beat3.webp",
      audio: "assets/audio/golden-hour-preview.mp3",
      releaseDate: "2025-08-02",
      files: ["MP3 HQ", "WAV"]
    },
    {
      id: "skyline",
      title: "Skyline",
      genre: "trap",
      mood: "Trap mel&oacute;dico - 150 BPM",
      price: 55,
      license: "Exclusiva",
      cover: "assets/img/beat4.webp",
      audio: "assets/audio/skyline-preview.mp3",
      releaseDate: "2025-04-08",
      files: ["MP3 HQ", "WAV", "STEMS", "Trackouts"]
    }
  ].map((beat) => {
    const files = Array.isArray(beat.files) ? beat.files : [];
    const licenseName = beat.license || "Standard";

    return {
      ...beat,
      preview: beat.audio,
      previewName: beat.audio ? `${beat.id}-preview.mp3` : "",
      previewType: "audio/mpeg",
      audioType: "audio/mpeg",
      licenses: [
        {
          id: `${beat.id}-${licenseName.toLowerCase()}`,
          name: licenseName,
          price: beat.price,
          files,
          package: "",
          packageName: ""
        }
      ]
    };
  });

  let beatsCatalog = baseCatalog.slice();

  const selectors = {
    container: document.getElementById("beatsContainer"),
    genre: document.getElementById("genreFilter"),
    price: document.getElementById("priceFilter"),
    date: document.getElementById("dateFilter"),
    sort: document.getElementById("sortFilter"),
    emptyMessage: document.getElementById("emptyCatalogMessage"),
    form: document.getElementById("catalogFilters")
  };

  const parseFiles = (value) => {
    if (!value) {
      return [];
    }

    return String(value)
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const escapeAttribute = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const normaliseLicense = (
    license,
    fallbackName,
    fallbackPrice,
    fallbackFiles = []
  ) => {
    if (!license || typeof license !== "object") {
      if (!fallbackName) {
        return null;
      }

      const price = Number.parseFloat(fallbackPrice);
      if (!Number.isFinite(price) || price <= 0) {
        return null;
      }

      const files = Array.isArray(fallbackFiles)
        ? fallbackFiles
        : parseFiles(fallbackFiles);

      return {
        id: fallbackName.toLowerCase(),
        name: fallbackName,
        price: Number(price.toFixed(2)),
        files,
        package: "",
        packageName: ""
      };
    }

    const name = license.name || fallbackName || license.id || "Standard";
    const price = Number.parseFloat(license.price);
    if (!name || !Number.isFinite(price) || price <= 0) {
      return null;
    }

    const files = Array.isArray(license.files)
      ? license.files
      : parseFiles(license.files);

    return {
      id: license.id || name.toLowerCase(),
      name,
      price: Number(price.toFixed(2)),
      files,
      package: license.package || "",
      packageName: license.packageName || ""
    };
  };

  const normaliseBeat = (rawBeat) => {
    if (!rawBeat || typeof rawBeat !== "object") {
      return null;
    }

    const baseFiles = Array.isArray(rawBeat.files)
      ? rawBeat.files
      : parseFiles(rawBeat.files);
    const fallbackLicenseName = rawBeat.license || "Standard";
    const fallbackPrice = rawBeat.price;

    const rawLicenses = Array.isArray(rawBeat.licenses)
      ? rawBeat.licenses
      : [];

    const licenses = rawLicenses
      .map((entry) =>
        normaliseLicense(entry, fallbackLicenseName, fallbackPrice, baseFiles)
      )
      .filter(Boolean);

    if (!licenses.length) {
      const fallback = normaliseLicense(
        null,
        fallbackLicenseName,
        fallbackPrice,
        baseFiles
      );
      if (fallback) {
        licenses.push(fallback);
      }
    }

    const defaultLicense = licenses[0] || null;
    const combinedFiles = Array.from(
      new Set([...(baseFiles || []), ...(defaultLicense?.files || [])])
    );
    const preview = rawBeat.preview || rawBeat.audio || "";

    return {
      ...rawBeat,
      price: defaultLicense?.price || rawBeat.price || 0,
      license: defaultLicense?.name || fallbackLicenseName,
      licenses,
      files: combinedFiles,
      preview,
      previewType: rawBeat.previewType || rawBeat.audioType || "",
      previewName: rawBeat.previewName || rawBeat.audioName || "",
      audio: preview,
      audioType: rawBeat.previewType || rawBeat.audioType || "",
      cover: rawBeat.cover || "assets/img/beat1.webp",
      mood:
        rawBeat.mood ||
        `${(rawBeat.genre || "personalizado").charAt(0).toUpperCase()}${(
          rawBeat.genre || "personalizado"
        ).slice(1)} · Beat personalizado`,
      releaseDate: rawBeat.releaseDate || new Date().toISOString()
    };
  };

  if (!selectors.container || !selectors.form) {
    return;
  }

  const safeJSONParse = (value, fallback) => {
    if (!value) {
      return fallback;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  };

  const loadStoredBeats = () => {
    const stored = safeJSONParse(localStorage.getItem(CUSTOM_BEATS_KEY), []);
    if (!Array.isArray(stored)) {
      return [];
    }

    return stored
      .map((beat) => normaliseBeat(beat))
      .filter((beat) => Boolean(beat));
  };

  const refreshCatalogSource = (customBeats = null) => {
    const beats = Array.isArray(customBeats) ? customBeats : loadStoredBeats();
    beatsCatalog = [...baseCatalog, ...beats];
  };

  const formatDate = (isoDate) => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return isoDate;
    }

    try {
      return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(date);
    } catch (error) {
      return date.toLocaleDateString();
    }
  };

  const createBeatCard = (beat) => {
    const article = document.createElement("article");
    article.className = "beat-card";
    article.dataset.genre = beat.genre;
    article.dataset.price = String(beat.price);
    article.dataset.date = beat.releaseDate;
    article.dataset.license = (beat.license || "licencia").toLowerCase();
    article.dataset.itemIdBase = beat.id;
    article.dataset.itemId = beat.id;

    const licenses = Array.isArray(beat.licenses) ? beat.licenses : [];
    const defaultLicense = licenses[0] || null;
    const files = Array.isArray(beat.files) ? beat.files : [];
    const filesDefaultText = files.length
      ? `Incluye: ${files.join(", ")}`
      : "Archivos sujetos a la licencia seleccionada.";
    const previewSource = beat.preview || beat.audio || "";
    const previewType = beat.previewType || beat.audioType || "audio/mpeg";

    const licenseOptionsMarkup = licenses
      .map((license, index) => {
        const optionId = license.id || `licencia-${index}`;
        const filesAttribute = escapeAttribute(
          JSON.stringify(Array.isArray(license.files) ? license.files : [])
        );
        return `<option value="${optionId}" data-license-price="${license.price}" data-license-name="${escapeAttribute(
          license.name
        )}" data-license-files="${filesAttribute}">${license.name} - ${license.price} USD</option>`;
      })
      .join("\n");

    const offerMarkup = beat.offer
      ? `  <p class="beat-offer">${beat.offer}</p>`
      : "";

    article.innerHTML = [
      `<img src="${beat.cover}" alt="Portada del beat ${beat.title}" class="beat-cover" />`,
      '<div class="beat-info">',
      `  <h3>${beat.title}</h3>`,
      `  <p class="beat-genre">${beat.mood}</p>`,
      `  <p class="beat-files" data-license-files-target data-default-text="${escapeAttribute(
        filesDefaultText
      )}">${filesDefaultText}</p>`,
      previewSource
        ? [
            '  <audio controls preload="none" class="beat-player">',
            `    <source src="${previewSource}" type="${previewType}" />`,
            "    Tu navegador no soporta la reproducci&oacute;n de audio.",
            "  </audio>"
          ].join("\n")
        : "",
      '  <div class="beat-meta">',
      `    <span class="beat-price" data-license-price-target>${defaultLicense?.price || beat.price} USD</span>`,
      `    <span class="beat-license" data-license-label-target>Licencia ${defaultLicense?.name || beat.license}</span>`,
      "  </div>",
      licenseOptionsMarkup
        ? [
            '  <div class="beat-license-control">',
            `    <label class="beat-license-control__label" for="license-${beat.id}">Licencia</label>`,
            `    <select class="beat-license-control__select" id="license-${beat.id}" data-license-selector data-beat-id="${beat.id}">`,
            licenseOptionsMarkup,
            "    </select>",
            "  </div>"
          ].join("\n")
        : "",
      offerMarkup,
      `  <p class="beat-date">Subido el ${formatDate(beat.releaseDate)}</p>`,
      `  <button class="btn tertiary" type="button" data-add-to-cart data-item-id="${beat.id}" data-item-type="beat" data-item-price="${defaultLicense?.price || beat.price}" data-item-cover="${beat.cover}">Agregar al carrito</button>`,
      "</div>"
    ]
      .filter(Boolean)
      .join("\n");

    return article;
  };

  const attachAudioGuards = () => {
    const players = Array.from(document.querySelectorAll(".beat-player"));
    players.forEach((player) => {
      player.addEventListener("play", () => {
        players.forEach((other) => {
          if (other !== player) {
            other.pause();
          }
        });
      });
    });
  };

  const toggleEmptyState = (shouldShow) => {
    if (!selectors.emptyMessage) {
      return;
    }
    selectors.emptyMessage.classList.toggle("is-hidden", !shouldShow);
  };

  const sortBeats = (items, sortOption) => {
    const sorted = [...items];
    switch (sortOption) {
      case "oldest":
        return sorted.sort(
          (a, b) => new Date(a.releaseDate) - new Date(b.releaseDate)
        );
      case "lower-price":
        return sorted.sort((a, b) => a.price - b.price);
      case "higher-price":
        return sorted.sort((a, b) => b.price - a.price);
      case "newest":
      default:
        return sorted.sort(
          (a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)
        );
    }
  };

  const filterBeats = () => {
    const genreValue = selectors.genre ? selectors.genre.value : "all";
    const priceValue = selectors.price ? selectors.price.value : "all";
    const dateValue = selectors.date ? selectors.date.value : "all";
    const sortValue = selectors.sort ? selectors.sort.value : "newest";

    const filtered = beatsCatalog.filter((beat) => {
      const matchesGenre = genreValue === "all" || beat.genre === genreValue;

      let matchesPrice = true;
      if (priceValue === "low") {
        matchesPrice = beat.price <= 25;
      } else if (priceValue === "mid") {
        matchesPrice = beat.price > 25 && beat.price <= 45;
      } else if (priceValue === "high") {
        matchesPrice = beat.price > 45;
      }

      let matchesDate = true;
      if (dateValue !== "all") {
        const days = Number.parseInt(dateValue, 10);
        const now = Date.now();
        const release = new Date(beat.releaseDate).getTime();
        if (!Number.isNaN(days) && !Number.isNaN(release)) {
          const differenceInDays = (now - release) / (1000 * 60 * 60 * 24);
          matchesDate = differenceInDays >= 0 && differenceInDays <= days;
        }
      }

      return matchesGenre && matchesPrice && matchesDate;
    });

    const sorted = sortBeats(filtered, sortValue);

    selectors.container.innerHTML = "";
    if (!sorted.length) {
      toggleEmptyState(true);
      document.dispatchEvent(new CustomEvent("cart:beats-updated"));
      return;
    }

    toggleEmptyState(false);

    const fragment = document.createDocumentFragment();
    sorted.forEach((beat) => {
      fragment.appendChild(createBeatCard(beat));
    });

    selectors.container.appendChild(fragment);
    attachAudioGuards();
    document.dispatchEvent(new CustomEvent("cart:beats-updated"));
  };

  selectors.form.addEventListener("change", filterBeats);

  document.addEventListener("customBeats:updated", (event) => {
    const beats = Array.isArray(event.detail?.beats) ? event.detail.beats : null;
    refreshCatalogSource(beats);
    filterBeats();
  });

  refreshCatalogSource();
  filterBeats();
})();
