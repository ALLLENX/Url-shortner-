// ═══════════════════════════════════════════
// LinkSnap — Premium URL Shortener
// site.js
// ═══════════════════════════════════════════

(function () {
    "use strict";

    async function getRecentLinks() {
        const response = await fetch("/api/links/recent");
        if (!response.ok) return [];
        return await response.json();
    }

    // ── DOM Ready ──
    document.addEventListener("DOMContentLoaded", () => {
        const form = document.getElementById("shortenForm");
        const urlInput = document.getElementById("urlInput");
        const aliasInput = document.getElementById("aliasInput");
        const shortenBtn = document.getElementById("shortenBtn");
        const resultContainer = document.getElementById("resultContainer");
        const shortUrlLink = document.getElementById("shortUrlLink");
        const originalUrl = document.getElementById("originalUrl");
        const copyBtn = document.getElementById("copyBtn");
        const qrBtn = document.getElementById("qrBtn");
        const qrModal = document.getElementById("qrModal");
        const qrCanvas = document.getElementById("qrCanvas");
        const newLinkBtn = document.getElementById("newLinkBtn");
        const recentSection = document.getElementById("recentLinksSection");
        const linksTable = document.getElementById("linksTable");
        const mobileMenuBtn = document.getElementById("mobileMenuBtn");
        const mobileMenu = document.getElementById("mobileMenu");

        // ── Mobile Menu ──
        mobileMenuBtn.addEventListener("click", () => {
            mobileMenuBtn.classList.toggle("active");
            mobileMenu.classList.toggle("open");
        });

        // ── Form Submit ──
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const url = urlInput.value.trim();
            if (!url) return;

            const alias = aliasInput.value.trim();

            // Show loading
            const btnText = shortenBtn.querySelector(".btn-text");
            const btnLoader = shortenBtn.querySelector(".btn-loader");
            btnText.hidden = true;
            btnLoader.hidden = false;
            shortenBtn.disabled = true;

            try {
                const response = await fetch("/shorten", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url, alias: alias || null })
                });

                const payload = await response.json();
                if (!response.ok) {
                    throw new Error(payload?.message || "Unable to shorten URL");
                }

                const shortUrl = payload.shortUrl;
                // Show result
                shortUrlLink.textContent = shortUrl;
                shortUrlLink.href = shortUrl;
                originalUrl.textContent = url;
                resultContainer.hidden = false;
                qrModal.hidden = true;

                // Reset form
                urlInput.value = "";
                aliasInput.value = "";
                btnText.hidden = false;
                btnLoader.hidden = true;
                shortenBtn.disabled = false;

                renderRecentLinks().catch(() => {});
                showToast("✅ Link shortened successfully!");
            } catch (error) {
                btnText.hidden = false;
                btnLoader.hidden = true;
                shortenBtn.disabled = false;
                showToast(`⚠️ ${error.message || "Something went wrong."}`);
            }
        });

        // ── Copy ──
        copyBtn.addEventListener("click", () => {
            const text = shortUrlLink.textContent;
            navigator.clipboard.writeText(text).then(() => {
                showToast("📋 Copied to clipboard!");
            }).catch(() => {
                // Fallback
                const ta = document.createElement("textarea");
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                showToast("📋 Copied!");
            });
        });

        // ── QR Code (simple canvas-based) ──
        qrBtn.addEventListener("click", () => {
            qrModal.hidden = !qrModal.hidden;
            if (!qrModal.hidden) {
                drawQR(qrCanvas, shortUrlLink.textContent);
            }
        });

        // ── New Link ──
        newLinkBtn.addEventListener("click", () => {
            resultContainer.hidden = true;
            urlInput.focus();
        });

        // ── Render Recent Links ──
        async function renderRecentLinks() {
            const links = await getRecentLinks();
            if (links.length === 0) {
                recentSection.hidden = true;
                return;
            }

            recentSection.hidden = false;
            linksTable.innerHTML = links.map(link => `
                <div class="link-row">
                    <div class="link-info">
                        <div class="link-short">${link.shortUrl}</div>
                        <div class="link-original">${link.originalUrl}</div>
                    </div>
                    <span class="link-clicks">${new Date(link.createdAtUtc).toLocaleString()}</span>
                </div>
            `).join("");

            // Click to copy
            linksTable.querySelectorAll(".link-row").forEach(row => {
                row.addEventListener("click", () => {
                    const short = row.querySelector(".link-short").textContent;
                    navigator.clipboard.writeText(short).then(() => {
                        showToast("📋 Copied: " + short);
                    });
                });
            });
        }

        // Init recent links
        renderRecentLinks().catch(() => {});

        // ── Animated Stats Counter ──
        const statNumbers = document.querySelectorAll(".stat-number[data-target]");
        const observerOptions = { threshold: 0.5 };

        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const target = parseInt(el.dataset.target);
                    animateCount(el, target);
                    statsObserver.unobserve(el);
                }
            });
        }, observerOptions);

        statNumbers.forEach(el => statsObserver.observe(el));

        function animateCount(el, target) {
            const duration = 2000;
            const start = performance.now();

            function update(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
                const current = Math.floor(eased * target);
                el.textContent = formatNumber(current);
                if (progress < 1) requestAnimationFrame(update);
            }

            requestAnimationFrame(update);
        }

        function formatNumber(n) {
            if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
            if (n >= 1000) return (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "K";
            return n.toString();
        }

        // ── Simple QR Code Drawing ──
        function drawQR(canvas, text) {
            const ctx = canvas.getContext("2d");
            const size = canvas.width;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, size, size);

            // Simple visual representation (placeholder grid pattern)
            // In production, use a library like qrcode-generator
            const cellSize = 8;
            const grid = Math.floor(size / cellSize);
            const hash = simpleHash(text);

            ctx.fillStyle = "#09090b";

            // Finder patterns (top-left, top-right, bottom-left)
            drawFinderPattern(ctx, 2, 2, cellSize);
            drawFinderPattern(ctx, grid - 9, 2, cellSize);
            drawFinderPattern(ctx, 2, grid - 9, cellSize);

            // Data modules (seeded from URL hash)
            let seed = hash;
            for (let y = 0; y < grid; y++) {
                for (let x = 0; x < grid; x++) {
                    if (isFinderArea(x, y, grid)) continue;
                    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                    if (seed % 3 === 0) {
                        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                    }
                }
            }
        }

        function drawFinderPattern(ctx, x, y, cell) {
            // Outer
            for (let i = 0; i < 7; i++) {
                for (let j = 0; j < 7; j++) {
                    if (i === 0 || i === 6 || j === 0 || j === 6 ||
                        (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
                        ctx.fillRect((x + i) * cell, (y + j) * cell, cell, cell);
                    }
                }
            }
        }

        function isFinderArea(x, y, grid) {
            return (x < 9 && y < 9) ||
                   (x >= grid - 9 && y < 9) ||
                   (x < 9 && y >= grid - 9);
        }

        function simpleHash(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash);
        }

        // ── Toast ──
        let toastEl = null;
        let toastTimer = null;

        function showToast(message) {
            if (toastEl) toastEl.remove();
            toastEl = document.createElement("div");
            toastEl.className = "toast";
            toastEl.textContent = message;
            document.body.appendChild(toastEl);

            requestAnimationFrame(() => {
                toastEl.classList.add("show");
            });

            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => {
                toastEl.classList.remove("show");
                setTimeout(() => { if (toastEl) toastEl.remove(); }, 300);
            }, 3000);
        }

        // ── Smooth Scroll for Nav Links ──
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener("click", (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute("href"));
                if (target) {
                    target.scrollIntoView({ behavior: "smooth" });
                    mobileMenu.classList.remove("open");
                    mobileMenuBtn.classList.remove("active");
                }
            });
        });
    });
})();
