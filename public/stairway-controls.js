/* Supplemental controls. The original Game and existing keyboard/multiplayer UI remain intact. */
(() => {
  if(document.getElementById('stairway-upgrade-fire'))return;
  const btn=document.createElement('button');
  btn.id='stairway-upgrade-fire';
  btn.type='button';
  btn.setAttribute('aria-label','ירי פגז מהטנק');
  btn.textContent='🔥 ירי פגז (J)';
  Object.assign(btn.style,{
    position:'fixed',bottom:'144px',right:'20px',zIndex:'9996',
    background:'linear-gradient(140deg,#8a3d26,#bd6841)',color:'#fff4e6',
    border:'2px solid rgba(255,211,143,.85)',borderRadius:'14px',padding:'13px 17px',
    font:'700 16px sans-serif',boxShadow:'0 6px 24px rgba(0,0,0,.55)',
    cursor:'pointer',touchAction:'none',userSelect:'none',display:'none'
  });
  let held=false;
  function send(kind){window.dispatchEvent(new KeyboardEvent(kind,{key:'j',code:'KeyJ',bubbles:true,cancelable:true}));}
  btn.addEventListener('pointerdown',(event)=>{
    event.preventDefault();event.stopPropagation();
    if(!held){held=true;send('keydown');}
    btn.setPointerCapture?.(event.pointerId);
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture','pointerleave']){
    btn.addEventListener(event,()=>{if(held){held=false;send('keyup');}});
  }
  document.body.appendChild(btn);
  const timer=window.setInterval(()=>{
    const active=!!window.__stairwayTankActive;
    if(btn.style.display!==(active?'block':'none'))btn.style.display=active?'block':'none';
    if(!active&&held){held=false;send('keyup');}
  },160);
  window.addEventListener('pagehide',()=>{window.clearInterval(timer);if(held)send('keyup');},{once:true});
})();
