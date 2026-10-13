
(function(){
 const search=document.getElementById('manuscript-search'),count=document.getElementById('search-count');
 if(search){search.hidden=false;search.addEventListener('input',()=>{const q=search.value.trim().toLocaleLowerCase();let n=0;document.querySelectorAll('.manuscript-block').forEach(b=>{const match=!q||b.textContent.toLocaleLowerCase().includes(q);b.hidden=!match;if(match)n++});count.textContent=q?'找到 '+n+' 段':'';});}
 const dialog=document.getElementById('image-dialog');
 if(dialog&&typeof dialog.showModal==='function'){
 document.querySelectorAll('[data-enlarge]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();dialog.querySelector('img').src=link.href;dialog.querySelector('img').alt=link.querySelector('img').alt;dialog.querySelector('.image-caption').textContent=link.querySelector('img').alt;dialog.showModal();}));
 dialog.querySelector('button').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 }
})();

(function(){
 'use strict';
 const dialog=document.getElementById('slideshow-dialog');
 const blocks=Array.from(document.querySelectorAll('.manuscript-block'));
 if(!dialog||typeof dialog.showModal!=='function'||!blocks.length)return;
 const find=selector=>dialog.querySelector(selector);
 const previous=find('[data-slideshow-prev]'),next=find('[data-slideshow-next]');
 const page=find('#slideshow-page'),image=find('.slideshow-image');
 const original=find('.slideshow-original'),reading=find('.slideshow-reading');
 let index=0,trigger=null,saved=null,returnToBlock=false;
 page.max=String(blocks.length);
 const text=(node)=>node?node.textContent.trim():'';
 function cleanClone(source){
   const copy=source.cloneNode(true);
   [copy,...copy.querySelectorAll('*')].forEach(node=>{
     ['id','autofocus','accesskey','tabindex','aria-labelledby','aria-describedby','aria-controls','for','data-enlarge','data-slideshow-start'].forEach(attr=>node.removeAttribute(attr));
   });
   return copy;
 }
 function render(){
   const block=blocks[index],topic=block.closest('article.topic');
   find('.slideshow-topic').textContent=text(topic&&topic.querySelector('.topic-heading h2'));
   find('.slideshow-title').textContent=text(block.querySelector('.block-heading h3'))||'未命名页面';
   find('.slideshow-type').textContent=text(block.querySelector('.block-heading .eyebrow'));
   const metadata=find('.slideshow-metadata'),sourceMeta=block.querySelector('.block-heading .metadata');
   metadata.replaceChildren();
   if(sourceMeta)metadata.append(cleanClone(sourceMeta));
   const sourceImage=block.querySelector('figure.frame img'),sourceLink=block.querySelector('a.image-link');
   image.hidden=!sourceImage;
   find('.slideshow-no-image').hidden=!!sourceImage;
   original.hidden=!sourceImage;
   if(sourceImage){
     image.src=sourceLink?sourceLink.href:sourceImage.src;
     image.alt=sourceImage.alt;
     original.href=sourceLink?sourceLink.href:sourceImage.src;
   }else{
     image.removeAttribute('src');image.alt='';original.removeAttribute('href');
   }
   const holder=find('.slideshow-transcript'),transcript=block.querySelector('.transcript');
   holder.replaceChildren();
   if(transcript&&text(transcript))holder.append(cleanClone(transcript));
   if(!transcript||!Array.from(transcript.querySelectorAll('.words')).some(words=>text(words))){
     const empty=document.createElement('p');empty.className='slideshow-empty';
     empty.textContent='此页没有对应讲稿。';holder.append(empty);
   }
   reading.scrollTop=0;
   find('.slideshow-position').textContent='第 '+(index+1)+' / '+blocks.length+' 页';
   page.value=String(index+1);
   const focused=document.activeElement;
   previous.disabled=index===0;next.disabled=index===blocks.length-1;
   if(focused===previous&&previous.disabled)(next.disabled?find('[data-slideshow-close]'):next).focus();
   if(focused===next&&next.disabled)(previous.disabled?find('[data-slideshow-close]'):previous).focus();
 }
 function go(position){
   if(position<0||position>=blocks.length||position===index)return;
   index=position;render();
 }
 function close(toBlock){returnToBlock=!!toBlock;dialog.close();}
 document.querySelectorAll('[data-slideshow-start]').forEach(button=>{
   button.hidden=false;
   button.addEventListener('click',()=>{
     if(dialog.open)return;
     const target=button.getAttribute('data-slideshow-start');
     const position=target?blocks.findIndex(block=>block.id===target):0;
     if(position<0)return;
     const enlarged=document.getElementById('image-dialog');
     if(enlarged&&enlarged.open)enlarged.close();
     trigger=button;index=position;returnToBlock=false;render();
     saved={x:window.scrollX,y:window.scrollY,body:document.body.getAttribute('style'),html:document.documentElement.getAttribute('style')};
     document.body.style.position='fixed';document.body.style.top=-saved.y+'px';
     document.body.style.left=-saved.x+'px';document.body.style.width='100%';document.body.style.overflow='hidden';
     document.documentElement.style.overflow='hidden';
     dialog.showModal();
     find('[data-slideshow-close]').focus({preventScroll:true});
   });
 });
 previous.addEventListener('click',()=>go(index-1));next.addEventListener('click',()=>go(index+1));
 find('[data-slideshow-close]').addEventListener('click',()=>close(false));
 find('[data-slideshow-return]').addEventListener('click',()=>close(true));
 find('.slideshow-jump').addEventListener('submit',event=>{
   event.preventDefault();const number=Number(page.value);
   if(Number.isInteger(number)&&number>=1&&number<=blocks.length)go(number-1);
 });
 dialog.addEventListener('cancel',event=>{event.preventDefault();close(false);});
 dialog.addEventListener('close',()=>{
   if(!saved)return;
   const restore=(node,style)=>style===null?node.removeAttribute('style'):node.setAttribute('style',style);
   const before=saved;saved=null;
   restore(document.body,before.body);restore(document.documentElement,before.html);
   document.documentElement.style.scrollBehavior='auto';
   window.scrollTo({left:before.x,top:before.y,behavior:'instant'});
   if(trigger&&trigger.isConnected)trigger.focus({preventScroll:true});
   if(returnToBlock){
     const block=blocks[index];
     if(block.hidden){
       const search=document.getElementById('manuscript-search');
       if(search){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));}
       block.hidden=false;
     }
     block.scrollIntoView({behavior:'instant',block:'start'});
   }
   restore(document.documentElement,before.html);
   returnToBlock=false;
   image.removeAttribute('src');find('.slideshow-transcript').replaceChildren();
 });
 document.addEventListener('keydown',event=>{
   if(!dialog.open||event.altKey||event.ctrlKey||event.metaKey)return;
   const target=event.target;
   if(target instanceof Element&&(target.closest('input,select,textarea')||target.isContentEditable))return;
   if(event.key===' '&&target instanceof Element&&target.closest('button,a[href]'))return;
   let destination=null;
   if(event.key==='ArrowLeft'||event.key==='PageUp')destination=index-1;
   else if(event.key==='ArrowRight'||event.key==='PageDown'||event.key===' ')destination=index+(event.shiftKey?-1:1);
   else if(event.key==='Home')destination=0;
   else if(event.key==='End')destination=blocks.length-1;
   else if(event.key==='Escape'){event.preventDefault();close(false);return;}
   if(destination!==null){event.preventDefault();go(destination);}
 });
})();
