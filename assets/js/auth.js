(function () {
  "use strict";

  const STORAGE_KEYS = {
    users: "beatsAuth:users",
    session: "beatsAuth:session",
    beats: "beatsAuth:customBeats"
  };

  const state = {
    currentUser: null,
    activeTab: "login"
  };

  const selectors = {};

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

  const hashPassword = (password) => {
    try {
      return window.btoa(unescape(encodeURIComponent(password)));
    } catch (error) {
      return password;
    }
  };

  const passwordsMatch = (stored, provided) => stored === hashPassword(provided);

  const getUsers = () => {
    const users = safeJSONParse(localStorage.getItem(STORAGE_KEYS.users), []);
    return Array.isArray(users) ? users : [];
  };

  const saveUsers = (users) => {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  };

  const loadSession = () =>
    safeJSONParse(localStorage.getItem(STORAGE_KEYS.session), null);

  const persistSession = (user) => {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.session);
      return;
    }

    const session = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name || ""
    };
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
  };

  const getCustomBeats = () => {
    const beats = safeJSONParse(localStorage.getItem(STORAGE_KEYS.beats), []);
    if (!Array.isArray(beats)) {
      return [];
    }

    return beats
      .map((beat) => normaliseBeat(beat))
      .filter((beat) => Boolean(beat));
  };

  const saveCustomBeats = (beats) => {
    localStorage.setItem(STORAGE_KEYS.beats, JSON.stringify(beats));
  };

  const ensureDefaultAdmin = () => {
    const users = getUsers();
    const adminEmail = "admin@beats.com";
    const alreadyExists = users.some(
      (user) => user.email && user.email.toLowerCase() === adminEmail
    );

    if (!alreadyExists) {
      users.push({
        id: "admin",
        name: "Administrador",
        email: adminEmail,
        password: hashPassword("admin123"),
        role: "admin",
        createdAt: new Date().toISOString()
      });
      saveUsers(users);
    }
  };

  const isAdmin = () => state.currentUser?.role === "admin";

  const capitalize = (value) => {
    if (!value || typeof value !== "string") {
      return "";
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const parseFiles = (value) => {
    if (!value) {
      return [];
    }

    return value
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

    const name = license.name || fallbackName || capitalize(license.id || "");
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
      id:
        rawBeat.id ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `beat-${Date.now()}`),
      title: rawBeat.title || "Beat personalizado",
      genre: rawBeat.genre || "personalizado",
      price: defaultLicense?.price || 0,
      license: defaultLicense?.name || fallbackLicenseName,
      licenses,
      files: combinedFiles,
      cover: rawBeat.cover || "assets/img/beat1.webp",
      offer: rawBeat.offer || "",
      createdBy: rawBeat.createdBy || "",
      releaseDate: rawBeat.releaseDate || new Date().toISOString(),
      mood:
        rawBeat.mood ||
        `${capitalize(rawBeat.genre || "personalizado")} · Beat personalizado`,
      preview,
      previewType: rawBeat.previewType || rawBeat.audioType || "",
      previewName: rawBeat.previewName || rawBeat.audioName || "",
      audio: preview,
      audioType: rawBeat.previewType || rawBeat.audioType || ""
    };
  };

  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.readAsDataURL(file);
    });

  const toggleLicenseFields = (item, shouldShow) => {
    if (!item) {
      return;
    }

    const body = item.querySelector("[data-license-fields]");
    if (body) {
      body.classList.toggle("is-hidden", !shouldShow);
    }
  };

  const cacheLicenseControls = () => {
    selectors.licenseItems = selectors.beatForm
      ? Array.from(selectors.beatForm.querySelectorAll("[data-license-item]"))
      : [];

    selectors.licenseItems.forEach((item) => {
      const toggle = item.querySelector("[data-license-toggle]");
      toggleLicenseFields(item, Boolean(toggle?.checked));
    });
  };

  const cacheDom = () => {
    selectors.authModal = document.getElementById("authModal");
    selectors.authTabs = Array.from(document.querySelectorAll(".auth-tab"));
    selectors.authForms = Array.from(document.querySelectorAll(".auth-form"));
    selectors.authMessage = document.getElementById("authFormMessage");
    selectors.navLoginButton = document.getElementById("navLoginButton");
    selectors.navUserMenu = document.getElementById("navUserMenu");
    selectors.navUserName = document.getElementById("navUserName");
    selectors.navPanelButton = selectors.navUserMenu
      ? selectors.navUserMenu.querySelector("[data-auth-action='go-panel']")
      : null;
    selectors.logoutButton = selectors.navUserMenu
      ? selectors.navUserMenu.querySelector("[data-auth-action='logout']")
      : null;
    selectors.adminPanel = document.getElementById("adminPanel");
    selectors.adminLocked = document.getElementById("adminLockedNotice");
    selectors.beatForm = document.getElementById("beatForm");
    selectors.beatFormMessage = document.getElementById("beatFormMessage");
    selectors.adminBeatsContainer = document.getElementById(
      "adminBeatsContainer"
    );
    selectors.adminBeatsEmpty = document.getElementById("adminBeatsEmpty");
    cacheLicenseControls();
  };

  const toggleClass = (element, className, shouldAdd) => {
    if (!element) {
      return;
    }

    element.classList.toggle(className, shouldAdd);
  };

  const openAuthModal = (mode = "login") => {
    if (!selectors.authModal) {
      return;
    }

    state.activeTab = mode;
    selectors.authModal.classList.add("is-open");
    selectors.authModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("auth-modal-open");
    switchAuthTab(mode);
  };

  const closeAuthModal = () => {
    if (!selectors.authModal) {
      return;
    }

    selectors.authModal.classList.remove("is-open");
    selectors.authModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("auth-modal-open");
    hideAuthMessage();
  };

  const switchAuthTab = (mode) => {
    state.activeTab = mode;

    selectors.authTabs.forEach((tab) => {
      const isActive = tab.dataset.authTab === mode;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    selectors.authForms.forEach((form) => {
      const isPanel = form.dataset.authPanel === mode;
      form.classList.toggle("is-hidden", !isPanel);
      form.setAttribute("aria-hidden", String(!isPanel));
      if (isPanel) {
        const firstField = form.querySelector("input, select, textarea");
        if (firstField) {
          firstField.focus();
        }
      }
    });

    hideAuthMessage();
  };

  const showAuthMessage = (message, type = "info") => {
    if (!selectors.authMessage) {
      return;
    }

    selectors.authMessage.textContent = message;
    selectors.authMessage.dataset.type = type;
    selectors.authMessage.classList.add("is-visible");
  };

  const hideAuthMessage = () => {
    if (!selectors.authMessage) {
      return;
    }

    selectors.authMessage.textContent = "";
    selectors.authMessage.classList.remove("is-visible");
    delete selectors.authMessage.dataset.type;
  };

  const updateNavUI = () => {
    const isLoggedIn = Boolean(state.currentUser);

    if (selectors.navLoginButton) {
      selectors.navLoginButton.classList.toggle("is-hidden", isLoggedIn);
      selectors.navLoginButton.setAttribute("aria-hidden", String(isLoggedIn));
    }

    if (selectors.navUserMenu) {
      toggleClass(selectors.navUserMenu, "is-hidden", !isLoggedIn);
      selectors.navUserMenu.setAttribute(
        "aria-expanded",
        String(isLoggedIn)
      );
    }

    if (selectors.navUserName) {
      selectors.navUserName.textContent =
        state.currentUser?.name || state.currentUser?.email || "";
    }

    if (selectors.navPanelButton) {
      selectors.navPanelButton.classList.toggle("is-hidden", !isAdmin());
      selectors.navPanelButton.setAttribute(
        "aria-hidden",
        String(!isAdmin())
      );
    }
  };

  const updateAdminPanelVisibility = () => {
    const shouldShow = isAdmin();

    if (selectors.adminPanel) {
      selectors.adminPanel.hidden = !shouldShow;
    }

    if (selectors.adminLocked) {
      selectors.adminLocked.hidden = shouldShow;
    }
  };

  const formatDate = (isoDate) => {
    if (!isoDate) {
      return "";
    }

    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return "";
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

  const createBeatCardForContext = (context, beat) => {
    if (!beat) {
      return null;
    }

    const cover = beat.cover || "assets/img/beat1.webp";
    const files = Array.isArray(beat.files) ? beat.files : [];
    const formattedFiles = files.join(", ");
    const offer = beat.offer || "";
    const licenses = Array.isArray(beat.licenses) ? beat.licenses : [];
    const defaultLicense = licenses[0] || null;

    if (context === "admin") {
      const card = document.createElement("article");
      card.className = "admin-beat-card";
      card.dataset.customBeat = beat.id;
      const licenseSummary = licenses
        .map((license) => {
          const licenseFiles = Array.isArray(license.files)
            ? license.files.join(", ")
            : "";
          const fileText = licenseFiles ? ` · ${licenseFiles}` : "";
          return `<li><strong>${license.name}</strong> · ${license.price} USD${fileText}</li>`;
        })
        .join("\n");
      card.innerHTML = [
        `<div class="admin-beat-card__cover"><img src="${cover}" alt="Portada del beat ${beat.title}" /></div>`,
        '<div class="admin-beat-card__body">',
        `  <h4>${beat.title}</h4>`,
        `  <p class="admin-beat-card__meta">${capitalize(
          beat.genre
        )} · ${beat.price} USD</p>`,
        offer ? `  <p class="admin-beat-card__offer">${offer}</p>` : "",
        formattedFiles
          ? `  <p class="admin-beat-card__files">Incluye: ${formattedFiles}</p>`
          : "",
        licenseSummary
          ? `  <ul class="admin-beat-card__licenses">${licenseSummary}</ul>`
          : "",
        `  <p class="admin-beat-card__date">Publicado el ${formatDate(
          beat.releaseDate
        )}</p>`,
        "</div>"
      ]
        .filter(Boolean)
        .join("\n");
      return card;
    }

    const article = document.createElement("article");
    article.className = "beat-card beat-card--custom";
    article.dataset.customBeat = beat.id;
    article.dataset.itemIdBase = beat.id;
    article.dataset.itemId = beat.id;
    article.dataset.genre = beat.genre || "personalizado";
    article.dataset.license = "licencia";

    const mood = beat.mood || `${capitalize(beat.genre)} · Beat personalizado`;
    const previewSource = beat.preview || beat.audio || "";
    const previewType = beat.previewType || beat.audioType || "audio/mpeg";
    const defaultPrice = defaultLicense?.price || beat.price || 0;
    const defaultLicenseLabel = defaultLicense
      ? `Licencia ${defaultLicense.name}`
      : `Licencia ${beat.license || "Standard"}`;
    const filesDefaultText = formattedFiles
      ? `Incluye: ${formattedFiles}`
      : "Archivos sujetos a la licencia seleccionada.";

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

    article.innerHTML = [
      `<img src="${cover}" alt="Portada del beat ${beat.title}" class="beat-cover" />`,
      '<div class="beat-info">',
      `  <h3>${beat.title}</h3>`,
      `  <p class="beat-genre">${mood}</p>`,
      `  <p class="beat-files" data-license-files-target data-default-text="${escapeAttribute(
        filesDefaultText
      )}">${filesDefaultText}</p>`,
      previewSource
        ? [
            '  <audio controls preload="none" class="beat-player">',
            `    <source src="${previewSource}" type="${previewType}" />`,
            "    Tu navegador no soporta la reproducción de audio.",
            "  </audio>"
          ].join("\n")
        : "",
      '  <div class="beat-meta">',
      `    <span class="beat-price" data-license-price-target>${defaultPrice} USD</span>`,
      `    <span class="beat-license" data-license-label-target>${defaultLicenseLabel}</span>`,
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
      offer ? `  <p class="beat-offer">${offer}</p>` : "",
      `  <p class="beat-date">Subido el ${formatDate(beat.releaseDate)}</p>`,
      `  <button class="btn tertiary" type="button" data-add-to-cart data-item-id="${beat.id}" data-item-type="beat" data-item-price="${defaultPrice}" data-item-cover="${cover}" data-item-title="${beat.title}">Agregar al carrito</button>`,
      "</div>"
    ]
      .filter(Boolean)
      .join("\n");

    return article;
  };

  const notifyCustomBeatsChange = (beats) => {
    document.dispatchEvent(
      new CustomEvent("customBeats:updated", {
        detail: { beats }
      })
    );
  };

  const renderCustomBeats = ({ notify = true } = {}) => {
    const beats = getCustomBeats().slice();
    beats.sort(
      (a, b) =>
        new Date(b.releaseDate || 0).getTime() -
        new Date(a.releaseDate || 0).getTime()
    );

    const containers = document.querySelectorAll("[data-custom-beats-target]");
    containers.forEach((container) => {
      container
        .querySelectorAll("[data-custom-beat]")
        .forEach((element) => element.remove());

      const context = container.dataset.customBeatsTarget || "home";
      beats.forEach((beat) => {
        const card = createBeatCardForContext(context, beat);
        if (card) {
          container.appendChild(card);
        }
      });
    });

    if (selectors.adminBeatsEmpty) {
      selectors.adminBeatsEmpty.classList.toggle("is-hidden", beats.length > 0);
    }

    if (notify) {
      notifyCustomBeatsChange(beats);
    }
  };

  const updateAuthUI = () => {
    updateNavUI();
    updateAdminPanelVisibility();
  };

  const handleLogin = (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;

    if (!email || !password) {
      showAuthMessage("Ingres� email y contrase�a para continuar.", "error");
      return;
    }

    const users = getUsers();
    const user = users.find(
      (item) => item.email && item.email.toLowerCase() === email
    );

    if (!user || !passwordsMatch(user.password, password)) {
      showAuthMessage("Credenciales incorrectas. Intentalo nuevamente.", "error");
      return;
    }

    state.currentUser = {
      id: user.id || user.email,
      email: user.email,
      role: user.role || "user",
      name: user.name || ""
    };
    persistSession(state.currentUser);
    updateAuthUI();
    hideAuthMessage();
    form.reset();
    closeAuthModal();
  };

  const handleRegister = (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const name = form.name.value.trim();
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;

    if (!name || !email || !password) {
      showAuthMessage("Complet� todos los campos para registrarte.", "error");
      return;
    }

    if (password.length < 6) {
      showAuthMessage("La contrase�a debe tener al menos 6 caracteres.", "error");
      return;
    }

    const users = getUsers();
    const emailExists = users.some(
      (user) => user.email && user.email.toLowerCase() === email
    );

    if (emailExists) {
      showAuthMessage("Ya existe una cuenta con ese email.", "error");
      return;
    }

    const newUser = {
      id:
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `user-${Date.now()}`),
      name,
      email,
      password: hashPassword(password),
      role: "user",
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    state.currentUser = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name
    };

    persistSession(state.currentUser);
    updateAuthUI();
    hideAuthMessage();
    form.reset();
    closeAuthModal();
  };

  const handleLogout = () => {
    state.currentUser = null;
    persistSession(null);
    updateAuthUI();
  };

  const scrollToAdminPanel = () => {
    const onPanelPage = /panel\.html$/i.test(window.location.pathname);

    if (!onPanelPage) {
      window.location.href = "panel.html";
      return;
    }

    if (isAdmin() && selectors.adminPanel) {
      selectors.adminPanel.hidden = false;
      selectors.adminPanel.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (selectors.adminLocked) {
      selectors.adminLocked.hidden = false;
      selectors.adminLocked.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleBeatFormSubmit = async (event) => {
    event.preventDefault();

    if (!isAdmin()) {
      return;
    }

    const form = event.currentTarget;
    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
    }

    const title = form.title.value.trim();
    const genre = form.category.value;
    const offer = form.offer.value.trim();
    const descriptionFiles = parseFiles(form.files.value);
    const imageFile = form.image.files[0];
    const previewFile = form.preview.files[0];

    const licenseItems = Array.from(
      form.querySelectorAll("[data-license-item]")
    );

    const licenses = [];
    let validationMessage = "";

    for (const item of licenseItems) {
      const toggle = item.querySelector("[data-license-toggle]");
      if (!toggle || !toggle.checked) {
        continue;
      }

      const licenseName =
        item.dataset.licenseName || capitalize(item.dataset.licenseItem || "");
      const priceInput = item.querySelector("[data-license-price]");
      const filesInput = item.querySelector("[data-license-files]");
      const packageInput = item.querySelector("[data-license-package]");

      const priceValue = Number.parseFloat(priceInput?.value);
      if (!Number.isFinite(priceValue) || priceValue <= 0) {
        validationMessage = `Define un precio válido para la licencia ${licenseName}.`;
        break;
      }

      const packageFile = packageInput?.files?.[0];
      if (!packageFile) {
        validationMessage = `Adjunta el paquete de entrega para la licencia ${licenseName}.`;
        break;
      }

      try {
        const packageData = await readFileAsDataURL(packageFile);
        licenses.push({
          id:
            item.dataset.licenseItem ||
            licenseName.toLowerCase().replace(/\s+/g, "-"),
          name: licenseName,
          price: Number(priceValue.toFixed(2)),
          files: parseFiles(filesInput?.value),
          package: packageData,
          packageName: packageFile.name
        });
      } catch (error) {
        validationMessage = `No pudimos procesar el paquete de la licencia ${licenseName}.`;
        break;
      }
    }

    if (!validationMessage && !licenses.length) {
      validationMessage =
        "Activa al menos una licencia para publicar el beat.";
    }

    if (
      !validationMessage &&
      (!title || !genre || !imageFile || !previewFile)
    ) {
      validationMessage =
        "Completá todos los campos obligatorios y subí la imagen y preview.";
    }

    if (validationMessage) {
      if (selectors.beatFormMessage) {
        selectors.beatFormMessage.textContent = validationMessage;
        selectors.beatFormMessage.dataset.type = "error";
      }
      if (submitButton) {
        submitButton.disabled = false;
      }
      return;
    }

    if (selectors.beatFormMessage) {
      selectors.beatFormMessage.textContent = "Procesando beat...";
      selectors.beatFormMessage.dataset.type = "info";
    }

    try {
      const [cover, preview] = await Promise.all([
        readFileAsDataURL(imageFile),
        readFileAsDataURL(previewFile)
      ]);

      const now = new Date().toISOString();
      const defaultLicense = licenses[0];
      const combinedFiles = Array.from(
        new Set([
          ...descriptionFiles,
          ...(defaultLicense?.files || [])
        ])
      );
      const previewType = previewFile.type || "audio/mpeg";

      const newBeat = {
        id:
          (typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `beat-${Date.now()}`),
        title,
        genre,
        price: defaultLicense?.price || 0,
        license: defaultLicense?.name || "Standard",
        offer,
        files: combinedFiles,
        cover,
        preview,
        previewType,
        previewName: previewFile.name,
        licenses,
        createdBy: state.currentUser.email,
        releaseDate: now,
        mood: descriptionFiles.length
          ? `${capitalize(genre)} · ${descriptionFiles.join(", ")}`
          : `${capitalize(genre)} · Beat personalizado`
      };
      newBeat.audio = newBeat.preview;
      newBeat.audioType = previewType;

      const beats = getCustomBeats();
      beats.push(newBeat);
      saveCustomBeats(beats);

      renderCustomBeats();

      form.reset();
      cacheLicenseControls();

      if (selectors.beatFormMessage) {
        selectors.beatFormMessage.textContent =
          "Beat guardado correctamente.";
        selectors.beatFormMessage.dataset.type = "success";
      }
    } catch (error) {
      if (selectors.beatFormMessage) {
        selectors.beatFormMessage.textContent =
          "No pudimos guardar el beat. Intentalo nuevamente.";
        selectors.beatFormMessage.dataset.type = "error";
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  };

  const attachEvents = () => {
    const openers = Array.from(document.querySelectorAll("[data-auth-open]"));
    openers.forEach((opener) => {
      opener.addEventListener("click", (event) => {
        event.preventDefault();
        const mode = opener.dataset.authOpen || "login";
        openAuthModal(mode);
      });
    });

    if (selectors.authModal) {
      selectors.authModal.addEventListener("click", (event) => {
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          target.dataset.authClose !== undefined
        ) {
          closeAuthModal();
        }
      });
    }

    selectors.authTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        switchAuthTab(tab.dataset.authTab || "login");
      });
    });

    selectors.authForms.forEach((form) => {
      if (form.dataset.authPanel === "login") {
        form.addEventListener("submit", handleLogin);
      } else if (form.dataset.authPanel === "register") {
        form.addEventListener("submit", handleRegister);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && selectors.authModal?.classList.contains("is-open")) {
        closeAuthModal();
      }
    });

    if (selectors.logoutButton) {
      selectors.logoutButton.addEventListener("click", handleLogout);
    }

    if (selectors.navPanelButton) {
      selectors.navPanelButton.addEventListener("click", scrollToAdminPanel);
    }

    selectors.licenseItems?.forEach((item) => {
      const toggle = item.querySelector("[data-license-toggle]");
      if (toggle) {
        toggle.addEventListener("change", () => {
          toggleLicenseFields(item, toggle.checked);
        });
      }
    });

    if (selectors.beatForm) {
      selectors.beatForm.addEventListener("submit", handleBeatFormSubmit);
    }

    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEYS.session) {
        state.currentUser = loadSession();
        updateAuthUI();
      }

      if (event.key === STORAGE_KEYS.beats) {
        renderCustomBeats({ notify: false });
      }
    });
  };

  const init = () => {
    cacheDom();
    ensureDefaultAdmin();
    state.currentUser = loadSession();
    updateAuthUI();
    renderCustomBeats();
    attachEvents();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
