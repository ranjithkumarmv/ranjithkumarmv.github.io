(function () {
  "use strict";
  var root = document.documentElement;

  // footer year
  document.getElementById("year").textContent = new Date().getFullYear();

  // theme toggle — saved choice wins, otherwise follow the OS
  var themeBtn = document.getElementById("theme-btn");
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  function isDark() { return root.dataset.theme ? root.dataset.theme === "dark" : media.matches; }
  function syncThemeIcon() {
    themeBtn.innerHTML = '<i class="fa ' + (isDark() ? "fa-sun-o" : "fa-moon-o") + '" aria-hidden="true"></i>';
    themeBtn.setAttribute("aria-label", isDark() ? "Switch to light mode" : "Switch to dark mode");
  }
  themeBtn.addEventListener("click", function () {
    root.dataset.theme = isDark() ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
    syncThemeIcon();
  });
  media.addEventListener("change", syncThemeIcon);
  syncThemeIcon();

  // mobile menu
  var menuBtn = document.getElementById("menu-btn");
  var links = document.getElementById("nav-links");
  function setMenu(open) {
    links.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", open);
    menuBtn.innerHTML = '<i class="fa ' + (open ? "fa-times" : "fa-bars") + '" aria-hidden="true"></i>';
  }
  menuBtn.addEventListener("click", function () { setMenu(!links.classList.contains("open")); });
  links.addEventListener("click", function (e) { if (e.target.tagName === "A") setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  // nav border, reading progress and career timeline fill — all driven by scroll
  var nav = document.querySelector(".nav");
  var progress = document.getElementById("progress");
  var roles = document.getElementById("roles");
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // timeline track runs from the first role's dot to the last one's
  function measureRoles() {
    if (!roles) return;
    var dots = roles.querySelectorAll(".role");
    var first = dots[0].offsetTop + 36, last = dots[dots.length - 1].offsetTop + 36;
    roles.style.setProperty("--top", first + "px");
    roles.style.setProperty("--len", (last - first) + "px");
  }

  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
    nav.classList.toggle("scrolled", y > 8);
    if (progress) progress.style.setProperty("--p", max > 0 ? y / max : 0);
    if (roles) {
      var r = roles.getBoundingClientRect(), mid = window.innerHeight * .6;
      var fill = still ? 1 : Math.min(1, Math.max(0, (mid - r.top) / r.height));
      roles.style.setProperty("--fill", fill);
    }
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener("resize", function () { measureRoles(); onScroll(); });
  window.addEventListener("load", function () { measureRoles(); onScroll(); });
  measureRoles();
  onScroll();

  // pointer-following spotlight on cards
  document.querySelectorAll(".glow").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  // stagger reveals that sit side by side in a grid
  document.querySelectorAll(".bento, .beyond-grid").forEach(function (grid) {
    Array.prototype.forEach.call(grid.children, function (el, i) { el.style.setProperty("--d", (i % 3) * .08 + "s"); });
  });

  // count the hero stats up from zero
  function countUp(dd) {
    var target = +dd.dataset.count, text = dd.firstChild, start = null;
    if (still || !text) return;
    function step(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / 1200);
      text.nodeValue = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    }
    text.nodeValue = "0";
    requestAnimationFrame(step);
  }
  document.querySelectorAll(".stats dd[data-count]").forEach(countUp);

  if ("IntersectionObserver" in window) {
    var navLinks = links.querySelectorAll("a");
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle("active", a.hash === "#" + entry.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { spy.observe(s); });

    // reveal on scroll
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("in"); reveal.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".reveal").forEach(function (el) { reveal.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  // QR dialog (homepage only)
  var qr = document.getElementById("qr");
  var qrOpen = document.getElementById("qr-open");
  if (qr && qrOpen) {
    qrOpen.addEventListener("click", function () {
      if (qr.showModal) qr.showModal(); else qr.setAttribute("open", "");
    });
    qr.addEventListener("click", function (e) { if (e.target === qr) qr.close(); });
  }

  // contact form → postmail.invotes.com (homepage only)
  var form = document.getElementById("contact-form");
  if (!form) return;
  var sendBtn = document.getElementById("f-send");
  var status = document.getElementById("f-status");
  var sendLabel = sendBtn.innerHTML;
  function setStatus(text, kind) { status.textContent = text; status.className = "form-status" + (kind ? " " + kind : ""); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var fields = form.querySelectorAll("input, textarea");
    for (var k = 0; k < fields.length; k++) {
      fields[k].value = fields[k].value.trim();
      if (!fields[k].checkValidity()) {
        fields[k].focus();
        setStatus(fields[k].type === "email" && fields[k].value ? "Please enter a valid email." : "All fields are required.", "err");
        return;
      }
    }
    var data = {
      access_token: "myeyraj8i8ls57trcsmsdszh",
      subject: "Message from ranjithkumarmv.com",
      extra_name: form["Your Name"].value,
      extra_email: form["Your Email"].value,
      extra_phone_number: form["Phone Number"].value,
      text: form["Message"].value
    };
    var body = Object.keys(data).map(function (key) {
      return encodeURIComponent(key) + "=" + encodeURIComponent(data[key]);
    }).join("&");

    sendBtn.disabled = true;
    sendBtn.textContent = "Sending…";
    setStatus("");
    fetch("https://postmail.invotes.com/send", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body
    }).then(function (res) {
      if (!res.ok) throw new Error(res.status);
      form.reset();
      setStatus("Thanks! Your message is on its way.", "ok");
    }).catch(function () {
      setStatus("Couldn't send — please email me directly.", "err");
    }).then(function () {
      sendBtn.disabled = false;
      sendBtn.innerHTML = sendLabel;
    });
  });
})();
