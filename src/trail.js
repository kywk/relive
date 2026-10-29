// Cache immutable GPX coordinates. Each chunk overlaps its predecessor by one
// point, preserving every edge without drawing across segment gaps.
export function createTrailChunks(track,encode,chunkSize=256){
  const chunks=[];
  let chunk;
  track.points.forEach((point,index)=>{
    if(!chunk||chunk.segment!==point.segment){
      chunk={start:index,segment:point.segment,path:[]};chunks.push(chunk);
    }else if(chunk.path.length===chunkSize){
      chunk={start:index-1,segment:point.segment,path:[chunk.path.at(-1)]};chunks.push(chunk);
    }
    chunk.path.push(encode(point));
  });
  let previous=-1,lastIndex=-1,lastLat,lastLon;
  return {chunks,update({position,index}){
    if(index===lastIndex&&position.lat===lastLat&&position.lon===lastLon)return [];
    let low=0,high=chunks.length;
    while(low<high){const mid=(low+high)>>>1;if(chunks[mid].start<=index)low=mid+1;else high=mid;}
    const active=Math.max(0,low-1),changes=[];
    // Completed chunks are submitted once. Rewinding clears only affected ones.
    for(let i=Math.max(0,Math.min(previous,active));i<=Math.max(previous,active);i++){
      const part=chunks[i];
      const path=i<active?part.path:i>active?[]:part.path.slice(0,index-part.start+1).concat([encode(position)]);
      changes.push({index:i,path});
    }
    previous=active;lastIndex=index;lastLat=position.lat;lastLon=position.lon;
    return changes;
  }};
}
