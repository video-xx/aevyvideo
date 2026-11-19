/* Browser client for Aevy video sources.
   - Eporner's public JSON catalog is requested directly from its CORS-enabled API.
   - The Cloudflare Worker URL is used for secure Stream upload URLs.
   - If no catalog is selected, videos published by users on this site are shown
     (there is no demo content).
   Provider credentials never live here; they stay in the Worker. */
(function(){
  'use strict';
  var cfg=window.AEVY_CONFIG||{};
  var base=String(cfg.videoApiBase||'').replace(/\/+$/,'');
  var EPO='https://www.eporner.com/api/v2/';
  var epornerCategories=[];

  function epRequest(path,params){var u=new URL(path,EPO);Object.keys(params||{}).forEach(function(k){if(params[k]!=null&&params[k]!=='')u.searchParams.set(k,params[k])});return fetch(u.href,{headers:{Accept:'application/json'},credentials:'omit'}).then(function(r){if(!r.ok)throw new Error('Eporner API HTTP '+r.status);return r.json()})}
  function epCategoryName(slug){var c=epornerCategories.filter(function(x){return x.slug===slug})[0];return c?c.name:String(slug||'').replace(/-/g,' ')}
  function epMap(v){var id=String(v.id||'');if(!id)return null;var t=v.default_thumb||((v.thumbs||[])[0])||{},em=v.embed||'',m=String(em).match(/src=["']([^"']+)/i),embed=/^https?:/i.test(em)?em:(m?m[1]:'https://www.eporner.com/embed/'+encodeURIComponent(id)+'/'),keywords=String(v.keywords||'').split(',').map(function(x){return x.trim()}).filter(Boolean),d=v.added,date=d?( /^\d{10}$/.test(String(d))?new Date(Number(d)*1000):new Date(d)):null;return {id:'eporner:'+id,external_id:id,provider:'Eporner',title:v.title||'Untitled video',description:keywords.join(', '),thumbnail_url:t.src||'',playback_url:embed,source_url:v.url||'',channel_title:v.user&&v.user.name||'Eporner',category_slugs:keywords.slice(0,5).map(slug),duration_seconds:Number(v.length_sec)||null,view_count:Number(v.views)||0,published_at:date&&!isNaN(date)?date.toISOString():null,categories:keywords.slice(0,5)}}
  function epList(o){o=o||{};var page=Math.max(1,Number(o.page)||1),limit=Math.min(48,Math.max(1,Number(o.limit)||24)),remoteLimit=Math.max(1,Math.ceil(limit/2)),memberLimit=Math.max(0,limit-remoteLimit),cat=o.category?epCategoryName(o.category):'',query=[String(o.q||'').trim(),cat].filter(Boolean).join(' ')||'all';return epRequest('video/search/',{query:query,page:page,per_page:remoteLimit,thumbsize:'big',format:'json',lq:'0',order:o.sort==='popular'?'most-popular':'latest'}).then(function(j){var rows=Array.isArray(j.videos)?j.videos:[],items=rows.map(epMap).filter(Boolean),pages=Number(j.total_pages)||0,remoteMore=pages?page<pages:items.length>=remoteLimit,member=(memberLimit&&!cat)?localList({q:o.q,page:page,limit:memberLimit,sort:o.sort}):{items:[],hasMore:false};return {items:items.concat(member.items),page:page,pageSize:limit,hasMore:remoteMore||member.hasMore,configured:true,source:'eporner+members'}}).catch(function(err){var member=localList(o);if(member.items.length)return member;throw err})}
  function epCategories(){return epRequest('categories/',{format:'json'}).then(function(j){var rows=Array.isArray(j.categories)?j.categories:[];epornerCategories=rows.map(function(c){return {name:String(c.name||c.title||''),slug:String(c.slug||slug(c.name||c.title||''))}}).filter(function(c){return !!c.name});return {items:epornerCategories,configured:true,source:'eporner'}})}

  /* ---------- videos published by users on this site ---------- */
  function parse(u){
    u=String(u||'').trim();if(!u)return null;
    var url;try{url=new URL(/^https?:\/\//i.test(u)?u:'https://'+u)}catch(e){return null}
    var h=url.hostname.replace(/^(www|m)\./,''),id=null,m;
    if(h==='youtu.be')id=url.pathname.slice(1).split('/')[0];
    else if(/^(music\.)?youtube(-nocookie)?\.com$/.test(h)){
      if(url.pathname==='/watch')id=url.searchParams.get('v');
      else if((m=url.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{6,})/)))id=m[2];
    }
    if(id&&/^[\w-]{6,}$/.test(id))return {thumb:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',embed:'https://www.youtube-nocookie.com/embed/'+id+'?rel=0&modestbranding=1&playsinline=1',watch:'https://www.youtube.com/watch?v='+id,provider:'YouTube'};
    if(h==='vimeo.com'||h==='player.vimeo.com'){m=url.pathname.match(/(\d{5,})/);if(m)return {thumb:'',embed:'https://player.vimeo.com/video/'+m[1],watch:'https://vimeo.com/'+m[1],provider:'Vimeo'}}
    if(h==='iframe.videodelivery.net'||h==='videodelivery.net'||/\.cloudflarestream\.com$/.test(h)){m=url.pathname.match(/^\/([\w-]{20,})(?:\/iframe)?\/?$/);if(m){var sid=m[1];return {thumb:'https://videodelivery.net/'+sid+'/thumbnails/thumbnail.jpg',embed:'https://iframe.videodelivery.net/'+sid,watch:'https://iframe.videodelivery.net/'+sid,provider:'Cloudflare Stream'}}}
    if(/\.(mp4|webm|ogv|m4v)$/i.test(url.pathname))return {thumb:'',embed:url.href,watch:url.href,provider:'MP4'};
    return null;
  }
  function published(){
    var C=window.AevyCore,out=[];
    try{(C&&C.vis?C.vis():[]).forEach(function(s){
      var v=parse(s.video);if(!v)return;
      out.push({id:'post-'+s.id,title:s.title||'Untitled video',description:s.desc||'',channel_title:s.author||'Aevy creator',provider:v.provider,
        thumbnail_url:v.thumb,playback_url:v.embed,source_url:v.watch,view_count:s.views||0,
        owner:s.owner,published_at:s.created||s.updated||null,categories:[s.cat&&s.cat!=='Other'?s.cat:'Community']});
    })}catch(e){}
    return out;
  }
  function catalog(){return published()}

  function slug(c){return String(c).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  function localList(o){
    o=o||{};
    var q=String(o.q||'').toLowerCase().trim(),cat=String(o.category||'').toLowerCase(),
        page=Math.max(1,parseInt(o.page,10)||1),limit=Math.min(48,Math.max(1,parseInt(o.limit,10)||24)),
        owners=o.owners||null;
    var items=catalog().filter(function(v){
      if(owners&&!owners[v.owner])return false;
      if(cat&&v.categories.map(function(c){return c.toLowerCase()}).indexOf(cat)<0&&v.categories.map(slug).indexOf(cat)<0)return false;
      if(q&&(v.title+' '+v.description+' '+v.channel_title).toLowerCase().indexOf(q)<0)return false;
      return true;
    });
    if(o.sort==='popular')items.sort(function(a,b){return (b.view_count||0)-(a.view_count||0)});
    else items.sort(function(a,b){return Date.parse(b.published_at||0)-Date.parse(a.published_at||0)});
    var start=(page-1)*limit;
    return {configured:false,local:true,items:items.slice(start,start+limit),hasMore:start+limit<items.length};
  }
  function localCategories(){
    var seen={},items=[];
    catalog().forEach(function(v){v.categories.forEach(function(c){if(!seen[c]){seen[c]=1;items.push({name:c,slug:slug(c)})}})});
    return {configured:false,local:true,items:items};
  }

  /* ---------- remote API (Cloudflare Worker) with local fallback ---------- */
  function get(path){
    return fetch(base+'/api/'+path,{headers:{Accept:'application/json'},credentials:'omit'})
      .then(function(r){return r.json().catch(function(){return {}}).then(function(x){if(!r.ok)throw new Error(x.error||('Video API HTTP '+r.status));return x})});
  }
  function createStreamUpload(file,accessToken){
    return fetch((base||'')+'/api/stream/direct-upload',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:'Bearer '+accessToken},credentials:'omit',body:JSON.stringify({name:file.name,size:file.size,type:file.type})})
      .then(function(r){return r.json().catch(function(){return {}}).then(function(x){if(!r.ok)throw new Error(x.error||('Upload setup HTTP '+r.status));return x})});
  }
  function uploadStreamFile(file,url,onProgress){
    return new Promise(function(resolve,reject){var xhr=new XMLHttpRequest(),form=new FormData();form.append('file',file,file.name);xhr.open('POST',url);xhr.upload.onprogress=function(e){if(e.lengthComputable&&onProgress)onProgress(Math.round(e.loaded/e.total*100))};xhr.onload=function(){if(xhr.status>=200&&xhr.status<300){resolve(xhr.responseText);return}reject(new Error('Stream upload failed (HTTP '+xhr.status+')'))};xhr.onerror=function(){reject(new Error('Network error during video upload'))};xhr.onabort=function(){reject(new Error('Video upload cancelled'))};xhr.send(form)});
  }
  function withFallback(path,local){
    if(!base)return Promise.resolve(local());
    return get(path).then(function(r){
      if(r&&r.configured===false)return local();   /* Worker deployed but provider not mapped yet */
      return r;
    },function(){return local()});
  }

  window.AevyVideoAPI={
    /* o: {q, category (slug), page, limit, sort, owners (map of creator ids: Subscriptions tab)} */
    list:function(o){
      o=o||{};
      if(o.owners)return Promise.resolve(localList(o));   /* Subscriptions = videos from creators you follow on this site */
      if(cfg.videoCatalogProvider==='eporner')return epList(o);
      var p=new URLSearchParams();
      Object.keys(o).forEach(function(k){if(k!=='owners'&&o[k]!==''&&o[k]!=null)p.set(k,o[k])});
      return withFallback('videos?'+p.toString(),function(){return localList(o)});
    },
    categories:function(){return cfg.videoCatalogProvider==='eporner'?epCategories():withFallback('categories',localCategories)},
    configured:function(){return !!base||!!cfg.videoCatalogProvider},
    health:function(){return base?get('health').catch(function(){return {ok:false,local:true}}):Promise.resolve({ok:true,local:true})},
    createStreamUpload:createStreamUpload,
    uploadStreamFile:uploadStreamFile
  };
})();
