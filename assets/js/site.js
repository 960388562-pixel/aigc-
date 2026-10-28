(function(){
  "use strict";

  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- page enter veil ---------------- */
  body.classList.add("is-entering");
  const revealPage = () => {
    requestAnimationFrame(() => {
      body.classList.add("is-ready");
      window.setTimeout(() => body.classList.remove("is-entering", "is-ready"), 900);
    });
  };
  if(document.readyState === "complete"){
    revealPage();
  }else{
    window.addEventListener("load", revealPage, { once:true });
    window.setTimeout(revealPage, 1400);
  }

  /* ---------------- ambient hero field ---------------- */
  const heroFieldCanvas = document.getElementById("heroField");
  if(heroFieldCanvas && window.AmbientField){
    try{
      window.heroField = new window.AmbientField(heroFieldCanvas, {
        intensity: 0.42,
        speed: 0.72,
        dprCap: 1.35
      });
    }catch(e){}
  }

  /* ---------------- header + progress ---------------- */
  const header = document.getElementById("siteHeader");
  const progress = document.getElementById("scrollProgress");
  let ticking = false;

  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY || window.pageYOffset;
      if(header) header.classList.toggle("is-scrolled", y > 24);
      if(progress){
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = docH > 0 ? Math.min(1, Math.max(0, y / docH)) : 0;
        progress.style.transform = `scaleX(${ratio})`;
      }
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive:true });
  onScroll();

  /* ---------------- active nav ---------------- */
  const sections = Array.from(document.querySelectorAll("section[id]"));
  const navLinks = Array.from(document.querySelectorAll("[data-nav]"));
  if("IntersectionObserver" in window && sections.length){
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if(!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("data-nav") === id));
      });
    }, { rootMargin: "-44% 0px -50% 0px", threshold: 0 });
    sections.forEach((s) => navObserver.observe(s));
  }

  /* ---------------- reveal ---------------- */
  const revealItems = Array.from(document.querySelectorAll(".reveal, .reveal-img"));
  if(!reduceMotion && "IntersectionObserver" in window){
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if(entry.isIntersecting){
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealItems.forEach((el) => revealObserver.observe(el));
  }else{
    revealItems.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------------- local time ---------------- */
  const timeEl = document.getElementById("localTime");
  function updateTime(){
    if(!timeEl) return;
    try{
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Shanghai",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
      timeEl.textContent = fmt.format(new Date()) + " UTC+8";
    }catch(e){
      const d = new Date();
      timeEl.textContent = String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
    }
  }
  updateTime();
  window.setInterval(updateTime, 30000);

  /* ---------------- mobile menu ---------------- */
  const menuToggle = document.getElementById("menuToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  let menuOpen = false;

  function setMenu(open){
    if(!menuToggle || !mobileMenu) return;
    menuOpen = open;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
    mobileMenu.classList.toggle("is-open", open);
    mobileMenu.setAttribute("aria-hidden", String(!open));
    body.classList.toggle("is-locked", open);
    body.classList.toggle("menu-open", open);
  }
  if(menuToggle){
    menuToggle.addEventListener("click", () => setMenu(!menuOpen));
  }
  if(mobileMenu){
    mobileMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  }

  /* ---------------- project modal ---------------- */
  const projects = {
    lion: {
      index: “Project 01”,
      title: “醒狮 · 非遗新生”,
      sub: “Awakening Lion / AI Short Film / 2026”,
      cover: “”,
      video: “assets/video/lion-film.mp4”,
      alt: “《醒狮·非遗新生》项目视频”,
      desc: “以岭南醒狮为线索，用生成式影像重建传统非遗的当代质感。项目从脚本与分镜开始，建立统一的国风视觉体系；在生成阶段持续修正 AI 素材的结构与动态瑕疵，最终完成剪辑、调色与声音合成。比起复刻传统，更想找到它今天被观看的方式。”,
      highlight: “从 0 到 1 独立完成全流程，沉淀了一套国风非遗题材的 AIGC 创作方法。”,
      role: “独立完成 / 策划、分镜、AIGC 视觉生成、剪辑、调色”,
      deliverables: [“Concept”, “Storyboard”, “AIGC Visual”, “Edit & Grade”],
      year: “2026.06”
    },
    tame: {
      index: “Project 02”,
      title: “试图驯服 AI”,
      sub: “Tame AI / Commercial Short / 2026”,
      cover: “”,
      video: “assets/video/tame-film.mp4”,
      alt: “《试图驯服 AI》项目视频”,
      desc: “为商业短视频构建统一的电影感视觉。使用多款主流 AIGC 模型生成影视级画面与动态镜头，以提示词工程控制光影、色调与风格；通过后期解决镜头卡顿、人物形变与画面连贯性问题，在控制成本的同时精准落地客户诉求。”,
      highlight: “方案被甲方采纳。把”想要的感觉”翻译成了可执行、可交付的画面。”,
      role: “独立负责 / 视觉生成、动态镜头、剪辑、调色、声音与包装”,
      deliverables: [“Key Visual”, “Image to Video”, “Motion”, “Post”],
      year: “2026.07”
    },
    light: {
      index: "Study 03",
      title: "光的样本",
      sub: "Studies of Light / Personal / Ongoing",
      cover: "assets/img/cover-light.jpg",
      alt: "《光的样本》视觉研究封面",
      desc: "一组关于光、材质与生成痕迹的视觉练习。尝试把模型的不确定性当作素材，而不是需要被消除的错误。在控制与失控之间，观察一束光如何改变空间，以及生成图像如何形成自己的语言。",
      highlight: "持续更新中。每一项研究都指向同一个问题：画面为什么会让人停下来。",
      role: "个人项目 / 视觉研究、生成实验、后期",
      deliverables: ["Light Study", "Texture", "Generative Image"],
      year: "2026 — Ongoing"
    },
    "creative-ad": {
      index: "Project 04",
      title: "AI 创意广告",
      sub: "Creative AI Ad / AIGC Short / 2026",
      cover: "",
      video: "assets/video/ai-creative-ad.mp4",
      alt: "AI 创意广告短片",
      desc: "一支纯 AI 生成的创意短片广告。从概念脚本到镜头生成，用提示词构建超现实视觉场景，在短时间内完成叙事与情绪传达。整个过程涵盖了从文案到分镜、从静态生成到动态镜头的完整 AIGC 工作流。",
      highlight: "从 0 到 1 独立完成全流程，验证了 AI 生成工具在广告短片中的完整交付能力。",
      role: "独立完成 / 策划、AIGC 视觉生成、剪辑、调色",
      deliverables: ["Concept", "AIGC Visual", "Image to Video", "Edit"],
      year: "2026.08"
    },
    "visual-reel": {
      index: "Project 05",
      title: "AI 视觉影像集",
      sub: "Visual Reel / AIGC Showcase / 2026",
      cover: "",
      video: "assets/video/ai-visual-reel.mp4",
      alt: "AI 视觉影像集锦",
      desc: "一组 AI 生成视觉片段的集合展示。涵盖不同风格、光影与材质的影像探索，呈现生成式工具在视觉表达上的可能性边界。每一段都是一次独立的视觉实验，拼合在一起形成一条关于光、色彩与氛围的影像线索。",
      highlight: "持续更新的视觉素材库，也是对不同模型与提示词方向的横向测试。",
      role: "独立完成 / 视觉实验、生成、剪辑与配乐",
      deliverables: ["Visual Reel", "AIGC", "Color Grade", "Motion"],
      year: "2026.08"
    },
    "beer-ad": {
      index: "Project 06",
      title: "啤酒品牌 AI 广告",
      sub: "Beer Brand Commercial / 2026",
      cover: "",
      video: "assets/video/beer-ad.mp4",
      alt: "啤酒品牌 AI 广告短片",
      desc: "为啤酒品牌打造的 AI 生成广告片。围绕产品气质构建夏日场景与饮品质感，用生成式画面呈现清凉、松弛的品牌氛围。从产品视觉到情绪场景，用 AI 工具快速验证不同方向，最终选定与品牌调性最契合的视觉方案。",
      highlight: "用 AI 生成快速完成了原本需要实拍的品牌场景，在短周期内交付可用的广告成片。",
      role: "独立完成 / 创意策划、AIGC 视觉、后期包装",
      deliverables: ["Storyboard", "AIGC Visual", "Commercial", "Post"],
      year: "2026.08"
    },
    "gongyecui": {
      index: "Project 07",
      title: "贡野萃 · 产品宣传短片",
      sub: "Gongyecui Product Film / 2026",
      cover: "",
      video: "assets/video/gongyecui-product.mp4",
      alt: "贡野萃产品宣传短片",
      desc: "为「贡野萃」品牌打造的产品宣传短片。围绕产品天然、草本的品牌调性，用 AIGC 视觉构建自然场景与产品质感，传递品牌主张。从脚本到成片独立完成，精准匹配品牌调性与传播需求。",
      highlight: "完整交付品牌产品宣传短片，画面质感与品牌调性高度统一。",
      role: "独立完成 / 创意策划、AIGC 视觉、剪辑、后期",
      deliverables: ["Storyboard", "AIGC Visual", "Product Film", "Post"],
      year: "2026.08"
    },
    "kawai": {
      index: "Project 08",
      title: "咖位 · 产品宣传短片",
      sub: "Kawai Product Film / 2026",
      cover: "",
      video: "assets/video/kawai-product.mp4",
      alt: "咖位产品宣传短片",
      desc: "为「咖位」品牌打造的产品宣传短片。以咖啡产品为核心，用生成式影像构建日常与品质感兼具的视觉场景，让品牌调性在短时间内被感知。兼顾产品展示与情绪氛围，适合社交媒体传播。",
      highlight: "用 AI 生成完成了咖啡产品的场景化视觉，缩短了传统拍摄周期。",
      role: "独立完成 / 创意策划、AIGC 视觉、剪辑、后期",
      deliverables: ["Storyboard", "AIGC Visual", "Product Film", "Post"],
      year: "2026.08"
    }
  };
  const projectOrder = ["lion", "tame", "light", "creative-ad", "visual-reel", "beer-ad", "gongyecui", "kawai"];
  const modal = document.getElementById("projectModal");
  const modalPanel = modal ? modal.querySelector(".modal__panel") : null;
  const modalClose = modal ? modal.querySelector(".modal__close") : null;
  const modalImg = document.getElementById("modalImg");
  const modalIndex = document.getElementById("modalIndex");
  const modalTitle = document.getElementById("modalTitle");
  const modalSub = document.getElementById("modalSub");
  const modalDesc = document.getElementById("modalDesc");
  const modalHighlight = document.getElementById("modalHighlight");
  const modalRole = document.getElementById("modalRole");
  const modalDeliverables = document.getElementById("modalDeliverables");
  const modalYear = document.getElementById("modalYear");
  const modalPrev = document.getElementById("modalPrev");
  const modalNext = document.getElementById("modalNext");
  const modalVideo = document.getElementById("modalVideo");
  let currentProject = "lion";
  let lastFocus = null;

  function fillModal(id){
    const data = projects[id];
    if(!data) return;
    currentProject = id;
    const hasVideo = Boolean(data.video);
    if(modalImg){
      modalImg.style.display = hasVideo ? "none" : "";
      if(!hasVideo){ modalImg.src = data.cover; modalImg.alt = data.alt; }
    }
    if(modalVideo){
      if(hasVideo){
        modalVideo.style.display = "";
        modalVideo.src = data.video;
        modalVideo.load();
      }else{
        modalVideo.style.display = "none";
        modalVideo.pause();
        modalVideo.removeAttribute("src");
        modalVideo.load();
      }
    }
    if(modalIndex) modalIndex.textContent = data.index;
    if(modalTitle) modalTitle.firstChild.nodeValue = data.title;
    if(modalSub) modalSub.textContent = data.sub;
    if(modalDesc) modalDesc.textContent = data.desc;
    if(modalHighlight) modalHighlight.textContent = data.highlight;
    if(modalRole) modalRole.textContent = data.role;
    if(modalYear) modalYear.textContent = data.year;
    if(modalDeliverables){
      modalDeliverables.innerHTML = "";
      data.deliverables.forEach((item) => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = item;
        modalDeliverables.appendChild(span);
      });
    }
  }
  function openModal(id){
    if(!modal) return;
    lastFocus = document.activeElement;
    fillModal(id);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    body.classList.add("is-locked");
    if(modalPanel) modalPanel.scrollTop = 0;
    window.setTimeout(() => { if(modalClose) modalClose.focus(); }, 120);
  }
  function closeModal(){
    if(!modal || !modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    body.classList.remove("is-locked");
    if(modalVideo){ modalVideo.pause(); }
    if(lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }
  document.querySelectorAll("[data-open]").forEach((el) => {
    el.addEventListener("click", () => openModal(el.getAttribute("data-open")));
    /* hover to preview video */
    const vid = el.querySelector(".project__video");
    if(vid){
      el.addEventListener("mouseenter", () => { vid.play().catch(()=>{}); });
      el.addEventListener("mouseleave", () => { vid.pause(); vid.currentTime = 0; });
    }
  });
  if(modal){
    modal.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModal));
    if(modalPrev) modalPrev.addEventListener("click", () => {
      const i = projectOrder.indexOf(currentProject);
      openModal(projectOrder[(i - 1 + projectOrder.length) % projectOrder.length]);
    });
    if(modalNext) modalNext.addEventListener("click", () => {
      const i = projectOrder.indexOf(currentProject);
      openModal(projectOrder[(i + 1) % projectOrder.length]);
    });
  }

  /* ---------------- keyboard ---------------- */
  document.addEventListener("keydown", (event) => {
    if(event.key === "Escape"){
      if(modal && modal.classList.contains("is-open")){
        closeModal();
      }else if(menuOpen){
        setMenu(false);
      }
    }
    if(event.key === "Tab" && modal && modal.classList.contains("is-open") && modalPanel){
      const focusables = Array.from(modalPanel.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])"))
        .filter((el) => el.offsetParent !== null);
      if(!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if(event.shiftKey && document.activeElement === first){
        event.preventDefault();
        last.focus();
      }else if(!event.shiftKey && document.activeElement === last){
        event.preventDefault();
        first.focus();
      }
    }
  });

  /* ---------------- copy to clipboard ---------------- */
  const toast = document.getElementById("toast");
  let toastTimer = null;
  function showToast(text){
    if(!toast) return;
    toast.textContent = text;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
  }
  function fallbackCopy(text){
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try{ ok = document.execCommand("copy"); }catch(e){}
    document.body.removeChild(ta);
    showToast(ok ? "已复制到剪贴板" : "复制失败，请手动选择");
  }
  document.querySelectorAll("[data-copy]").forEach((el) => {
    const handler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const text = el.getAttribute("data-copy");
      if(navigator.clipboard && window.isSecureContext){
        navigator.clipboard.writeText(text).then(() => showToast("已复制到剪贴板")).catch(() => fallbackCopy(text));
      }else{
        fallbackCopy(text);
      }
    };
    el.addEventListener("click", handler);
    el.addEventListener("keydown", (event) => {
      if(event.key === "Enter" || event.key === " "){
        handler(event);
      }
    });
  });

  /* ---------------- portrait parallax ---------------- */
  const portrait = document.getElementById("portrait");
  if(portrait && !reduceMotion && window.matchMedia("(pointer:fine)").matches){
    const hero = document.querySelector(".hero");
    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      portrait.style.setProperty("--px", (x * 10).toFixed(2) + "px");
      portrait.style.setProperty("--py", (y * 8).toFixed(2) + "px");
    }, { passive:true });
    hero.addEventListener("pointerleave", () => {
      portrait.style.setProperty("--px", "0px");
      portrait.style.setProperty("--py", "0px");
    });
  }

  /* ---------------- custom cursor ---------------- */
  if(window.matchMedia("(pointer:fine)").matches && !reduceMotion){
    const dot = document.createElement("div");
    const ring = document.createElement("div");
    dot.className = "cursor";
    ring.className = "cursor-ring";
    dot.setAttribute("aria-hidden", "true");
    ring.setAttribute("aria-hidden", "true");
    body.appendChild(dot);
    body.appendChild(ring);

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;
    let cursorStarted = false;
    body.classList.add("has-cursor");

    window.addEventListener("pointermove", (event) => {
      mx = event.clientX;
      my = event.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%,-50%)`;
      if(!cursorStarted){
        cursorStarted = true;
        rx = mx; ry = my;
        body.classList.add("cursor-ready");
      }
      const interactive = event.target.closest("a, button, [data-copy], [data-open]");
      body.classList.toggle("cursor-hover", Boolean(interactive));
    }, { passive:true });

    function loopCursor(){
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%,-50%)`;
      requestAnimationFrame(loopCursor);
    }
    requestAnimationFrame(loopCursor);
    document.addEventListener("mouseleave", () => body.classList.remove("cursor-ready"));
    document.addEventListener("mouseenter", () => { if(cursorStarted) body.classList.add("cursor-ready"); });
  }

  /* ---------------- return to cover ---------------- */
  const coverLink = document.querySelector("[data-cover]");
  if(coverLink){
    coverLink.addEventListener("click", (event) => {
      event.preventDefault();
      body.classList.add("is-leaving");
      window.setTimeout(() => { window.location.href = coverLink.getAttribute("href"); }, 520);
    });
  }

  window.addEventListener("pageshow", (event) => {
    if(event.persisted){
      body.classList.remove("is-leaving", "is-entering", "is-ready", "is-locked");
      if(modal) modal.classList.remove("is-open");
      setMenu(false);
    }
  });
})();
