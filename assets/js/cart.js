(function () {
  "use strict";

  const STORAGE_KEY = "dame6k:cart";

  const state = {
    items: [],
    isOpen: false,
    lastFocused: null
  };

  const elements = {
    toggle: null,
    count: null,
    wrapper: null,
    overlay: null,
    drawer: null,
    items: null,
    empty: null,
    total: null,
    clear: null,
    checkout: null,
    close: null
  };

  const slugify = (value) => {
    if (!value) {
      return "";
    }
    let normalised = value.toString();
    if (typeof normalised.normalize === "function") {
      normalised = normalised.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    return normalised
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const parsePrice = (raw) => {
    if (!raw) {
      return NaN;
    }
    const sanitised = raw.replace(/[^0-9.,-]/g, "").replace(",", ".");
    const parsed = Number.parseFloat(sanitised);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const formatCurrency = (value) => {
    if (!Number.isFinite(value)) {
      return "$0.00";
    }
    try {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2
      }).format(value);
    } catch (error) {
      return `$${value.toFixed(2)}`;
    }
  };

  const loadCart = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }
      state.items = parsed
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => {
          const price = Number.parseFloat(entry.price);
          const quantity = Number.parseInt(entry.quantity, 10);
          return {
            id: String(entry.id || ""),
            title: String(entry.title || "Producto"),
            price: Number.isFinite(price) ? price : 0,
            type: String(entry.type || "producto"),
            cover: entry.cover ? String(entry.cover) : "",
            meta: entry.meta ? String(entry.meta) : "",
            quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1
          };
        })
        .filter((entry) => entry.id && Number.isFinite(entry.price));
    } catch (error) {
      state.items = [];
    }
  };

  const saveCart = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch (error) {
      // ignore storage errors (private mode, quota, etc.)
    }
  };

  const getCartCount = () =>
    state.items.reduce((total, item) => total + item.quantity, 0);

  const setActionState = () => {
    const isEmpty = state.items.length === 0;
    if (elements.clear) {
      elements.clear.disabled = isEmpty;
    }
    if (elements.checkout) {
      elements.checkout.disabled = isEmpty;
    }
  };

  const updateCartCount = () => {
    if (!elements.count) {
      return;
    }
    elements.count.textContent = String(getCartCount());
  };

  const renderCart = () => {
    if (!elements.items || !elements.empty || !elements.total) {
      return;
    }

    elements.items.innerHTML = "";
    const fragment = document.createDocumentFragment();

    let total = 0;

    state.items.forEach((item) => {
      const subtotal = item.price * item.quantity;
      total += subtotal;

      const listItem = document.createElement("li");
      listItem.className = "cart-item";

      const media = document.createElement("div");
      media.className = "cart-item__media";

      if (item.cover) {
        const image = document.createElement("img");
        image.src = item.cover;
        image.alt = `Portada de ${item.title}`;
        image.className = "cart-item__thumb";
        media.appendChild(image);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "cart-item__placeholder";
        placeholder.textContent = item.title.charAt(0).toUpperCase();
        media.appendChild(placeholder);
      }

      const content = document.createElement("div");
      content.className = "cart-item__content";

      const topRow = document.createElement("div");
      topRow.className = "cart-item__top";

      const title = document.createElement("span");
      title.className = "cart-item__title";
      title.textContent = item.title;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "cart-item__remove";
      removeButton.dataset.cartRemove = item.id;
      removeButton.setAttribute("aria-label", `Eliminar ${item.title}`);
      removeButton.textContent = "Eliminar";

      topRow.appendChild(title);
      topRow.appendChild(removeButton);

      const metaRow = document.createElement("div");
      metaRow.className = "cart-item__meta";

      const typeBadge = document.createElement("span");
      typeBadge.className = "cart-item__badge";
      const typeLabel = item.type
        ? item.type.charAt(0).toUpperCase() + item.type.slice(1)
        : "Producto";
      typeBadge.textContent = typeLabel;
      metaRow.appendChild(typeBadge);

      if (item.meta) {
        const metaInfo = document.createElement("span");
        metaInfo.className = "cart-item__info";
        metaInfo.textContent = item.meta;
        metaRow.appendChild(metaInfo);
      }

      const summaryRow = document.createElement("div");
      summaryRow.className = "cart-item__summary";

      const unitPrice = document.createElement("span");
      unitPrice.className = "cart-item__unit";
      unitPrice.textContent = `${formatCurrency(item.price)} c/u`;

      const quantityTag = document.createElement("span");
      quantityTag.className = "cart-item__quantity";
      quantityTag.textContent = `x${item.quantity}`;

      const subtotalTag = document.createElement("span");
      subtotalTag.className = "cart-item__subtotal";
      subtotalTag.textContent = formatCurrency(subtotal);

      summaryRow.appendChild(unitPrice);
      summaryRow.appendChild(quantityTag);
      summaryRow.appendChild(subtotalTag);

      content.appendChild(topRow);
      content.appendChild(metaRow);
      content.appendChild(summaryRow);

      listItem.appendChild(media);
      listItem.appendChild(content);

      fragment.appendChild(listItem);
    });

    elements.items.appendChild(fragment);
    elements.total.textContent = formatCurrency(total);

    if (state.items.length === 0) {
      elements.empty.classList.remove("is-hidden");
    } else {
      elements.empty.classList.add("is-hidden");
    }

    setActionState();
    updateCartCount();
  };

  const openCart = () => {
    if (!elements.wrapper || state.isOpen) {
      return;
    }
    state.isOpen = true;
    if (document.activeElement instanceof HTMLElement) {
      state.lastFocused = document.activeElement;
    }

    elements.wrapper.classList.add("cart--open");
    elements.wrapper.setAttribute("aria-hidden", "false");
    document.body.classList.add("cart-open");

    if (elements.toggle) {
      elements.toggle.setAttribute("aria-expanded", "true");
    }

    window.setTimeout(() => {
      elements.close?.focus();
    }, 0);
  };

  const closeCart = () => {
    if (!elements.wrapper || !state.isOpen) {
      return;
    }
    state.isOpen = false;
    elements.wrapper.classList.remove("cart--open");
    elements.wrapper.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cart-open");

    if (elements.toggle) {
      elements.toggle.setAttribute("aria-expanded", "false");
    }

    if (state.lastFocused && typeof state.lastFocused.focus === "function") {
      state.lastFocused.focus();
    }
    state.lastFocused = null;
  };

  const toggleCart = () => {
    if (state.isOpen) {
      closeCart();
    } else {
      openCart();
    }
  };

  const addItem = (item) => {
    const existing = state.items.find((entry) => entry.id === item.id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      state.items.push(item);
    }
    saveCart();
    renderCart();
  };

  const removeItem = (id) => {
    const index = state.items.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return;
    }
    state.items.splice(index, 1);
    saveCart();
    renderCart();
  };

  const clearCart = () => {
    state.items = [];
    saveCart();
    renderCart();
  };

  const collectBeatMeta = (card) => {
    const parts = [];
    const genre = card.querySelector(".beat-genre");
    if (genre) {
      parts.push(genre.textContent.trim());
    }
    const license = card.querySelector(".beat-license");
    if (license) {
      parts.push(license.textContent.trim());
    }
    return parts.join(" | ");
  };

  const getItemFromTrigger = (button) => {
    const card = button.closest(".beat-card, .service-card, .combo-card");
    const type =
      (button.dataset.itemType || "").toLowerCase() ||
      (card?.classList.contains("service-card")
        ? "servicio"
        : card?.classList.contains("combo-card")
        ? "combo"
        : "beat");

    let title =
      button.dataset.itemTitle ||
      card?.querySelector("h3, h4")?.textContent ||
      button.getAttribute("aria-label") ||
      "Producto";
    title = title.trim();

    const priceFromDataset = Number.parseFloat(button.dataset.itemPrice);
    let price = Number.isFinite(priceFromDataset)
      ? priceFromDataset
      : parsePrice(
          card?.querySelector(".beat-price, .service-price, .combo-price")
            ?.textContent || ""
        );

    if (!Number.isFinite(price)) {
      console.warn("[cart] No se pudo determinar el precio del producto:", title);
      return null;
    }

    let id = button.dataset.itemId || card?.dataset.itemId;
    if (!id) {
      id = `${type}-${slugify(title)}`;
    }

    const cover =
      button.dataset.itemCover ||
      card?.querySelector("img")?.getAttribute("src") ||
      "";

    let meta = button.dataset.itemMeta || "";
    if (!meta && card?.classList.contains("beat-card")) {
      meta = collectBeatMeta(card);
    }
    if (!meta && card?.classList.contains("combo-card")) {
      meta =
        card.querySelector(".combo-price + p")?.textContent?.trim() ||
        card.querySelector("p")?.textContent?.trim() ||
        "";
    }
    if (!meta && card?.classList.contains("service-card")) {
      meta =
        card.querySelector(".service-note")?.textContent?.trim() ||
        card.querySelector("p")?.textContent?.trim() ||
        "";
    }

    return {
      id,
      title,
      price,
      type,
      cover,
      meta,
      quantity: 1
    };
  };

  const ensureBeatButtons = () => {
    const cards = document.querySelectorAll(".beat-card");
    cards.forEach((card, index) => {
      const button = card.querySelector("button.btn.tertiary");
      if (!button) {
        return;
      }

      button.dataset.addToCart = "true";
      if (!button.dataset.itemType) {
        button.dataset.itemType = "beat";
      }

      const title = card.querySelector("h3")?.textContent?.trim();
      if (title && !button.dataset.itemTitle) {
        button.dataset.itemTitle = title;
      }

      const priceText = card.querySelector(".beat-price")?.textContent || "";
      const parsedPrice = parsePrice(priceText);
      if (Number.isFinite(parsedPrice) && !button.dataset.itemPrice) {
        button.dataset.itemPrice = String(parsedPrice);
      }

      if (!button.dataset.itemId) {
        const slug = slugify(title || `beat-${index}`);
        button.dataset.itemId = `beat-${slug || index}`;
      }

      if (!button.dataset.itemCover) {
        const cover = card.querySelector("img")?.getAttribute("src");
        if (cover) {
          button.dataset.itemCover = cover;
        }
      }

      const meta = collectBeatMeta(card);
      if (meta && !button.dataset.itemMeta) {
        button.dataset.itemMeta = meta;
      }

      button.textContent = "Agregar al carrito";
    });
  };

  const ensureServiceButtons = () => {
    const cards = document.querySelectorAll(".service-card");
    cards.forEach((card, index) => {
      let button = card.querySelector("[data-add-to-cart]");
      const title = card.querySelector("h3")?.textContent?.trim() || "Servicio";
      const note = card.querySelector(".service-note")?.textContent?.trim() || "";
      const priceText = card.querySelector(".service-price")?.textContent || "";
      const price = parsePrice(priceText);

      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "btn tertiary service-add";
        button.textContent = "Agregar al carrito";
        card.appendChild(button);
      }

      button.dataset.addToCart = "true";
      button.dataset.itemType = "servicio";
      button.dataset.itemTitle = title;
      button.dataset.itemMeta = note;
      if (Number.isFinite(price)) {
        button.dataset.itemPrice = String(price);
      }
      if (!button.dataset.itemId) {
        const slug = slugify(title) || `servicio-${index}`;
        button.dataset.itemId = `servicio-${slug}`;
      }
    });
  };

  const ensureComboButtons = () => {
    const cards = document.querySelectorAll(".combo-card");
    cards.forEach((card, index) => {
      let button = card.querySelector("[data-add-to-cart]");
      const title = card.querySelector("h4")?.textContent?.trim() || "Combo";
      const detail =
        card.querySelector(".combo-price + p")?.textContent?.trim() ||
        card.querySelector("p")?.textContent?.trim() ||
        "";
      const priceText = card.querySelector(".combo-price")?.textContent || "";
      const price = parsePrice(priceText);

      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "btn tertiary combo-add";
        button.textContent = "Agregar al carrito";
        card.appendChild(button);
      }

      button.dataset.addToCart = "true";
      button.dataset.itemType = "combo";
      button.dataset.itemTitle = title;
      button.dataset.itemMeta = detail;
      if (Number.isFinite(price)) {
        button.dataset.itemPrice = String(price);
      }
      if (!button.dataset.itemId) {
        const slug = slugify(title) || `combo-${index}`;
        button.dataset.itemId = `combo-${slug}`;
      }
    });
  };

  const ensureProductButtons = () => {
    ensureBeatButtons();
    ensureServiceButtons();
    ensureComboButtons();
  };

  const handleDocumentClick = (event) => {
    const addTrigger = event.target.closest("[data-add-to-cart]");
    if (addTrigger) {
      const item = getItemFromTrigger(addTrigger);
      if (item) {
        addItem(item);
        openCart();
      }
    }

    const removeTrigger = event.target.closest("[data-cart-remove]");
    if (removeTrigger) {
      const { cartRemove } = removeTrigger.dataset;
      if (cartRemove) {
        removeItem(cartRemove);
      }
    }
  };

  const handleCartAction = (event) => {
    const trigger = event.target.closest("[data-cart-action]");
    if (!trigger) {
      return;
    }
    const action = trigger.dataset.cartAction;
    if (action === "close") {
      closeCart();
    } else if (action === "clear") {
      clearCart();
    } else if (action === "checkout") {
      if (state.items.length === 0) {
        return;
      }
      closeCart();
      const contact = document.querySelector("#contact");
      if (contact) {
        contact.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleKeydown = (event) => {
    if (event.key === "Escape" && state.isOpen) {
      closeCart();
    }
  };

  const createCartToggle = () => {
    const nav = document.querySelector(".navbar");
    if (!nav) {
      return;
    }

    let toggle = document.querySelector("#cartToggle");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.id = "cartToggle";
      toggle.className = "nav-cart";
      toggle.setAttribute("aria-haspopup", "dialog");
      toggle.setAttribute("aria-expanded", "false");
      toggle.innerHTML =
        'Carrito <span class="cart-count" id="cartCount">0</span>';

      const navCta = nav.querySelector(".nav-cta");
      if (navCta) {
        nav.insertBefore(toggle, navCta);
      } else {
        nav.appendChild(toggle);
      }
    }

    elements.toggle = toggle;
    elements.count = toggle.querySelector("#cartCount");
  };

  const createCartStructure = () => {
    if (document.querySelector("#cartWrapper")) {
      elements.wrapper = document.querySelector("#cartWrapper");
      elements.overlay = elements.wrapper.querySelector(".cart__overlay");
      elements.drawer = elements.wrapper.querySelector(".cart__drawer");
      elements.items = elements.wrapper.querySelector("#cartItems");
      elements.empty = elements.wrapper.querySelector("#cartEmpty");
      elements.total = elements.wrapper.querySelector("#cartTotal");
      elements.clear = elements.wrapper.querySelector("[data-cart-action='clear']");
      elements.checkout = elements.wrapper.querySelector("[data-cart-action='checkout']");
      elements.close = elements.wrapper.querySelector(".cart__close");
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "cart";
    wrapper.id = "cartWrapper";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML = `
      <div class="cart__overlay" data-cart-action="close"></div>
      <aside class="cart__drawer" role="dialog" aria-labelledby="cartTitle" aria-modal="true">
        <header class="cart__header">
          <h2 id="cartTitle">Tu carrito</h2>
          <button type="button" class="cart__close" data-cart-action="close" aria-label="Cerrar carrito">Cerrar</button>
        </header>
        <div class="cart__body">
          <ul class="cart__items" id="cartItems"></ul>
          <p class="cart__empty" id="cartEmpty">Tu carrito esta vacio.</p>
        </div>
        <footer class="cart__footer">
          <div class="cart__total">
            <span>Total</span>
            <strong id="cartTotal">$0.00</strong>
          </div>
          <div class="cart__actions">
            <button class="btn secondary cart__clear" type="button" data-cart-action="clear">Vaciar carrito</button>
            <button class="btn primary cart__checkout" type="button" data-cart-action="checkout">Proceder al pago</button>
          </div>
          <p class="cart__note">El checkout se coordina por WhatsApp o correo despues de confirmar tu pedido.</p>
        </footer>
      </aside>
    `;
    document.body.appendChild(wrapper);

    elements.wrapper = wrapper;
    elements.overlay = wrapper.querySelector(".cart__overlay");
    elements.drawer = wrapper.querySelector(".cart__drawer");
    elements.items = wrapper.querySelector("#cartItems");
    elements.empty = wrapper.querySelector("#cartEmpty");
    elements.total = wrapper.querySelector("#cartTotal");
    elements.clear = wrapper.querySelector("[data-cart-action='clear']");
    elements.checkout = wrapper.querySelector("[data-cart-action='checkout']");
    elements.close = wrapper.querySelector(".cart__close");
  };

  const init = () => {
    createCartToggle();
    createCartStructure();
    loadCart();
    ensureProductButtons();
    renderCart();

    elements.toggle?.addEventListener("click", toggleCart);
    elements.wrapper?.addEventListener("click", handleCartAction);
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("cart:beats-updated", ensureBeatButtons);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
