// This clock advances only GPX progress. Events can hold the clock, but can
// never define the route, the journey bounds, or the interpolation points.
export function createPlayback({duration,stopDuration=3,events=[]}){
  const groups=[];
  for(const event of events.filter(e=>Number.isFinite(e.progress)).sort((a,b)=>a.progress-b.progress)){
    const last=groups.at(-1);
    if(last&&Math.abs(last.progress-event.progress)<1e-8)last.items.push(event);
    else groups.push({progress:event.progress,items:[event]});
  }
  let progress=0,next=0,remaining=0,group=null;
  return {
    get progress(){return progress;},
    get stopGroup(){return group;},
    get remaining(){return remaining;},
    get ended(){return progress>=1&&!group&&(!groups[next]||stopDuration===0);},
    seek(value){
      progress=Math.max(0,Math.min(1,value));remaining=0;group=null;
      next=groups.findIndex(g=>g.progress>=progress-1e-8);
      if(next<0)next=groups.length;
    },
    advance(seconds,speed=1){
      if(group){
        remaining=Math.max(0,remaining-seconds);
        if(remaining===0)group=null;
        // Never consume a long frame's remainder: each stop must actually
        // be visible, including after a background tab becomes active again.
        return;
      }
      const target=Math.min(1,progress+seconds/duration*speed);
      if(stopDuration>0&&groups[next]&&groups[next].progress<=target+1e-8){
        group=groups[next++];progress=group.progress;remaining=stopDuration;
      }else{progress=target;}
    }
  };
}
