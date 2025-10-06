(function () {
    const smoothScroll = (targetSelector) => {
        const target = document.querySelector(targetSelector);
        if (!target) {
            return;
        }
        target.scrollIntoView({ behavior: "smooth" });
    };

    const handleFilters = () => {
        const filterButtons = document.querySelectorAll(".filter-btn");

        if (!filterButtons.length) {
            return;
        }

        let activeFilter = "all";

        const applyFilter = (filter) => {
            const beatCards = document.querySelectorAll(".beat-card");
            beatCards.forEach((card) => {
                const genre = card.dataset.genre;
                const license = card.dataset.license;
                const matchesGenre = genre === filter;
                const matchesLicense = license === filter;
                const shouldShow = filter === "all" || matchesGenre || matchesLicense;
                card.classList.toggle("is-hidden", !shouldShow);
            });
        };

        filterButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const current = document.querySelector(".filter-btn.active");
                if (current) {
                    current.classList.remove("active");
                }
                button.classList.add("active");
                activeFilter = button.dataset.filter || "all";
                applyFilter(activeFilter);
            });
        });

        document.addEventListener("customBeats:updated", () => {
            applyFilter(activeFilter);
        });
    };

    const registerScrollTriggers = () => {
        const triggers = document.querySelectorAll("[data-scroll]");
        triggers.forEach((trigger) => {
            trigger.addEventListener("click", (event) => {
                const targetSelector = trigger.getAttribute("data-scroll");
                if (!targetSelector) {
                    return;
                }
                event.preventDefault();
                smoothScroll(targetSelector);
            });
        });

        const anchorLinks = document.querySelectorAll("a[href^='#']");
        anchorLinks.forEach((link) => {
            link.addEventListener("click", (event) => {
                const href = link.getAttribute("href");
                if (!href || href === "#") {
                    return;
                }
                event.preventDefault();
                smoothScroll(href);
            });
        });
    };

    const setupAudioPlayers = () => {
        const players = Array.from(document.querySelectorAll(".beat-player"));
        players.forEach((player) => {
            if (player.dataset.audioGuarded === "true") {
                return;
            }
            player.dataset.audioGuarded = "true";
            player.addEventListener("play", () => {
                document.querySelectorAll(".beat-player").forEach((other) => {
                    if (other !== player) {
                        other.pause();
                    }
                });
            });
        });
    };

    document.addEventListener("DOMContentLoaded", () => {
        handleFilters();
        registerScrollTriggers();
        setupAudioPlayers();
        document.addEventListener("customBeats:updated", setupAudioPlayers);
    });
})();
