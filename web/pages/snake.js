import React from 'react';
import '../styles/snake.css';

export default function SnakePage() {
  const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const snakeUrl = serverUrl + '/snake';
  return (
    <div className="snake-page">
      <div style={{padding:20}}>
        <h2>Snake Money</h2>
        <p>If the embedded game does not load, open it directly in a new tab:</p>
        <a href={snakeUrl} target="_blank" rel="noreferrer">Open game (Express) - {snakeUrl}</a>
        <p style={{marginTop:12}}>Embedded preview (iframe):</p>
        <div style={{width:780,height:560,border:'1px solid rgba(255,255,255,0.06)'}}>
          <iframe src={snakeUrl} title="Snake Money" style={{width:'100%',height:'100%',border:0}} />
        </div>
      </div>
    </div>
  );
}
