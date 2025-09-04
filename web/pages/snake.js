import React from 'react';

export default function SnakePage() {
  const src = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/snake';
  return (
    <div style={{height:'100vh',width:'100vw',margin:0,padding:0,display:'flex',flexDirection:'column'}}>
      <div style={{padding:12,background:'#071021',color:'#fff'}}>
        <h1 style={{margin:0,fontSize:18}}>Snake Money</h1>
      </div>
      <iframe src={src} title="Snake Money" style={{flex:1,border:'none',width:'100%'}} />
    </div>
  );
}
