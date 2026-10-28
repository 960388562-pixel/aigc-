(function(){
  "use strict";

  const entry = document.getElementById("entry");
  const link = document.getElementById("enterPortfolio");
  const loader = document.getElementById("loader");
  const bar = document.getElementById("loaderBar");
  const num = document.getElementById("loaderNum");
  let leaving = false;

  // Ambient visual field
  const fieldCanvas = document.getElementById("coverField");
  if(fieldCanvas && window.AmbientField){
    try{
      window.coverField = new window.AmbientField(fieldCanvas, { intensity: 1, speed: 0.85, dprCap: 1.6 });
    }catch(e){}
  }

  // Short boot sequence, skipped on repeat visits in the same session.
  const seen = (() => {
    try{ return sessionStorage.getItem("zjx-cover-seen") === "1"; }catch(e){ return false; }
  })();

  if(seen || !loader){
    if(loader) loader.remove();
  }else{
    const started = performance.now();
    const duration = 720;
    function tick(now){
      const p = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = Math.round(eased * 100);
      if(bar) bar.style.width = value + "%";
      if(num) num.textContent = String(value).padStart(3, "0");
      if(p < 1){
        requestAnimationFrame(tick);
      }else{
        try{ sessionStorage.setItem("zjx-cover-seen", "1"); }catch(e){}
        setTimeout(() => {
          loader.classList.add("is-done");
          setTimeout(() => loader.remove(), 900);
        }, 140);
      }
    }
    requestAnimationFrame(tick);
  }

  function go(){
    if(leaving || !link) return;
    leaving = true;
    entry.classList.add("is-leaving");
    document.body.classList.add("is-leaving");
    const target = link.getAttribute("href");
    window.setTimeout(() => { window.location.href = target; }, 700);
  }

  if(link){
    link.addEventListener("click", (event) => {
      event.preventDefault();
      go();
    });
  }

  document.addEventListener("click", (event) => {
    if(leaving) return;
    if(event.target.closest("a, button")) return;
    go();
  });

  document.addEventListener("keydown", (event) => {
    if(event.key === "Enter" || event.key === " "){
      if(event.target.closest("a, button")) return;
      event.preventDefault();
      go();
    }
  });

  // Reset the leaving animation when returning through bfcache.
  window.addEventListener("pageshow", (event) => {
    if(event.persisted){
      leaving = false;
      entry.classList.remove("is-leaving");
      document.body.classList.remove("is-leaving");
    }
  });

  // Gentle letter drift on the name.
  const chars = entry ? Array.from(entry.querySelectorAll(".entry-name .char")) : [];
  if(chars.length && window.matchMedia("(pointer:fine)").matches){
    window.addEventListener("pointermove", (event) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (event.clientX - cx) / cx;
      const dy = (event.clientY - cy) / cy;
      chars.forEach((char, i) => {
        const depth = (i + 1) * 2.2;
        char.style.transform = `translate3d(${dx * depth}px, ${dy * depth * .6}px, 0)`;
      });
    }, { passive:true });
  }
})();
