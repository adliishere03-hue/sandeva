// Ganti nomor WhatsApp di sini (format internasional tanpa +)
const ADMIN_WHATSAPP = "6285824376924";

/**
 * Helper: Scroll halus ke section berdasarkan id
 */
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

/**
 * Dipanggil dari tombol "Pesan Paket ..."
 * Akan membuka WhatsApp dengan pesan template
 */
function pesan(namaPaket) {
    const text = `Halo admin, saya ingin pesan *${namaPaket}*.\n\nMohon info detail paket, konfirmasi bahwa garansi aktif penuh sampai masa paket berakhir, dan cara pembayarannya ya.`;
    const url = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
}

/**
 * Kontak langsung dari tombol "Chat via WhatsApp"
 */
document.addEventListener("DOMContentLoaded", function () {
    const waBtn = document.getElementById("waDirectButton");
    if (waBtn) {
        const text = "Halo admin, saya ingin konsultasi dulu mengenai paket streaming bergaransi penuh (1 hari s/d 12 bulan).";
        const url = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`;
        waBtn.setAttribute("href", url);
    }
});

/**
 * Kirim form singkat (nama + paket) ke WhatsApp
 */
function kirimForm() {
    const nama = document.getElementById("nama").value.trim();
    const paket = document.getElementById("paket").value;

    let text = "Halo admin, saya tertarik dengan layanan streaming bergaransi penuh yang ada di website.\n\n";

    if (nama) {
        text += `Nama: *${nama}*\n`;
    }
    if (paket) {
        text += `Paket yang diminati: *${paket}*\n`;
    } else {
        text += "Paket yang diminati: (belum memilih, mohon dibantu rekomendasi)\n";
    }

    text += "\nMohon info detail paket, konfirmasi garansi penuh sampai masa paket berakhir, harga terbaru, dan cara pembayarannya ya.";

    const url = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
}

/**
 * FAQ toggle (buka/tutup jawaban)
 */
function toggleFAQ(button) {
    const answer = button.nextElementSibling;
    const icon = button.querySelector(".faq-icon");

    if (!answer) return;

    const isOpen = answer.style.display === "block";

    // Tutup semua FAQ lain
    document.querySelectorAll(".faq-answer").forEach((el) => {
        el.style.display = "none";
    });
    document.querySelectorAll(".faq-icon").forEach((i) => {
        i.textContent = "+";
    });

    // Buka/tutup yang diklik
    if (!isOpen) {
        answer.style.display = "block";
        if (icon) icon.textContent = "−";
    } else {
        answer.style.display = "none";
        if (icon) icon.textContent = "+";
    }
}
/* =======================
   SCROLL REVEAL ANIMATION
   ======================= */
document.addEventListener("DOMContentLoaded", () => {
    const reveals = document.querySelectorAll(".reveal");

    function revealOnScroll() {
        const windowHeight = window.innerHeight;

        reveals.forEach((el) => {
            const elementTop = el.getBoundingClientRect().top;

            if (elementTop < windowHeight - 100) {
                el.classList.add("show");
            }
        });
    }

    revealOnScroll();
    window.addEventListener("scroll", revealOnScroll);
});

function staggerReveal(selector, delay = 120) {
    const items = document.querySelectorAll(selector);
    let d = 0;
    items.forEach((item) => {
        item.style.transitionDelay = d + "ms";
        d += delay;
    });
}
document.addEventListener("DOMContentLoaded", () => {
    staggerReveal(".paket-card");
    staggerReveal(".testi-card");
});

window.addEventListener("scroll", () => {
    const hero = document.querySelector(".hero");
    if (hero) {
        hero.style.backgroundPositionY = window.scrollY * 0.3 + "px";
    }
});

function counterUp(el, max, speed = 10) {
    let num = 0;
    const update = () => {
        num++;
        el.textContent = num;
        if (num < max) setTimeout(update, speed);
    };
    update();
}

document.addEventListener("DOMContentLoaded", () => {
    const counters = document.querySelectorAll("[data-counter]");
    counters.forEach((c) => {
        const max = parseInt(c.getAttribute("data-counter"));
        counterUp(c, max, 20);
    });
});

/* ========== SCROLL REVEAL KANAN/KIRI ========== */
/* ========== ADVANCED SCROLL REVEAL (Up & Down) ========== */
document.addEventListener("DOMContentLoaded", () => {
    const elements = document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale");

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("show");
                } else {
                    // Jika ingin animasi muncul setiap masuk layar, hapus class show saat keluar
                    entry.target.classList.remove("show");
                }
            });
        },
        { threshold: 0.2 } // elemen dianggap tampil saat 20% sudah terlihat
    );

    elements.forEach((el) => observer.observe(el));
});

/* ===== MOBILE NAVBAR ===== */
function toggleMenu() {
    const nav = document.querySelector(".nav-links");
    const btn = document.querySelector(".nav-toggle");

    nav.classList.toggle("open");
    btn.classList.toggle("active");

}
