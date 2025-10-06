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
    return Array.isArray(beats) ? beats : [];
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

  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.readAsDataURL(file);
    });

  const cacheDom = () => {
    selectors.authModal = document.getElementById("authModal");
    selectors.authTabs = Array.from(document.querySelectorAll(".auth-tab"));
    selectors.authForms = Array.from(document.querySelectorAll(".auth-form"));
    selectors.authMessage = document.getElementById("authFormMessage");
    selectors.navLoginButton = document.getElementById("navLoginButton");
    selectors.navUserMenu = document.getElementById("navUserMenu");
    selectors.navUserName = document.getElementById("navUserName");
    selectors.navPanelButton = selectors.navUserMenu
      ? selectors.navUserMenu.querySelector("[data-auth-action='open-panel']")
      : null;
    selectors.logoutButton = selectors.navUserMenu
      ? selectors.navUserMenu.querySelector("[data-auth-action='logout']")
      : null;
    selectors.adminPanel = document.getElementById("adminPanel");
    selectors.beatForm = document.getElementById("beatForm");
    selectors.beatFormMessage = document.getElementById("beatFormMessage");
    selectors.adminBeatsContainer = document.getElementById(
      "adminBeatsContainer"
    );
    selectors.adminBeatsEmpty = document.getElementById("adminBeatsEmpty");
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
    if (!selectors.adminPanel) {
      return;
    }

    const shouldShow = isAdmin();
    selectors.adminPanel.hidden = !shouldShow;
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

    if (context === "admin") {
      const card = document.createElement("article");
      card.className = "admin-beat-card";
      card.dataset.customBeat = beat.id;
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
    article.dataset.genre = beat.genre || "personalizado";
    article.dataset.license = "licencia";

    const mood = beat.mood || `${capitalize(beat.genre)} · Beat personalizado`;

    article.innerHTML = [
      `<img src="${cover}" alt="Portada del beat ${beat.title}" class="beat-cover" />`,
      '<div class="beat-info">',
      `  <h3>${beat.title}</h3>`,
      `  <p class="beat-genre">${mood}</p>`,
      formattedFiles ? `  <p class="beat-files">Incluye: ${formattedFiles}</p>` : "",
      '  <div class="beat-meta">',
      `    <span class="beat-price">${beat.price} USD</span>`,
      `    <span class="beat-license">Licencia ${beat.license}</span>`,
      "  </div>",
      offer ? `  <p class="beat-offer">${offer}</p>` : "",
      `  <p class="beat-date">Subido el ${formatDate(beat.releaseDate)}</p>`,
      `  <button class="btn tertiary" type="button" data-add-to-cart data-item-id="${beat.id}" data-item-type="beat" data-item-price="${beat.price}" data-item-cover="${cover}" data-item-title="${beat.title}">Agregar al carrito</button>`,
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
    if (!selectors.adminPanel) {
      return;
    }

    selectors.adminPanel.hidden = false;
    selectors.adminPanel.scrollIntoView({ behavior: "smooth" });
  };

  const handleBeatFormSubmit = async (event) => {
    event.preventDefault();

    if (!isAdmin()) {
      return;
    }

    const form = event.currentTarget;
    const submitButton = form.querySelector("button[type='submit']");

    const title = form.title.value.trim();
    const genre = form.category.value;
    const price = Number.parseFloat(form.price.value);
    const offer = form.offer.value.trim();
    const files = parseFiles(form.files.value);
    const imageFile = form.image.files[0];

    if (!title || !genre || !Number.isFinite(price) || price <= 0 || !imageFile) {
      if (selectors.beatFormMessage) {
        selectors.beatFormMessage.textContent =
          "Complet� todos los campos obligatorios.";
        selectors.beatFormMessage.dataset.type = "error";
      }
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
    }

    if (selectors.beatFormMessage) {
      selectors.beatFormMessage.textContent = "Procesando beat...";
      selectors.beatFormMessage.dataset.type = "info";
    }

    try {
      const cover = await readFileAsDataURL(imageFile);
      const now = new Date().toISOString();
      const newBeat = {
        id:
          (typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `beat-${Date.now()}`),
        title,
        genre,
        price: Number(price.toFixed(2)),
        license: offer ? "Personalizada" : "Standard",
        offer,
        files,
        cover,
        createdBy: state.currentUser.email,
        releaseDate: now,
        mood: files.length
          ? `${capitalize(genre)} · ${files.join(", ")}`
          : `${capitalize(genre)} · Beat personalizado`
      };

      const beats = getCustomBeats();
      beats.push(newBeat);
      saveCustomBeats(beats);

      renderCustomBeats();

      form.reset();
      if (selectors.beatFormMessage) {
        selectors.beatFormMessage.textContent = "Beat guardado correctamente.";
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
