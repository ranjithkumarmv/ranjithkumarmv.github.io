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

  // nav border on scroll + active section link
  var nav = document.querySelector(".nav");
  window.addEventListener("scroll", function () { nav.classList.toggle("scrolled", window.scrollY > 8); }, { passive: true });

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

  // QR dialog
  var qr = document.getElementById("qr");
  document.getElementById("qr-open").addEventListener("click", function () {
    if (qr.showModal) qr.showModal(); else qr.setAttribute("open", "");
  });
  qr.addEventListener("click", function (e) { if (e.target === qr) qr.close(); });

  // contact form → postmail.invotes.com
  var form = document.getElementById("contact-form");
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
