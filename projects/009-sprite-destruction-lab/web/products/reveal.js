// This installer is self-contained so the downloaded HTML works offline.
export function installReveal(){
  if(customElements.get('forma-reveal'))return;
  class FormaReveal extends HTMLElement{
    static get observedAttributes(){return ['title','description','cover-label','effect','color'];}
    constructor(){super();this.attachShadow({mode:'open'});this.open=false;this.reveals=0;}
    connectedCallback(){this.render();}
    attributeChangedCallback(){if(this.isConnected)this.render();}
    render(){
      const color=/^#[\da-f]{6}$/i.test(this.getAttribute('color')||'')?this.getAttribute('color'):'#305c48';
      const effect=['ripple','paper','neon'].includes(this.getAttribute('effect'))?this.getAttribute('effect'):'ripple';
      this.shadowRoot.innerHTML=`<style>:host{display:block;max-width:410px;font-family:system-ui,sans-serif}.card{position:relative;overflow:hidden;border:1px solid #dae3d5;border-radius:12px;background:#fff;padding:34px;text-align:center;color:#294833;min-height:180px;box-sizing:border-box}small{font-size:9px;letter-spacing:2px;color:#668264}h3{font-size:25px;font-weight:500;margin:12px 0}p{font-size:12px;color:#73806c;line-height:1.7}button{cursor:pointer;font:11px system-ui;border:1px solid #dce5d4;background:#f3f7ef;color:#365441;padding:8px 15px;border-radius:6px}button:focus-visible{outline:3px solid #a9c296;outline-offset:4px}.cover{position:absolute;inset:0;background:${color};color:white;border:0;border-radius:0;display:grid;place-content:center;width:100%;transition:clip-path .8s,transform .8s,opacity .8s,filter .8s;clip-path:circle(150% at var(--x,50%) var(--y,50%));font-size:15px}.cover span{display:block;font-size:10px;opacity:.6;margin-top:12px}.open .cover{pointer-events:none;opacity:0}.ripple.open .cover{clip-path:circle(0% at var(--x,50%) var(--y,50%))}.paper.open .cover{transform:translateY(-110%) rotate(-12deg)}.neon.open .cover{filter:blur(22px);transform:scale(.75)}@media(prefers-reduced-motion:reduce){.cover{transition:none}}</style><div class="card ${effect} ${this.open?'open':''}"><div class="content"><small>INTERACTIVE REVEAL</small><h3></h3><p></p><button class="reset" type="button">重新体验</button></div><button class="cover" type="button"><b></b><span>点击或按 Enter 揭晓</span></button></div>`;
      const root=this.shadowRoot;root.querySelector('h3').textContent=this.getAttribute('title')||'新内容，已就绪';root.querySelector('p').textContent=this.getAttribute('description')||'让一次轻互动，连接下一步行动。';root.querySelector('.cover b').textContent=this.getAttribute('cover-label')||'打开这一刻';
      root.querySelector('.content').inert=!this.open;
      root.querySelector('.cover').tabIndex=this.open?-1:0;
      root.querySelector('.cover').addEventListener('click',e=>this.reveal(e));root.querySelector('.reset').addEventListener('click',()=>this.reset());
    }
    reveal(event){
      if(this.open)return;this.open=true;this.reveals++;
      const card=this.shadowRoot.querySelector('.card'),r=card.getBoundingClientRect();
      if(event?.detail){card.style.setProperty('--x',`${event.clientX-r.left}px`);card.style.setProperty('--y',`${event.clientY-r.top}px`);}
      card.classList.add('open');this.shadowRoot.querySelector('.content').inert=false;this.shadowRoot.querySelector('.cover').tabIndex=-1;
      this.shadowRoot.querySelector('.reset').focus({preventScroll:true});
      this.dispatchEvent(new CustomEvent('forma:reveal',{bubbles:true,composed:true,detail:{effect:this.getAttribute('effect')||'ripple',count:this.reveals,at:new Date().toISOString()}}));
    }
    reset(){this.open=false;this.render();this.shadowRoot.querySelector('.cover').focus({preventScroll:true});this.dispatchEvent(new CustomEvent('forma:reset',{bubbles:true,composed:true}));}
  }
  customElements.define('forma-reveal',FormaReveal);
}
installReveal();
