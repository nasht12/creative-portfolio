const projects = await fetch("projects.json?v=trimmed-threejs-1").then(r=>{if(!r.ok)throw new Error("Project data unavailable");return r.json()});
const $=id=>document.getElementById(id);$('workCount').textContent=String(projects.length).padStart(2,'0');let selected=0,live=false,liveFrame=0,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
projects.forEach((p,i)=>{const b=document.createElement('button');b.className='project-label';b.setAttribute('aria-label',`Open ${p.title}, ${p.tech}`);b.innerHTML=`<span>${String(i+1).padStart(2,'0')} // ${p.slug}</span>`;b.style.backgroundImage='none';b.onclick=()=>openProject(i);$('labels').append(b);p.button=b;const row=document.createElement('button');row.className='index-row';row.innerHTML=`<img src="${p.image}" alt=""><div><strong>${String(i+1).padStart(2,'0')} / ${p.title}</strong><small>${p.tech}</small></div><b>↗</b>`;row.onclick=()=>{$('index').hidden=true;openProject(i)};$('projectList').append(row)});
function stopLive(){const v=$('projectArt').querySelector('video');if(v){v.pause();v.removeAttribute('src');v.load()}live=false;}
function openProject(i){selected=i;stopLive();freezeGallery();const p=projects[i];const media=p.video?document.createElement('video'):document.createElement('img');if(p.video){media.controls=true;media.autoplay=true;media.muted=true;media.defaultMuted=true;media.loop=true;media.playsInline=true;media.preload='metadata';media.poster=p.image;media.src=p.video;media.setAttribute('aria-label',p.title+' recorded preview')}else{media.src=p.image;media.alt=p.title} $('projectArt').replaceChildren(media);$('projectTitle').textContent=p.title;$('projectMeta').textContent=String(i+1).padStart(2,'0')+' / '+p.tech;$('projectDescription').textContent=p.description;$('projectFormat').textContent=p.format;$('projectStatus').textContent=(p.url||p.scene||p.links?.length)?'Published project':p.video?'Recorded output':'Selected work';$('projectNote').textContent=p.note||(p.scene?(p.controls||''):p.video?'TouchDesigner recording · muted autoplay · use the video controls to pause or unmute.':'');let related=$('projectLinks');if(!related){related=document.createElement('div');related.id='projectLinks';$('launch').before(related)}related.replaceChildren();related.hidden=!p.links?.length;for(const item of p.links||[]){const link=document.createElement('a');link.className='portal-link';link.href=item.url;link.target='_blank';link.rel='noopener';const shot=document.createElement('img');shot.src=item.image;shot.alt=item.title+' interface preview';shot.loading='lazy';const text=document.createElement('div');const title=document.createElement('strong');title.textContent=item.title+' ↗';const description=document.createElement('span');description.textContent=item.description;text.append(title,description);link.append(shot,text);related.append(link)}const destination=p.url||p.scene;$('launch').hidden=!destination;$('launch').href=destination||'#';$('launch').innerHTML=(p.scene?'Open scene in new tab':p.id==='twelve-seconds'?'Open visualization in new tab':'Visit project')+' <span>↗</span>';if(!$('project').open)$('project').showModal();if(p.video)media.play().catch(()=>{ /* Native controls remain available if autoplay is blocked. */ });history.replaceState(null,'','#project-'+(i+1));}
$('closeProject').onclick=()=>$('project').close();$('project').addEventListener('close',()=>{stopLive();history.replaceState(null,'',location.pathname)});
$('indexButton').onclick=()=>{$('index').hidden=!$('index').hidden};$('closeIndex').onclick=()=>{$('index').hidden=true};document.addEventListener('keydown',e=>{if(e.key==='Escape')$('index').hidden=true});for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});
let wake=()=>{},freezeGallery=()=>{};
const categoryDescriptions={'Three.js':'Interactive scenes & real-time graphics','TouchDesigner':'Generative visuals & motion studies','Web3 UI':'Blockchain interfaces & product design','Websites':'Web design & development','Map-based applications':'Geospatial interfaces & data exploration','UI design':'Product interfaces & interaction design','Campaigns':'Campaign design & digital experiences'};
let activeCategoryIndex=-1;
function updateCategory(index){
 if(index===activeCategoryIndex)return;activeCategoryIndex=index;
 const p=projects[index],name=p.category||p.tech||'Selected work';
 const group=projects.filter(item=>(item.category||item.tech||'Selected work')===name);
 $('categoryName').textContent=name;
 $('categoryDescription').textContent=p.categoryDescription||categoryDescriptions[name]||'Selected design & development work';
 $('categoryCount').textContent=String(group.indexOf(p)+1).padStart(2,'0')+' / '+String(group.length).padStart(2,'0');wake();
}
updateCategory(0);
async function init(){try{
const T=await import('three');
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0xd7d3c8,0);$('stage').append(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.1,80),root=new T.Group();scene.add(root);
const step=.88,rise=1.15,radius=3.5,cardWidth=2.55,cardHeight=1.7;
const loader=new T.TextureLoader();
projects.forEach((p,i)=>{
 const texture=loader.load(p.image,loaded=>{
  const image=loaded.image,imageAspect=image.width/image.height,cardAspect=cardWidth/cardHeight;
  if(p.id==='washington-mapping'){
   // Preserve the complete square map while giving its frame the same landscape shape.
   const canvas=document.createElement('canvas');canvas.width=960;canvas.height=640;const ctx=canvas.getContext('2d');ctx.fillStyle='#031329';ctx.fillRect(0,0,960,640);ctx.drawImage(image,160,0,640,640);loaded.image=canvas;loaded.needsUpdate=true;
  }else if(imageAspect>cardAspect){loaded.repeat.x=cardAspect/imageAspect;loaded.offset.x=(1-loaded.repeat.x)/2;}
  else{loaded.repeat.y=imageAspect/cardAspect;loaded.offset.y=(1-loaded.repeat.y)/2;}
  wake();
 });texture.colorSpace=T.SRGBColorSpace;
 const material=new T.MeshBasicMaterial({map:texture,transparent:true,side:T.DoubleSide});
 const mesh=new T.Mesh(new T.PlaneGeometry(cardWidth,cardHeight),material);
 mesh.position.set(Math.sin(i*step)*radius,i*rise,Math.cos(i*step)*radius);root.add(mesh);p.mesh=mesh;
});
let width=innerWidth,height=innerHeight,progress=0,current=0,frame=0,lastScroll=0;
const wrap=(value,length)=>((value%length)+length)%length;
const point=new T.Vector3(),inverse=new T.Quaternion();freezeGallery=()=>{progress=current;};
function render(){
 frame=0;current=reduced?progress:current+(progress-current)*.075;
 const focus=current,compact=width<=1000,centerY=.35;
 const intro=document.querySelector('.intro'),introAlpha=1;
 intro.style.opacity=introAlpha;intro.style.transform='none';
 const headerRect=document.querySelector('header').getBoundingClientRect();
 const footerRect=document.querySelector('footer').getBoundingClientRect();
 const introRect=intro.getBoundingClientRect(),categoryRect=document.querySelector('.collection-category').getBoundingClientRect();
 const left=compact?16:Math.max(24,introRect.right+30);
 const right=compact?width-16:categoryRect.left-28;
 // Reserve actual measured text regions instead of projecting cards across the whole browser.
 const top=compact?Math.max(headerRect.bottom+16,introAlpha>.02?introRect.bottom+20:0):headerRect.bottom+16;
 const bottom=compact?Math.min(categoryRect.top-20,footerRect.top-24):footerRect.top-26;
 const view={left,top,width:Math.max(80,right-left),height:Math.max(70,bottom-top)};
 camera.aspect=view.width/view.height;camera.updateProjectionMatrix();
 const sceneRadius=compact?2.65:radius;
 const distance=Math.max(sceneRadius+7,sceneRadius+(sceneRadius+cardWidth*.6)/(Math.tan(T.MathUtils.degToRad(20))*camera.aspect));
 root.rotation.y=0;root.position.x=0;
 camera.position.set(0,centerY,distance);camera.lookAt(0,centerY,0);camera.updateMatrixWorld();root.updateMatrixWorld(true);
 $('labels').style.clipPath='inset('+view.top+'px '+Math.max(0,width-view.left-view.width)+'px '+Math.max(0,height-view.top-view.height)+'px '+view.left+'px)';
 inverse.copy(root.quaternion).invert();
 let closest=0,best=Infinity;
 projects.forEach((p,i)=>{
  // Recycle each card only when it is far from the visible camera window.
  const logicalIndex=i+Math.round((focus-i)/projects.length)*projects.length;
  const relativeIndex=logicalIndex-focus;
  p.mesh.position.set(Math.sin(relativeIndex*step)*sceneRadius,relativeIndex*rise,Math.cos(relativeIndex*step)*sceneRadius);
  p.mesh.updateMatrixWorld();
  p.mesh.quaternion.copy(inverse).multiply(camera.quaternion);
  const world=p.mesh.getWorldPosition(new T.Vector3()),depth=camera.position.z-world.z;
  point.copy(world).project(camera);
  const x=view.left+(point.x*.5+.5)*view.width,y=view.top+(-point.y*.5+.5)*view.height;
  const scale=view.height/(2*Math.tan(T.MathUtils.degToRad(20))*depth),pxWidth=cardWidth*scale,pxHeight=cardHeight*scale;
  const score=Math.abs(relativeIndex),front=world.z>-.5,visible=y+pxHeight*.5>view.top&&y-pxHeight*.5<view.top+view.height;
  const edgeFade=Math.max(0,Math.min(1,(y-view.top)/Math.min(65,view.height*.2),(view.top+view.height-y)/Math.min(65,view.height*.2)));const cycleFade=Math.max(0,Math.min(1,(5.2-score)/.75));const opacity=(front?Math.max(.68,1-score*.06):.20)*edgeFade*cycleFade;
  p.mesh.visible=visible;p.mesh.material.opacity=opacity;
  p.button.style.cssText=`left:${x}px;top:${y}px;width:${pxWidth}px;height:${pxHeight}px;z-index:${Math.round((world.z+5)*100)};opacity:${opacity};visibility:${visible&&front?'visible':'hidden'};`;
  p.button.classList.toggle('is-focused',score<.6);
  if(score<best){best=score;closest=i}
 });
 $('activeLabel').textContent=`${String(closest+1).padStart(2,'0')} / ${projects[closest].slug}`;updateCategory(closest);
 $('progress').style.width=wrap(focus,projects.length)/projects.length*100+'%';
 renderer.setScissorTest(false);renderer.clear();
 renderer.setViewport(view.left,height-view.top-view.height,view.width,view.height);
 renderer.setScissor(view.left,height-view.top-view.height,view.width,view.height);renderer.setScissorTest(true);
 renderer.render(scene,camera);
 if(Math.abs(progress-current)>.0001&&!reduced)frame=requestAnimationFrame(render);
}
wake=()=>{if(!frame)frame=requestAnimationFrame(render)};
function resize(){width=innerWidth;height=innerHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();wake()}
function recenter(){const middle=Math.round((document.documentElement.scrollHeight-innerHeight)/2);lastScroll=middle;window.scrollTo({top:middle,behavior:'instant'})}
function scroll(){
 if($('project').open){lastScroll=scrollY;return;}
 const position=scrollY,delta=position-lastScroll;lastScroll=position;
 progress+=delta/Math.max(280,innerHeight*.5);
 const max=document.documentElement.scrollHeight-innerHeight;
 if(position<innerHeight||position>max-innerHeight)recenter();
 wake();
}
// Native scrolling preserves touch swipes and momentum. Re-centering the
// invisible scroll surface supplies room in both directions without a visual reset.
if('scrollRestoration' in history)history.scrollRestoration='manual';
addEventListener('resize',()=>{resize();recenter()});addEventListener('scroll',scroll,{passive:true});resize();recenter();wake();document.fonts.ready.then(()=>wake());
}catch(e){console.warn('3D gallery unavailable; using accessible project gallery.',e);document.body.classList.add('fallback');projects.forEach(p=>p.button.style.backgroundImage=`url(${p.image})`);$('activeLabel').textContent='PROJECT INDEX / '+String(projects.length).padStart(2,'0')}}
init();const hash=location.hash.match(/^#project-(\d+)$/);if(hash&&Number(hash[1])>=1&&Number(hash[1])<=projects.length)openProject(Number(hash[1])-1);
