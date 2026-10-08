// blog article enhancements — runs before site.js so the reveal observer picks up classes added here
(function () {
  "use strict";
  var prose = document.querySelector(".prose");
  if (!prose) return;

  // reading time from the article body
  var readTime = document.getElementById("read-time");
  if (readTime) readTime.textContent = Math.max(1, Math.round(prose.innerText.trim().split(/\s+/).length / 230)) + " min read";

  // section ids, hover anchors and the "On this page" list
  var toc = document.getElementById("toc");
  var tocList = document.getElementById("toc-list");
  var headings = [];
  prose.querySelectorAll("h2").forEach(function (h) {
    if (h.closest(".tldr")) return;
    var text = h.textContent;
    if (!h.id) h.id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    var anchor = document.createElement("a");
    anchor.className = "anchor";
    anchor.href = "#" + h.id;
    anchor.setAttribute("aria-label", "Link to “" + text + "”");
    anchor.textContent = "#";
    h.appendChild(anchor);
    if (tocList) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = text;
      li.appendChild(a);
      tocList.appendChild(li);
    }
    headings.push(h);
  });

  // code blocks: title bar with language label and a copy button
  prose.querySelectorAll("pre").forEach(function (pre) {
    var box = document.createElement("div");
    box.className = "code";
    var bar = document.createElement("div");
    bar.className = "code-bar";
    bar.innerHTML = '<span class="code-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="code-lang"></span>';
    bar.querySelector(".code-lang").textContent = pre.dataset.lang || "Code";
    var copy = document.createElement("button");
    copy.type = "button";
    copy.className = "code-copy";
    copy.innerHTML = '<i class="fa fa-clone" aria-hidden="true"></i> Copy';
    copy.addEventListener("click", function () {
      var done = function () {
        copy.innerHTML = '<i class="fa fa-check" aria-hidden="true"></i> Copied';
        setTimeout(function () { copy.innerHTML = '<i class="fa fa-clone" aria-hidden="true"></i> Copy'; }, 1600);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(pre.innerText).then(done, function () {});
    });
    bar.appendChild(copy);
    pre.parentNode.insertBefore(box, pre);
    box.appendChild(bar);
    box.appendChild(pre);
  });

  // gentle reveal for figures and set pieces as they scroll in
  prose.querySelectorAll(":scope > figure, :scope > .phases, :scope > .code, :scope > .callout").forEach(function (el) {
    el.classList.add("reveal");
  });

  // contents: show once the header is passed, highlight the section being read
  if (!toc || !headings.length || !("IntersectionObserver" in window)) return;
  var head = document.querySelector(".article-head");
  var links = tocList.querySelectorAll("a");
  new IntersectionObserver(function (entries) {
    toc.classList.toggle("show", !entries[0].isIntersecting);
  }).observe(head);

  var current = null;
  function update() {
    var line = window.innerHeight * 0.3, active = headings[0];
    headings.forEach(function (h) { if (h.getBoundingClientRect().top < line) active = h; });
    if (active === current) return;
    current = active;
    links.forEach(function (a) { a.classList.toggle("active", a.hash === "#" + active.id); });
  }
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); }
  }, { passive: true });
  update();
})();
