export const Storage = {
  prefix: 'bcc:',
  get(key, fallback=null){
    try{
      const raw = localStorage.getItem(this.prefix+key);
      return raw==null ? fallback : JSON.parse(raw);
    }catch{ return fallback; }
  },
  set(key, value){
    localStorage.setItem(this.prefix+key, JSON.stringify(value));
  },
  del(key){ localStorage.removeItem(this.prefix+key); },
  listKeys(){
    const out=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k && k.startsWith(this.prefix)) out.push(k.slice(this.prefix.length));
    }
    return out.sort();
  }
};
